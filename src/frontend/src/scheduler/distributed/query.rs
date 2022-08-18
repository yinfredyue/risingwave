// Copyright 2022 Singularity Data
// Licensed under the Apache License, Version 2.0 (the "License");
//
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

use std::collections::HashMap;
use std::default::Default;
use std::mem;
use std::sync::Arc;

use anyhow::anyhow;
use risingwave_batch::executor::ExecutorBuilder;
use risingwave_common::bail;
use risingwave_pb::batch_plan::plan_node::NodeBody;
use risingwave_pb::batch_plan::{
    ExchangeNode, MergeSortExchangeNode, PlanFragment, PlanNode as PlanNodeProst,
    TaskId as TaskIdProst, TaskOutputId as TaskOutputIdProst,
};
use risingwave_pb::common::HostAddress;
use risingwave_rpc_client::ComputeClientPoolRef;
use tokio::sync::mpsc::{channel, Receiver};
use tokio::sync::{oneshot, RwLock};
use tracing::{debug, error, info, warn};
use uuid::Uuid;

use super::{QueryResultFetcher, StageEvent};
use crate::optimizer::plan_node::PlanNodeType;
use crate::scheduler::distributed::query::QueryMessage::Stage;
use crate::scheduler::distributed::StageEvent::Scheduled;
use crate::scheduler::distributed::StageExecution;
use crate::scheduler::plan_fragmenter::{
    ExecutionPlanNode, Query, StageId, TaskId, ROOT_TASK_ID, ROOT_TASK_OUTPUT_ID,
};
use crate::scheduler::worker_node_manager::WorkerNodeManagerRef;
use crate::scheduler::{HummockSnapshotManagerRef, SchedulerError, SchedulerResult};
/// Message sent to a `QueryRunner` to control its execution.
#[derive(Debug)]
pub enum QueryMessage {
    /// Events passed running execution.
    Stage(StageEvent),
}

enum QueryState {
    /// Not scheduled yet.
    ///
    /// In this state, some data structures for starting executions are created to avoid holding
    /// them `QueryExecution`
    Pending {
        msg_receiver: Receiver<QueryMessage>,
    },

    /// Running
    Running,

    /// Failed
    Failed,

    /// Completed
    Completed,
}

pub struct QueryExecution {
    query: Arc<Query>,
    state: Arc<RwLock<QueryState>>,

    /// These fields are just used for passing to Query Runner.
    epoch: u64,
    stage_executions: Arc<HashMap<StageId, Arc<StageExecution>>>,
    hummock_snapshot_manager: HummockSnapshotManagerRef,
    compute_client_pool: ComputeClientPoolRef,
}

struct QueryRunner {
    query: Arc<Query>,
    stage_executions: Arc<HashMap<StageId, Arc<StageExecution>>>,
    scheduled_stages_count: usize,
    /// Query messages receiver. For example, stage state change events, query commands.
    msg_receiver: Receiver<QueryMessage>,

    /// Will be set to `None` after all stage scheduled.
    root_stage_sender: Option<oneshot::Sender<SchedulerResult<QueryResultFetcher>>>,

    epoch: u64,
    hummock_snapshot_manager: HummockSnapshotManagerRef,
    compute_client_pool: ComputeClientPoolRef,
}

impl QueryExecution {
    pub fn new(
        query: Query,
        epoch: u64,
        worker_node_manager: WorkerNodeManagerRef,
        hummock_snapshot_manager: HummockSnapshotManagerRef,
        compute_client_pool: ComputeClientPoolRef,
    ) -> Self {
        let query = Arc::new(query);
        let (sender, receiver) = channel(100);
        let stage_executions = {
            let mut stage_executions: HashMap<StageId, Arc<StageExecution>> =
                HashMap::with_capacity(query.stage_graph.stages.len());

            for stage_id in query.stage_graph.stage_ids_by_topo_order() {
                let children_stages = query
                    .stage_graph
                    .get_child_stages_unchecked(&stage_id)
                    .iter()
                    .map(|s| stage_executions[s].clone())
                    .collect::<Vec<Arc<StageExecution>>>();

                let stage_exec = Arc::new(StageExecution::new(
                    epoch,
                    query.stage_graph.stages[&stage_id].clone(),
                    worker_node_manager.clone(),
                    sender.clone(),
                    children_stages,
                    compute_client_pool.clone(),
                ));
                stage_executions.insert(stage_id, stage_exec);
            }
            Arc::new(stage_executions)
        };

        let state = QueryState::Pending {
            msg_receiver: receiver,
        };

        Self {
            query,
            state: Arc::new(RwLock::new(state)),
            stage_executions,
            epoch,
            compute_client_pool,
            hummock_snapshot_manager,
        }
    }

