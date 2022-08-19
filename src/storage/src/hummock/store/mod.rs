use std::collections::BTreeMap;
use std::ops::RangeBounds;
use std::sync::Arc;

use bytes::Bytes;
use futures::Future;
use risingwave_hummock_sdk::{HummockEpoch, LocalSstableInfo};
use risingwave_pb::hummock::{HummockVersion, HummockVersionDelta};

use super::sstable_store::SstableStoreRef;
use super::{HummockResult, HummockStateStoreIter};
use crate::StateStoreIter;
use crate::error::StorageResult;
use crate::monitor::StateStoreMetrics;

pub trait StateStore: Send + Sync + 'static + Clone {
    type Iter: StateStoreIter<Item = (Bytes, Bytes)>;

    type GetFuture<'a>: GetFutureTrait<'a>;

    type IterFuture<'a, R, B>: IterFutureTrait<'a, Self::Iter, R, B>
    where
        R: 'static + Send + RangeBounds<B>,
        B: 'static + Send + AsRef<[u8]>;

    type InsertFuture<'a>: EmptyFutureTrait<'a>;

    type DeleteFuture<'a>: EmptyFutureTrait<'a>;

    fn insert(&self, key: Bytes, val: Bytes, epoch: u64) -> Self::InsertFuture<'_>;

    fn delete(&self, key: Bytes, epoch: u64) -> Self::DeleteFuture<'_>;

    fn get(&self, key: &[u8], epoch: u64, read_options: ReadOptions) -> Self::GetFuture<'_>;

    fn iter<R, B>(
        &self,
        key_range: R,
        epoch: u64,
        read_options: ReadOptions,
    ) -> Self::IterFuture<'_, R, B>
    where
        R: RangeBounds<B> + Send,
        B: AsRef<[u8]> + Send;
}

pub trait GetFutureTrait<'a> = Future<Output = StorageResult<Option<Bytes>>> + Send;
pub trait IterFutureTrait<'a, I: StateStoreIter<Item = (Bytes, Bytes)>, R, B> =
    Future<Output = StorageResult<I>> + Send;
pub trait EmptyFutureTrait<'a> = Future<Output = StorageResult<()>> + Send;

#[macro_export]
macro_rules! define_state_store_associated_type_v2 {
    () => {
        type GetFuture<'a> = impl GetFutureTrait<'a>;
        type IterFuture<'a, R, B>  = impl IterFutureTrait<'a, Self::Iter, R, B>
                                                            where
                                                                R: 'static + Send + RangeBounds<B>,
                                                                B: 'static + Send + AsRef<[u8]>;
        type InsertFuture<'a> = impl EmptyFutureTrait<'a>;
        type DeleteFuture<'a> = impl EmptyFutureTrait<'a>;
    };
}

#[allow(unused)]
#[derive(Default, Clone)]
pub struct ReadOptions {
    prefix_hint: Option<Vec<u8>>,
    check_bloom_filter: bool,
    pub retention_seconds: Option<u32>, // second
}

pub trait Memtable {
    type Iter;
    fn insert(&mut self, key: Bytes, val: Bytes, epoch: HummockEpoch);
    fn delete(&mut self, key: Bytes, epoch: HummockEpoch);
    fn get(&self, key: &u8, epoch: HummockEpoch) -> Option<Bytes>;
    fn iter<'a, R, B>(&self, key_range: R) -> Self::Iter
    where
        R: RangeBounds<B> + Send,
        B: AsRef<[u8]> + Send;
}

pub enum UncommittedData<M>
where
    M: Memtable,
{
    ImmMem(Arc<M>),
    Sst(LocalSstableInfo),
}

pub enum VersionUpdate {
    Delta(HummockVersionDelta),
    Snapshot(HummockVersion),
}

pub type OrderIdx = u32;

#[allow(unused)]
pub struct LocalVersion<M>
where
    M: Memtable,
{
    uncommmitted_data: BTreeMap<OrderIdx, UncommittedData<M>>,
    // Version used for reads.
    // TODO: use a custom data structure to allow in-place update instead of proto
    version: HummockVersion,
}

#[allow(unused)]
pub struct HummockStorageBase<M>
where
    M: Memtable,
{
    version: LocalVersion<M>,

    sstable_store: SstableStoreRef,

    stats: Arc<StateStoreMetrics>,
}

#[allow(unused)]
impl<M> HummockStorageBase<M>
where
    M: Memtable,
{
    pub fn add_immutable_memtable(&mut self, imm_mem: M) -> HummockResult<OrderIdx> {
        unimplemented!()
    }

    pub fn update_version(&mut self, info: VersionUpdate) -> HummockResult<()> {
        unimplemented!()
    }

    pub fn update_uncommitted_data(
        &mut self,
        info: UncommittedData<M>,
        idx: OrderIdx,
    ) -> HummockResult<()> {
        unimplemented!()
    }

    fn get(&self, key: &[u8], epoch: u64, read_options: ReadOptions) -> impl GetFutureTrait<'_> {
        async move { unimplemented!() }
    }

    fn iter<R, B>(
        &self,
        key_range: R,
        epoch: u64,
        read_options: ReadOptions,
    ) -> impl IterFutureTrait<'_, HummockStateStoreIter, R, B>
    where
        R: 'static + Send + RangeBounds<B>,
        B: 'static + Send + AsRef<[u8]>,
    {
        async move { unimplemented!() }
    }
}
