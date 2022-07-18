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

use std::sync::Arc;

use itertools::Itertools;
use risingwave_common::catalog::TableId;
use risingwave_common::error::{tonic_err, Result as RwResult};
use risingwave_pb::catalog::Source;
use risingwave_pb::stream_service::barrier_complete_response::{
    GroupedSstableInfo, GroupedSstableInfoAaa,
};
use risingwave_pb::stream_service::stream_service_server::StreamService;
use risingwave_pb::stream_service::*;
use risingwave_stream::executor::{Barrier, Epoch};
use risingwave_stream::task::{LocalStreamManager, StreamEnvironment};
use tokio::sync::RwLock;
use tonic::{Request, Response, Status};

#[derive(Clone)]
pub struct StreamServiceImpl {
    mgr: Arc<LocalStreamManager>,
    env: StreamEnvironment,
    last_epoch: Arc<RwLock<u64>>,
}

impl StreamServiceImpl {
    pub fn new(mgr: Arc<LocalStreamManager>, env: StreamEnvironment) -> Self {
        StreamServiceImpl {
            mgr,
            env,
            last_epoch: Arc::new(RwLock::new(0)),
        }
    }
}

#[async_trait::async_trait]
impl StreamService for StreamServiceImpl {
    #[cfg_attr(coverage, no_coverage)]
    async fn update_actors(
        &self,
        request: Request<UpdateActorsRequest>,
    ) -> std::result::Result<Response<UpdateActorsResponse>, Status> {
        let req = request.into_inner();
        let res = self.mgr.update_actors(&req.actors, &req.hanging_channels);
        match res {
            Err(e) => {
                error!("failed to update stream actor {}", e);
                Err(e.into())
            }
            Ok(()) => Ok(Response::new(UpdateActorsResponse { status: None })),
        }
    }

    #[cfg_attr(coverage, no_coverage)]
    async fn build_actors(
        &self,
        request: Request<BuildActorsRequest>,
    ) -> std::result::Result<Response<BuildActorsResponse>, Status> {
        let req = request.into_inner();

        let actor_id = req.actor_id;
        let res = self.mgr.build_actors(actor_id.as_slice(), self.env.clone());
        match res {
            Err(e) => {
                error!("failed to build actors {}", e);
                Err(e.into())
            }
            Ok(()) => Ok(Response::new(BuildActorsResponse {
                request_id: req.request_id,
                status: None,
            })),
        }
    }

    #[cfg_attr(coverage, no_coverage)]
    async fn broadcast_actor_info_table(
        &self,
        request: Request<BroadcastActorInfoTableRequest>,
    ) -> std::result::Result<Response<BroadcastActorInfoTableResponse>, Status> {
        let table = request.into_inner();

        let res = self.mgr.update_actor_info(table);
        match res {
            Err(e) => {
                error!("failed to update actor info table actor {}", e);
                Err(e.into())
            }
            Ok(()) => Ok(Response::new(BroadcastActorInfoTableResponse {
                status: None,
            })),
        }
    }

    #[cfg_attr(coverage, no_coverage)]
    async fn drop_actors(
        &self,
        request: Request<DropActorsRequest>,
    ) -> std::result::Result<Response<DropActorsResponse>, Status> {
        let req = request.into_inner();
        let actors = req.actor_ids;
        self.mgr.drop_actor(&actors)?;
        Ok(Response::new(DropActorsResponse {
            request_id: req.request_id,
            status: None,
        }))
    }

    #[cfg_attr(coverage, no_coverage)]
    async fn force_stop_actors(
        &self,
        request: Request<ForceStopActorsRequest>,
    ) -> std::result::Result<Response<ForceStopActorsResponse>, Status> {
        let req = request.into_inner();
        let epoch = req.epoch.unwrap();
        self.mgr
            .stop_all_actors(Epoch {
                curr: epoch.curr,
                prev: epoch.prev,
            })
            .await?;
        Ok(Response::new(ForceStopActorsResponse {
            request_id: req.request_id,
            status: None,
        }))
    }

    #[cfg_attr(coverage, no_coverage)]
    async fn inject_barrier(
        &self,
        request: Request<InjectBarrierRequest>,
    ) -> Result<Response<InjectBarrierResponse>, Status> {
        let req = request.into_inner();
        let barrier =
            Barrier::from_protobuf(req.get_barrier().map_err(tonic_err)?).map_err(tonic_err)?;

        self.mgr
            .send_barrier(&barrier, req.actor_ids_to_send, req.actor_ids_to_collect)?;

        Ok(Response::new(InjectBarrierResponse {
            request_id: req.request_id,
            status: None,
        }))
    }