    /// Start execution of this query.
    pub async fn start(&self) -> SchedulerResult<QueryResultFetcher> {
        let mut state = self.state.write().await;
        let cur_state = mem::replace(&mut *state, QueryState::Failed);

        match cur_state {
            QueryState::Pending { msg_receiver } => {
                *state = QueryState::Running;

                let (root_stage_sender, root_stage_receiver) =
                    oneshot::channel::<SchedulerResult<QueryResultFetcher>>();

                let runner = QueryRunner {
                    query: self.query.clone(),
                    stage_executions: self.stage_executions.clone(),
                    msg_receiver,
                    root_stage_sender: Some(root_stage_sender),
                    scheduled_stages_count: 0,
                    epoch: self.epoch,
                    hummock_snapshot_manager: self.hummock_snapshot_manager.clone(),
                    compute_client_pool: self.compute_client_pool.clone(),
                };

                tokio::spawn(async move {
                    let query_id = runner.query.query_id.clone();
                    runner.run().await.map_err(|e| {
                        error!("Query {:?} failed, reason: {:?}", query_id, e);
                        e
                    })
                });

                let root_stage = root_stage_receiver
                    .await
                    .map_err(|e| anyhow!("Starting query execution failed: {:?}", e))??;

                tracing::trace!(
                    "Received root stage query result fetcher: {:?}, query id: {:?}",
                    root_stage,
                    self.query.query_id
                );

                Ok(root_stage)
            }
            s => {
                // Restore old state
                *state = s;
                bail!("Query not pending!")
            }
        }
    }

    /// Cancel execution of this query.
    #[expect(clippy::unused_async)]
    pub async fn abort(&mut self) -> SchedulerResult<()> {
        todo!()
    }
}

impl QueryRunner {
    async fn run(mut self) -> SchedulerResult<()> {
        if self.query.stage_graph.stages.len() == 1 {
            self.send_root_stage_info().await;
            return Ok(());
        }

        // Start leaf stages.
        let leaf_stages = self.query.leaf_stages();
        for stage_id in &leaf_stages {
            // TODO: We should not return error here, we should abort query.
            tracing::trace!(
                "Starting query stage: {:?}-{:?}",
                self.query.query_id,
                stage_id
            );
            self.stage_executions[stage_id].start().await.map_err(|e| {
                error!("Failed to start stage: {}, reason: {:?}", stage_id, e);
                e
            })?;
            tracing::trace!(
                "Query stage {:?}-{:?} started.",
                self.query.query_id,
                stage_id
            );
            println!(
                "Query stage {:?}-{:?} started.",
                self.query.query_id, stage_id
            );
        }
        let mut stages_with_table_scan = self.query.stages_with_table_scan();
        // println!(" target stages: {:?}", self.stage_executions.len() - 1);
        // Schedule other stages after leaf stages are all scheduled.
        while let Some(msg) = self.msg_receiver.recv().await {
            match msg {
                Stage(Scheduled(stage_id)) => {
                    tracing::trace!(
                        "Query stage {:?}-{:?} scheduled.",
                        self.query.query_id,
                        stage_id
                    );
                    println!(                        "Query stage {:?}-{:?} scheduled.",
                                                     self.query.query_id,
                                                     stage_id);
                    self.scheduled_stages_count += 1;
                    stages_with_table_scan.remove(&stage_id);
                    if stages_with_table_scan.is_empty() {
                        // We can be sure here that all the Hummock iterators have been created,
                        // thus they all successfully pinned a HummockVersion.
                        // So we can now unpin their epoch.
                        tracing::trace!("Query {:?} has scheduled all of its stages that have table scan (iterator creation).", self.query.query_id);
                        self.hummock_snapshot_manager
                            .unpin_snapshot(self.epoch, self.query.query_id())
                            .await?;
                    }

                    // For root stage, we execute in frontend local. We will pass the root fragment
                    // to QueryResultFetcher and execute to get a Chunk stream.
                    if self.scheduled_stages_count == self.stage_executions.len() - 1 {
                        // Now all non-root stages have been scheduled, send root stage info.
                        self.send_root_stage_info().await;
                        break;
                    } else {
                        for parent in self.query.get_parents(&stage_id) {
                            if self.all_children_scheduled(parent).await && *parent != self.query.stage_graph.root_stage_id {
                                self.stage_executions[parent].start().await.map_err(|e| {
                                    error!("Failed to start stage: {}, reason: {:?}", stage_id, e);
                                    e
                                })?;
                            }
                        }
                    }
                }
                Stage(StageEvent::Failed { id, reason }) => {
                    error!(
                        "Query stage {:?}-{:?} failed: {:?}.",
                        self.query.query_id, id, reason
                    );

                    // Consume sender here and send error to root stage.
                    let root_stage_sender = mem::take(&mut self.root_stage_sender);
                    // It's possible we receive stage failed event message multi times and the
                    // sender has been consumed in first failed event.
                    if let Some(sender) = root_stage_sender {
                        if let Err(e) = sender.send(Err(reason)) {
                            warn!("Query execution dropped: {:?}", e);
                        } else {
                            debug!(
                                "Root stage failure event for {:?} sent.",
                                self.query.query_id
                            );
                        }
                    }

                    // Stop all running stages.
                    for (_stage_id, stage_execution) in self.stage_executions.iter() {
                        println!("abort stage {:?}", *_stage_id);
                        // The stop is return immediately so no need to spawn tasks.
                        stage_execution.stop().await;
                    }

                    // One stage failed, not necessary to execute schedule stages.
                    break;
                }
                rest => {
                    return Err(SchedulerError::NotImplemented(
                        format!("unsupported message \"{:?}\" for QueryRunner.run", rest),
                        None.into(),
                    ));
                }
            }
        }

        info!("Query runner {:?} finished.", self.query.query_id);
        // FIXME: This is a little confusing, it's possible to return Ok even if tell query stage
        // runner Err.
        Ok(())
    }

