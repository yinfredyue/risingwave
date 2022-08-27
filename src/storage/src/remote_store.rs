#![allow(unused_variables)]

use std::ops::{Bound, RangeBounds};

use bytes::Bytes;
use futures::{Future, StreamExt};
use remote_state_store_proto::state_store_client::StateStoreClient;
use remote_state_store_proto::{
    BoundType, GetRequest, IngestBatchRequest, IterateRequest, KeyBound, KeyValue, Operation,
};
use tonic::transport::Channel;
use tonic::Streaming;

use crate::error::StorageResult;
use crate::hummock::local_version_manager::SyncResult;
use crate::store::*;
use crate::StateStore;

#[derive(Clone)]
pub struct RemoteStateStore {
    client: StateStoreClient<Channel>,
}

impl RemoteStateStore {
    pub async fn new() -> StorageResult<Self> {
        let client = StateStoreClient::connect("http://localhost:1919")
            .await
            .unwrap();

        Ok(Self { client })
    }
}

impl StateStore for RemoteStateStore {
    type Iter = Iter;

    define_state_store_associated_type!();

    fn get<'a>(
        &'a self,
        key: &'a [u8],
        check_bloom_filter: bool,
        read_options: crate::store::ReadOptions,
    ) -> Self::GetFuture<'_> {
        async move {
            let response = self
                .client
                .clone()
                .get(GetRequest {
                    key: key.to_vec(),
                    epoch: read_options.epoch,
                })
                .await
                .unwrap()
                .into_inner();

            let value = response.exists.then(|| response.value.into());

            Ok(value)
        }
    }

    fn scan<R, B>(
        &self,
        prefix_hint: Option<Vec<u8>>,
        key_range: R,
        limit: Option<usize>,
        read_options: crate::store::ReadOptions,
    ) -> Self::ScanFuture<'_, R, B>
    where
        R: std::ops::RangeBounds<B> + Send,
        B: AsRef<[u8]> + Send,
    {
        async move {
            self.iter(prefix_hint, key_range, read_options)
                .await?
                .collect(limit)
                .await
        }
    }

    fn backward_scan<R, B>(
        &self,
        key_range: R,
        limit: Option<usize>,
        read_options: crate::store::ReadOptions,
    ) -> Self::BackwardScanFuture<'_, R, B>
    where
        R: std::ops::RangeBounds<B> + Send,
        B: AsRef<[u8]> + Send,
    {
        async move { unimplemented!() }
    }

    fn ingest_batch(
        &self,
        kv_pairs: Vec<(bytes::Bytes, crate::storage_value::StorageValue)>,
        write_options: crate::store::WriteOptions,
    ) -> Self::IngestBatchFuture<'_> {
        async move {
            let (kvs, operations) = kv_pairs
                .into_iter()
                .map(|(k, v)| match v.user_value {
                    Some(v) => (
                        KeyValue {
                            key: k.into(),
                            value: v.into(),
                        },
                        Operation::Put as i32,
                    ),
                    None => (
                        KeyValue {
                            key: k.into(),
                            ..Default::default()
                        },
                        Operation::Delete as i32,
                    ),
                })
                .unzip();

            let response = self
                .client
                .clone()
                .ingest_batch(IngestBatchRequest {
                    kvs,
                    operations,
                    epoch: write_options.epoch,
                })
                .await
                .unwrap()
                .into_inner();

            let size = response.size as _;
            Ok(size)
        }
    }

    fn replicate_batch(
        &self,
        kv_pairs: Vec<(bytes::Bytes, crate::storage_value::StorageValue)>,
        write_options: crate::store::WriteOptions,
    ) -> Self::ReplicateBatchFuture<'_> {
        async move { Ok(()) }
    }

    fn iter<R, B>(
        &self,
        prefix_hint: Option<Vec<u8>>,
        key_range: R,
        read_options: crate::store::ReadOptions,
    ) -> Self::IterFuture<'_, R, B>
    where
        R: std::ops::RangeBounds<B> + Send,
        B: AsRef<[u8]> + Send,
    {
        let map_key_bound = |bound: Bound<&B>| match bound {
            Bound::Included(key) => KeyBound {
                key: key.as_ref().to_vec(),
                bound_type: BoundType::Included as _,
            },
            Bound::Excluded(key) => KeyBound {
                key: key.as_ref().to_vec(),
                bound_type: BoundType::Excluded as _,
            },
            Bound::Unbounded => KeyBound {
                bound_type: BoundType::Unbounded as _,
                ..Default::default()
            },
        };

        let request = IterateRequest {
            start: Some(map_key_bound(key_range.start_bound())),
            end: Some(map_key_bound(key_range.end_bound())),
            limit: u64::MAX,
            epoch: read_options.epoch,
        };

        async move {
            let streaming = self
                .client
                .clone()
                .iterate(request)
                .await
                .unwrap()
                .into_inner();

            Ok(Iter(streaming))
        }
    }

    fn backward_iter<R, B>(
        &self,
        key_range: R,
        read_options: crate::store::ReadOptions,
    ) -> Self::BackwardIterFuture<'_, R, B>
    where
        R: std::ops::RangeBounds<B> + Send,
        B: AsRef<[u8]> + Send,
    {
        async move { unimplemented!() }
    }

    fn wait_epoch(
        &self,
        epoch: risingwave_hummock_sdk::HummockReadEpoch,
    ) -> Self::WaitEpochFuture<'_> {
        async move { Ok(()) }
    }

    fn sync(&self, epoch: u64) -> Self::SyncFuture<'_> {
        async move {
            Ok(SyncResult {
                sync_succeed: true,
                ..Default::default()
            })
        }
    }

    fn clear_shared_buffer(&self) -> Self::ClearSharedBufferFuture<'_> {
        async move { Ok(()) }
    }
}

pub struct Iter(Streaming<KeyValue>);

impl StateStoreIter for Iter {
    type Item = (Bytes, Bytes);

    type NextFuture<'a> =
        impl Future<Output = crate::error::StorageResult<Option<Self::Item>>> + Send;

    fn next(&mut self) -> Self::NextFuture<'_> {
        async move {
            let kv = self.0.next().await.transpose().unwrap();
            Ok(kv.map(|kv| (kv.key.into(), kv.value.into())))
        }
    }
}

impl Iter {
    async fn collect(mut self, limit: Option<usize>) -> StorageResult<Vec<(Bytes, Bytes)>> {
        let mut kvs = Vec::with_capacity(limit.unwrap_or_default());

        for _ in 0..limit.unwrap_or(usize::MAX) {
            match self.next().await? {
                Some(kv) => kvs.push(kv),
                None => break,
            }
        }

        Ok(kvs)
    }
}