    #[cfg_attr(coverage, no_coverage)]
    async fn barrier_complete(
        &self,
        request: Request<BarrierCompleteRequest>,
    ) -> Result<Response<BarrierCompleteResponse>, Status> {
        let req = request.into_inner();
        let collect_result = self.mgr.collect_barrier(req.prev_epoch).await;
        // Must finish syncing data written in the epoch before respond back to ensure persistency
        // of the state.
        let is_create_mv = collect_result.create_mview_progress.iter().any(|n| n.done);
        let mut last_epoch_guard = self.last_epoch.write().await;
        let mut is_sync = true;
        // tracing::info!("aaa{:?}||{:?}&&
        // {:?}",is_create_mv,req.is_sync,last_epoch_guard.lt(&req.prev_epoch));
        let synced_sstables =
            if (req.is_sync || is_create_mv) && last_epoch_guard.lt(&req.prev_epoch) {
                let last_epoch_1 = last_epoch_guard.clone();
                *last_epoch_guard = req.prev_epoch;
                drop(last_epoch_guard);
                tracing::info!("sync succ {:?}", req.prev_epoch);
                // RwLockWriteGuard::unlock_fair(last_epoch_guard);
                self.mgr.sync_epoch(req.prev_epoch, last_epoch_1).await
            } else {
                tracing::info!("no sync epoch {:?}!!", req.prev_epoch);
                is_sync = false;
                vec![]
            };
        // let synced_sstables = self.mgr.sync_epoch(req.prev_epoch).await;

        Ok(Response::new(BarrierCompleteResponse {
            request_id: req.request_id,
            status: None,
            create_mview_progress: collect_result.create_mview_progress,
            sycned_sstables: synced_sstables
                .into_iter()
                .map(|(epoch, synced_sst)| {
                    let grouped_sstable_info = synced_sst
                        .into_iter()
                        .map(|(compaction_group_id, sst)| GroupedSstableInfo {
                            compaction_group_id,
                            sst: Some(sst),
                        })
                        .collect_vec();
                    GroupedSstableInfoAaa {
                        epoch,
                        grouped_sstable_info,
                    }
                })
                .collect_vec(),
            is_sync,
        }))
    }

    #[cfg_attr(coverage, no_coverage)]
    async fn create_source(
        &self,
        request: Request<CreateSourceRequest>,
    ) -> Result<Response<CreateSourceResponse>, Status> {
        let source = request.into_inner().source.unwrap();
        self.create_source_inner(&source).await.map_err(tonic_err)?;
        tracing::debug!(id = %source.id, "create table source");

        Ok(Response::new(CreateSourceResponse { status: None }))
    }

    #[cfg_attr(coverage, no_coverage)]
    async fn sync_sources(
        &self,
        request: Request<SyncSourcesRequest>,
    ) -> Result<Response<SyncSourcesResponse>, Status> {
        let sources = request.into_inner().sources;
        self.env
            .source_manager()
            .clear_sources()
            .map_err(tonic_err)?;
        for source in sources {
            self.create_source_inner(&source).await.map_err(tonic_err)?
        }

        Ok(Response::new(SyncSourcesResponse { status: None }))
    }

    #[cfg_attr(coverage, no_coverage)]
    async fn drop_source(
        &self,
        request: Request<DropSourceRequest>,
    ) -> Result<Response<DropSourceResponse>, Status> {
        let id = request.into_inner().source_id;
        let id = TableId::new(id); // TODO: use SourceId instead

        self.env
            .source_manager()
            .drop_source(&id)
            .map_err(tonic_err)?;

        tracing::debug!(id = %id, "drop source");

        Ok(Response::new(DropSourceResponse { status: None }))
    }
}

impl StreamServiceImpl {
    async fn create_source_inner(&self, source: &Source) -> RwResult<()> {
        use risingwave_pb::catalog::source::Info;

        let id = TableId::new(source.id); // TODO: use SourceId instead

        match &source.get_info()? {
            Info::StreamSource(info) => {
                self.env
                    .source_manager()
                    .create_source(&id, info.to_owned())
                    .await?;
            }
            Info::TableSource(info) => {
                let columns = info
                    .columns
                    .iter()
                    .cloned()
                    .map(|c| c.column_desc.unwrap().into())
                    .collect_vec();

                self.env
                    .source_manager()
                    .create_table_source(&id, columns)?;
            }
        };

        Ok(())
    }
}