    async fn send_root_stage_info(&mut self) {
        let root_task_output_id = {
            let root_task_id_prost = TaskIdProst {
                query_id: self.query.query_id.clone().id,
                stage_id: self.query.root_stage_id(),
                task_id: ROOT_TASK_ID,
            };

            TaskOutputIdProst {
                task_id: Some(root_task_id_prost),
                output_id: ROOT_TASK_OUTPUT_ID,
            }
        };

        let root_fragment = self.create_plan_fragment();
        let root_task_status = self.stage_executions[&self.query.root_stage_id()]
            .get_task_status_unchecked(ROOT_TASK_ID);
        let root_stage_result = QueryResultFetcher::new(
            self.epoch,
            self.hummock_snapshot_manager.clone(),
            root_task_output_id,
            HostAddress {
                ..Default::default()
            },
            self.compute_client_pool.clone(),
            Some(root_fragment),
        );

        // Consume sender here.
        let root_stage_sender = mem::take(&mut self.root_stage_sender);

        if let Err(e) = root_stage_sender.unwrap().send(Ok(root_stage_result)) {
            warn!("Query execution dropped: {:?}", e);
        } else {
            debug!("Root stage for {:?} sent.", self.query.query_id);
        }
    }

    async fn all_children_scheduled(&self, stage_id: &StageId) -> bool {
        for child in self.query.stage_graph.get_child_stages_unchecked(stage_id) {
            if !self.stage_executions[child].is_scheduled().await {
                return false;
            }
        }
        true
    }

    fn create_plan_fragment(&self) -> PlanFragment {
        let root_stage_id = self.query.stage_graph.root_stage_id;
        let root_stage = self.stage_executions.get(&root_stage_id).unwrap();
        let plan_node_prost =
            Self::convert_plan_node(root_stage, &root_stage.stage.root, ROOT_TASK_ID);
        let exchange_info = root_stage.stage.exchange_info.clone();
        println!("----------- Create Plan Fragment ----------");
        // println!("exchange info for the plan: {:?}", exchange_info);
        // println!("The plan: {:?}", plan_node_prost);
        // println!("child for plan node prost: {:?}", plan_node_prost.children.len());
        // println!("child for child for plan node prost: {:?}", plan_node_prost.children[0].children.len());
        println!("----------- Create Plan Fragment ----------");
        PlanFragment {
            root: Some(plan_node_prost),
            exchange_info: Some(exchange_info),
        }
    }

