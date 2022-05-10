// Copyright 2022 Singularity Data
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

use std::clone::Clone;
use std::sync::Arc;

use bytes::Bytes;
use risingwave_hummock_sdk::HummockSSTableId;

use crate::hummock::{
    Block, BlockCache, HummockError, HummockResult, LruCache, Sstable, SstableMeta,
};
use crate::object::BoxedObjectUploader;

pub type MetaCache = Arc<LruCache<HummockSSTableId, Box<Sstable>>>;

#[derive(Clone, Copy)]
pub enum WriteCachePolicy {
    /// Never write to the cache.
    Disable,
    /// Always write to the cache even the whole SST build may not succeed.
    FillAny,
    /// Write to the cache only if the whole SST build succeeds.
    FillOnSuccess,
}

pub struct SstableWriter {
    sst_id: HummockSSTableId,
    data_uploader: BoxedObjectUploader,
    meta_uploader: BoxedObjectUploader,
    cache_policy: WriteCachePolicy,
    block_cache: BlockCache,
    meta_cache: MetaCache,
    written_len: usize,
    block_count: u32,
}

impl SstableWriter {
    pub fn new(
        sst_id: HummockSSTableId,
        data_uploader: BoxedObjectUploader,
        meta_uploader: BoxedObjectUploader,
        cache_policy: WriteCachePolicy,
        block_cache: BlockCache,
        meta_cache: MetaCache,
    ) -> Self {
        Self {
            sst_id,
            data_uploader,
            meta_uploader,
            cache_policy,
            block_cache,
            meta_cache,
            written_len: 0,
            block_count: 0,
        }
    }

    pub fn written_len(&self) -> usize {
        self.written_len
    }

    pub fn get_sst_id(&self) -> &HummockSSTableId {
        &self.sst_id
    }

    pub async fn write_block(&mut self, data: Bytes) -> HummockResult<()> {
        self.data_uploader
            .upload(data.as_ref())
            .await
            .map_err(HummockError::object_io_error)?;
        self.written_len += data.len();
        let block_idx = self.block_count as u64;
        self.block_count += 1;
        if let WriteCachePolicy::FillAny = self.cache_policy {
            self.block_cache.insert(
                self.sst_id,
                block_idx,
                Box::new(
                    Block::decode(data).expect("the written block should be able to be decoded"),
                ),
            );
        }
        Ok(())
    }

    pub async fn finish(mut self, meta: &SstableMeta) -> HummockResult<()> {
        // Upload the remaining size footer.
        self.data_uploader
            .upload(self.block_count.to_le_bytes().as_ref())
            .await
            .map_err(HummockError::object_io_error)?;

        // Finish uploading the data and try to add to block cache.
        match self.cache_policy {
            WriteCachePolicy::FillOnSuccess => {
                let mut stream = self
                    .data_uploader
                    .finish_with_data()
                    .await
                    .map_err(HummockError::object_io_error)?;
                for (block_idx, block_meta) in meta.block_metas.iter().enumerate() {
                    // Try to add each block to block cache. Error will be ignored.
                    match stream.read(block_meta.len as usize).await {
                        Ok(block_data) => match Block::decode(Bytes::copy_from_slice(block_data)) {
                            Ok(block) => {
                                self.block_cache.insert(
                                    self.sst_id,
                                    block_idx as u64,
                                    Box::new(block),
                                );
                            }
                            Err(e) => {
                                tracing::error!("failed to decode block data to add to block cache: {:?}. ignored.", e);
                            }
                        },
                        Err(e) => {
                            tracing::error!(
                                "Failed to read block data to add to block cache: {:?}. ignored",
                                e
                            );
                        }
                    }
                }
            }
            _ => {
                self.data_uploader
                    .finish()
                    .await
                    .map_err(HummockError::object_io_error)?;
            }
        }

        // Upload the meta.
        let meta_bytes = meta.encode_to_bytes();
        self.meta_uploader
            .upload(meta_bytes.as_ref())
            .await
            .map_err(HummockError::object_io_error)?;
        self.meta_uploader
            .finish()
            .await
            .map_err(HummockError::object_io_error)?;

        match self.cache_policy {
            WriteCachePolicy::FillOnSuccess | WriteCachePolicy::FillAny => {
                self.meta_cache.insert(
                    self.sst_id,
                    self.sst_id,
                    meta_bytes.len(),
                    Box::new(Sstable {
                        id: self.sst_id,
                        meta: meta.clone(),
                    }),
                );
            }
            _ => {}
        }
        Ok(())
    }
}