    fn convert_plan_node(
        stage_execution: &StageExecution,
        execution_plan_node: &ExecutionPlanNode,
        task_id: TaskId,
    ) -> PlanNodeProst {
        match execution_plan_node.plan_node_type {
            PlanNodeType::BatchExchange => {
                // Find the stage this exchange node should fetch from and get all exchange sources.
                let child_stage = stage_execution
                    .children
                    .iter()
                    .find(|child_stage| {
                        child_stage.stage.id == execution_plan_node.source_stage_id.unwrap()
                    })
                    .unwrap();
                let exchange_sources = child_stage.all_exchange_sources_for(task_id);
                println!(
                    "get source exchange for self.stage.id {:?} as {:?}",
                    child_stage.stage.id, exchange_sources
                );

                match &execution_plan_node.node {
                    NodeBody::Exchange(_exchange_node) => {
                        PlanNodeProst {
                            children: vec![],
                            // TODO: Generate meaningful identify
                            identity: Uuid::new_v4().to_string(),
                            node_body: Some(NodeBody::Exchange(ExchangeNode {
                                sources: exchange_sources,
                                input_schema: execution_plan_node.schema.clone(),
                            })),
                        }
                    }
                    NodeBody::MergeSortExchange(sort_merge_exchange_node) => {
                        PlanNodeProst {
                            children: vec![],
                            // TODO: Generate meaningful identify
                            identity: Uuid::new_v4().to_string(),
                            node_body: Some(NodeBody::MergeSortExchange(MergeSortExchangeNode {
                                exchange: Some(ExchangeNode {
                                    sources: exchange_sources,
                                    input_schema: execution_plan_node.schema.clone(),
                                }),
                                column_orders: sort_merge_exchange_node.column_orders.clone(),
                            })),
                        }
                    }
                    _ => unreachable!(),
                }
            }
            PlanNodeType::BatchSeqScan => {
                unreachable!("Scan can not in the root fragment");
            }
            _ => {
                let children = execution_plan_node
                    .children
                    .iter()
                    // FIXME:
                    .map(|e| Self::convert_plan_node(stage_execution, e, task_id))
                    .collect();

                PlanNodeProst {
                    children,
                    // TODO: Generate meaningful identify
                    identity: Uuid::new_v4().to_string(),
                    node_body: Some(execution_plan_node.node.clone()),
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use std::rc::Rc;
    use std::sync::Arc;

    use risingwave_common::catalog::{ColumnDesc, TableDesc};
    use risingwave_common::config::constant::hummock::TABLE_OPTION_DUMMY_RETAINTION_SECOND;
    use risingwave_common::types::DataType;
    use risingwave_pb::common::{HostAddress, ParallelUnit, WorkerNode, WorkerType};
    use risingwave_pb::plan_common::JoinType;
    use risingwave_rpc_client::ComputeClientPool;

    use crate::expr::InputRef;
    use crate::optimizer::plan_node::{
        BatchExchange, BatchHashJoin, EqJoinPredicate, LogicalJoin, LogicalScan, ToBatch,
    };
    use crate::optimizer::property::{Distribution, Order};
    use crate::optimizer::PlanRef;
    use crate::scheduler::distributed::QueryExecution;
    use crate::scheduler::plan_fragmenter::{BatchPlanFragmenter, Query};
    use crate::scheduler::worker_node_manager::WorkerNodeManager;
    use crate::scheduler::HummockSnapshotManager;
    use crate::session::OptimizerContext;
    use crate::test_utils::MockFrontendMetaClient;
    use crate::utils::Condition;

    #[tokio::test]
    async fn test_query_should_not_hang_with_empty_worker() {
        let worker_node_manager = Arc::new(WorkerNodeManager::mock(vec![]));
        let compute_client_pool = Arc::new(ComputeClientPool::new(1024));
        let query_execution = QueryExecution::new(
            create_query().await,
            100,
            worker_node_manager,
            Arc::new(HummockSnapshotManager::new(Arc::new(
                MockFrontendMetaClient {},
            ))),
            compute_client_pool,
        );
        assert!(query_execution.start().await.is_err());
    }

    async fn create_query() -> Query {
        // Construct a Hash Join with Exchange node.
        // Logical plan:
        //
        //    HashJoin
        //     /    \
        //   Scan  Scan
        //
        let ctx = OptimizerContext::mock().await;

        let batch_plan_node: PlanRef = LogicalScan::create(
            "".to_string(),
            false,
            Rc::new(TableDesc {
                table_id: 0.into(),
                pk: vec![],
                order_key: vec![],
                columns: vec![
                    ColumnDesc {
                        data_type: DataType::Int32,
                        column_id: 0.into(),
                        name: "a".to_string(),
                        type_name: String::new(),
                        field_descs: vec![],
                    },
                    ColumnDesc {
                        data_type: DataType::Float64,
                        column_id: 1.into(),
                        name: "b".to_string(),
                        type_name: String::new(),
                        field_descs: vec![],
                    },
                ],
                distribution_key: vec![],
                appendonly: false,
                retention_seconds: TABLE_OPTION_DUMMY_RETAINTION_SECOND,
            }),
            vec![],
            ctx,
        )
        .to_batch()
        .unwrap()
        .to_distributed()
        .unwrap();
        let batch_exchange_node1: PlanRef = BatchExchange::new(
            batch_plan_node.clone(),
            Order::default(),
            Distribution::HashShard(vec![0, 1]),
        )
        .into();
        let batch_exchange_node2: PlanRef = BatchExchange::new(
            batch_plan_node.clone(),
            Order::default(),
            Distribution::HashShard(vec![0, 1]),
        )
        .into();
        let hash_join_node: PlanRef = BatchHashJoin::new(
            LogicalJoin::new(
                batch_exchange_node1.clone(),
                batch_exchange_node2.clone(),
                JoinType::Inner,
                Condition::true_cond(),
            ),
            EqJoinPredicate::new(
                Condition::true_cond(),
                vec![
                    (
                        InputRef {
                            index: 0,
                            data_type: DataType::Int32,
                        },
                        InputRef {
                            index: 2,
                            data_type: DataType::Int32,
                        },
                    ),
                    (
                        InputRef {
                            index: 1,
                            data_type: DataType::Float64,
                        },
                        InputRef {
                            index: 3,
                            data_type: DataType::Float64,
                        },
                    ),
                ],
                2,
            ),
        )
        .into();
        let batch_exchange_node3: PlanRef = BatchExchange::new(
            hash_join_node.clone(),
            Order::default(),
            Distribution::Single,
        )
        .into();

        let worker1 = WorkerNode {
            id: 0,
            r#type: WorkerType::ComputeNode as i32,
            host: Some(HostAddress {
                host: "127.0.0.1".to_string(),
                port: 5687,
            }),
            state: risingwave_pb::common::worker_node::State::Running as i32,
            parallel_units: generate_parallel_units(0, 0),
        };
        let worker2 = WorkerNode {
            id: 1,
            r#type: WorkerType::ComputeNode as i32,
            host: Some(HostAddress {
                host: "127.0.0.1".to_string(),
                port: 5688,
            }),
            state: risingwave_pb::common::worker_node::State::Running as i32,
            parallel_units: generate_parallel_units(8, 1),
        };
        let worker3 = WorkerNode {
            id: 2,
            r#type: WorkerType::ComputeNode as i32,
            host: Some(HostAddress {
                host: "127.0.0.1".to_string(),
                port: 5689,
            }),
            state: risingwave_pb::common::worker_node::State::Running as i32,
            parallel_units: generate_parallel_units(16, 2),
        };
        let workers = vec![worker1, worker2, worker3];
        let worker_node_manager = Arc::new(WorkerNodeManager::mock(workers));
        worker_node_manager.insert_table_mapping(0.into(), vec![]);
        // Break the plan node into fragments.
        let fragmenter = BatchPlanFragmenter::new(worker_node_manager);
        fragmenter.split(batch_exchange_node3.clone()).unwrap()
    }

    fn generate_parallel_units(start_id: u32, node_id: u32) -> Vec<ParallelUnit> {
        let parallel_degree = 8;
        (start_id..start_id + parallel_degree)
            .map(|id| ParallelUnit {
                id,
                worker_node_id: node_id,
            })
            .collect()
    }
}
