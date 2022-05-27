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

use std::collections::{HashSet, VecDeque};
use std::iter::once;
use std::sync::atomic::AtomicBool;
use std::sync::{atomic, Arc};
use std::time::Duration;

use futures::future::try_join_all;
use itertools::Itertools;
use risingwave_common::catalog::TableId;
use risingwave_common::error::{ErrorCode, Result, RwError, ToRwResult};
use risingwave_common::util::epoch::{Epoch, INVALID_EPOCH};
use risingwave_hummock_sdk::HummockEpoch;
use risingwave_pb::common::worker_node::State::Running;
use risingwave_pb::common::WorkerType;
use risingwave_pb::data::Barrier;
use risingwave_pb::stream_service::{InjectBarrierRequest, InjectBarrierResponse};
use smallvec::SmallVec;
use tokio::sync::mpsc::{UnboundedReceiver, UnboundedSender};
use tokio::sync::{oneshot, watch, RwLock};
use tokio::task::JoinHandle;
use uuid::Uuid;
use crate::barrier::BarrierEpochState::{Fail,Complete};

pub use self::command::Command;
use self::command::CommandContext;
use self::info::BarrierActorInfo;
use self::notifier::{Notifier, UnfinishedNotifiers};
use crate::cluster::{ClusterManagerRef, META_NODE_ID};
use crate::hummock::HummockManagerRef;
use crate::manager::{CatalogManagerRef, MetaSrvEnv};
use crate::model::{ActorId, BarrierManagerState};
use crate::rpc::metrics::MetaMetrics;
use crate::storage::MetaStore;
use crate::stream::FragmentManagerRef;

mod command;
mod info;
mod notifier;
mod recovery;

type Scheduled = (Command, SmallVec<[Notifier; 1]>);

#[derive(Debug)]
enum BarrierSendResult {
    Ok {
        new_epoch: Epoch,
        actors_to_finish: HashSet<ActorId>,
        notifiers: SmallVec<[Notifier; 1]>,
        responses: Vec<InjectBarrierResponse>,
    },
    Err {
        new_epoch: Epoch,
        err_msg: RwError,
    },
}

/// A buffer or queue for scheduling barriers.
struct ScheduledBarriers {
    buffer: RwLock<VecDeque<Scheduled>>,

    /// When `buffer` is not empty anymore, all subscribers of this watcher will be notified.
    changed_tx: watch::Sender<()>,
}

impl ScheduledBarriers {
    fn new() -> Self {
        Self {
            buffer: RwLock::new(VecDeque::new()),
            changed_tx: watch::channel(()).0,
        }
    }

    /// Pop a scheduled barrier from the buffer, or a default checkpoint barrier if not exists.
    async fn pop_or_default(&self) -> Scheduled {
        let mut buffer = self.buffer.write().await;

        // If no command scheduled, create periodic checkpoint barrier by default.
        buffer
            .pop_front()
            .unwrap_or_else(|| (Command::checkpoint(), Default::default()))
    }

    /// Wait for at least one scheduled barrier in the buffer.
    async fn wait_one(&self) {
        let buffer = self.buffer.read().await;
        if buffer.len() > 0 {
            return;
        }
        let mut rx = self.changed_tx.subscribe();
        drop(buffer);

        rx.changed().await.unwrap();
    }

    /// Push a scheduled barrier into the buffer.
    async fn push(&self, scheduled: Scheduled) {
        let mut buffer = self.buffer.write().await;
        buffer.push_back(scheduled);
        if buffer.len() == 1 {
            self.changed_tx.send(()).ok();
        }
    }

    /// Attach `new_notifiers` to the very first scheduled barrier. If there's no one scheduled, a
    /// default checkpoint barrier will be created.
    async fn attach_notifiers(&self, new_notifiers: impl IntoIterator<Item = Notifier>) {
        let mut buffer = self.buffer.write().await;
        match buffer.front_mut() {
            Some((_, notifiers)) => notifiers.extend(new_notifiers),
            None => {
                // If no command scheduled, create periodic checkpoint barrier by default.
                buffer.push_back((Command::checkpoint(), new_notifiers.into_iter().collect()));
                if buffer.len() == 1 {
                    self.changed_tx.send(()).ok();
                }
            }
        }
    }

    /// Clear all buffered scheduled barriers, and notify their subscribers with failed as aborted.
    async fn abort(&self) {
        let mut buffer = self.buffer.write().await;
        while let Some((_, notifiers)) = buffer.pop_front() {
            notifiers.into_iter().for_each(|notify| {
                notify.notify_collection_failed(RwError::from(ErrorCode::InternalError(
                    "Scheduled barrier abort.".to_string(),
                )))
            })
        }
    }
}

/// [`crate::barrier::GlobalBarrierManager`] sends barriers to all registered compute nodes and
/// collect them, with monotonic increasing epoch numbers. On compute nodes, `LocalBarrierManager`
/// in `risingwave_stream` crate will serve these requests and dispatch them to source actors.
///
/// Configuration change in our system is achieved by the mutation in the barrier. Thus,
/// [`crate::barrier::GlobalBarrierManager`] provides a set of interfaces like a state machine,
/// accepting [`Command`] that carries info to build `Mutation`. To keep the consistency between
/// barrier manager and meta store, some actions like "drop materialized view" or "create mv on mv"
/// must be done in barrier manager transactional using [`Command`].
pub struct GlobalBarrierManager<S: MetaStore> {
    /// The maximal interval for sending a barrier.
    interval: Duration,

    /// Enable recovery or not when failover.
    enable_recovery: bool,

    /// The queue of scheduled barriers.
    scheduled_barriers: ScheduledBarriers,

    cluster_manager: ClusterManagerRef<S>,

    catalog_manager: CatalogManagerRef<S>,

    fragment_manager: FragmentManagerRef<S>,

    hummock_manager: HummockManagerRef<S>,

    metrics: Arc<MetaMetrics>,

    env: MetaSrvEnv<S>,

    wait_recovery: Arc<AtomicBool>,

    wait_build_actor: Arc<AtomicBool>,

    command_ctx_queue: Arc<RwLock<VecDeque<EpochNode<S>>>>,
}

struct EpochNode<S>{
    result: Option<Result<Vec<InjectBarrierResponse>>>,
    states: BarrierEpochState,
    command_ctx: Arc<CommandContext<S>>,
    notifiers: SmallVec<[Notifier; 1]>,
}
#[derive(PartialEq)]
enum BarrierEpochState{
    Pending,
    Complete,
    Fail(RwError),
}

impl<S> GlobalBarrierManager<S>
where
    S: MetaStore,
{
    /// Create a new [`crate::barrier::GlobalBarrierManager`].
    pub fn new(
        env: MetaSrvEnv<S>,
        cluster_manager: ClusterManagerRef<S>,
        catalog_manager: CatalogManagerRef<S>,
        fragment_manager: FragmentManagerRef<S>,
        hummock_manager: HummockManagerRef<S>,
        metrics: Arc<MetaMetrics>,
    ) -> Self {
        let enable_recovery = env.opts.enable_recovery;
        let interval = env.opts.checkpoint_interval;
        tracing::info!(
            "Starting barrier manager with: interval={:?}, enable_recovery={}",
            interval,
            enable_recovery
        );

        Self {
            interval,
            enable_recovery,
            cluster_manager,
            catalog_manager,
            fragment_manager,
            scheduled_barriers: ScheduledBarriers::new(),
            hummock_manager,
            metrics,
            env,
            wait_recovery: Arc::new(AtomicBool::new(false)),
            wait_build_actor: Arc::new(AtomicBool::new(false)),
            command_ctx_queue: Arc::new(RwLock::new(VecDeque::new())),
        }
    }

    pub async fn start(
        barrier_manager: BarrierManagerRef<S>,
    ) -> (JoinHandle<()>, UnboundedSender<()>) {
        let (shutdown_tx, shutdown_rx) = tokio::sync::mpsc::unbounded_channel();
        let join_handle = tokio::spawn(async move {
            barrier_manager.run(shutdown_rx).await;
        });

        (join_handle, shutdown_tx)
    }
    /// Start an infinite loop to take scheduled barriers and send them.
    async fn run(&self , mut shutdown_rx: UnboundedReceiver<()>){
        let env = self.env.clone();
        let mut unfinished = UnfinishedNotifiers::default();
        let mut state = BarrierManagerState::create(env.meta_store()).await;

        if self.enable_recovery {
            // handle init, here we simply trigger a recovery process to achieve the consistency. We
            // may need to avoid this when we have more state persisted in meta store.
            let new_epoch = state.prev_epoch.next();
            assert!(new_epoch > state.prev_epoch);
            state.prev_epoch = new_epoch;

            let (new_epoch, actors_to_finish, finished_create_mviews) =
                self.recovery(state.prev_epoch).await;
            unfinished.add(new_epoch.0, actors_to_finish, vec![]);
            for finished in finished_create_mviews {
                unfinished.finish_actors(finished.epoch, once(finished.actor_id));
            }
            state.prev_epoch = new_epoch;
            state.update(env.meta_store()).await.unwrap();
        }
        let mut last_epoch = state.prev_epoch.0;
        let mut min_interval = tokio::time::interval(self.interval);
        min_interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
        let (barrier_send_tx, mut barrier_send_rx) = tokio::sync::mpsc::unbounded_channel();
        loop{
            tokio::select! {
                biased;
                // Shutdown
                _ = shutdown_rx.recv() => {
                    tracing::info!("Barrier manager is shutting down");
                    return;
                }
                result = barrier_send_rx.recv() =>{
                    match result{
                        Some(BarrierSendResult::Ok{new_epoch,actors_to_finish,notifiers,responses}) => {
                            unfinished.add(new_epoch.0, actors_to_finish, notifiers);
                            
                            for finished in responses.into_iter().flat_map(|r| r.finished_create_mviews) {
                                unfinished.finish_actors(finished.epoch, once(finished.actor_id));
                            }

                        state.prev_epoch = new_epoch;

                        }
                        Some(BarrierSendResult::Err{new_epoch,err_msg}) => {
                            if self.enable_recovery {
                                // if not over , need wait all err barrier
                                // If failed, enter recovery mode.
                                let (new_epoch, actors_to_finish, finished_create_mviews) =
                                self.recovery(new_epoch).await;
                                unfinished = UnfinishedNotifiers::default();
                                unfinished.add(new_epoch.0, actors_to_finish, vec![]);
                                for finished in finished_create_mviews {
                                    unfinished.finish_actors(finished.epoch, once(finished.actor_id));
                                }
                                state.prev_epoch = new_epoch;
                                last_epoch = new_epoch.0;
                                self.wait_recovery.store(false,atomic::Ordering::SeqCst);
                            } else {
                                panic!("failed to execute barrier: {:?}", err_msg);
                            }
                        }
                        _=>{}
                    }
                    state.update(self.env.meta_store()).await.unwrap();
                    continue;
                }
                // there's barrier scheduled.
                _ = self.scheduled_barriers.wait_one() => {
                    if self.wait_recovery.load(atomic::Ordering::SeqCst){
                        continue;
                    }
                    if self.wait_build_actor.load(atomic::Ordering::SeqCst){
                        continue;
                    }
                }
                // Wait for the minimal interval,
                _ = min_interval.tick() => {
                    if self.wait_recovery.load(atomic::Ordering::SeqCst){
                        continue;
                    }
                    if self.wait_build_actor.load(atomic::Ordering::SeqCst){
                        continue;
                    }
                }
            }
            let (command, notifiers) = self.scheduled_barriers.pop_or_default().await;

            match command {
                Command::Plain(..) => {}
                _ => {
                    self.wait_build_actor.store(true, atomic::Ordering::SeqCst);
                }
            }
            let info = self.resolve_actor_info(command.creating_table_id()).await;
            // When there's no actors exist in the cluster, we don't need to send the barrier. This
            // is an advance optimization. Besides if another barrier comes immediately,
            // it may send a same epoch and fail the epoch check.
            if info.nothing_to_do() {
                let mut notifiers = notifiers;
                notifiers.iter_mut().for_each(Notifier::notify_to_send);
                notifiers.iter_mut().for_each(Notifier::notify_collected);
                continue;
            }
            let prev_epoch = Epoch::from(last_epoch);
            let new_epoch = prev_epoch.next();
            last_epoch = new_epoch.0;
            assert!(
                new_epoch > prev_epoch,
                "new{:?},prev{:?}",
                new_epoch,
                prev_epoch
            );

            let command_ctx = Arc::new(CommandContext::new(
                self.fragment_manager.clone(),
                self.env.stream_client_pool_ref(),
                info,
                prev_epoch,
                new_epoch,
                command,
            ));

            let env = self.env.clone();
            let metrics = self.metrics.clone();
            let hummock_manager = self.hummock_manager.clone();
            let wait_recovery = self.wait_recovery.clone();
            let barrier_send_tx_clone = barrier_send_tx.clone();
            let wait_build_actor = self.wait_build_actor.clone();
            let mut notifiers = notifiers;
            notifiers.iter_mut().for_each(Notifier::notify_to_send);

            self.command_ctx_queue.write().await.push_back(EpochNode{
                result: None,
                states: BarrierEpochState::Pending,
                command_ctx: command_ctx.clone(),
                notifiers: notifiers,
            });
            let command_ctx_queue = self.command_ctx_queue.clone();
            let command_ctx = command_ctx.clone();

            tokio::spawn(async move {
                GlobalBarrierManager::run_inner(
                    env.clone(),
                    metrics,
                    &command_ctx,
                    command_ctx_queue,
                    hummock_manager,
                    wait_recovery,
                    wait_build_actor,
                    barrier_send_tx_clone
                )
                .await;
            });
        }

    }

    /// Running a scheduled command.
    async fn run_inner(
        env: MetaSrvEnv<S>,
        metrics: Arc<MetaMetrics>,
        command_context: &CommandContext<S>,
        command_ctx_queue: Arc<RwLock<VecDeque<EpochNode<S>>>>,
        hummock_manager: HummockManagerRef<S>,
        wait_recovery: Arc<AtomicBool>,
        wait_build_actor: Arc<AtomicBool>,
        barrier_send_tx_clone: UnboundedSender<BarrierSendResult>,
    ) {
        let timer = metrics.barrier_latency.start_timer();

        // Wait for all barriers collected<
        let result = GlobalBarrierManager::inject_barrier(env, command_context).await;

        timer.observe_duration();

        let mut first_is_complete = false;
        {
            let mut command_ctx_queue_clone = command_ctx_queue.write().await;
            command_ctx_queue_clone.iter_mut().find(|x| x.command_ctx.prev_epoch == command_context.prev_epoch).map(|x| {
                x.states = Complete;
                x.result = Some(result);
            });
            first_is_complete = command_ctx_queue_clone.get(0).unwrap().states == Complete;
        }
        if first_is_complete{
            let result = GlobalBarrierManager::try_commit_epoch(command_ctx_queue.clone(), barrier_send_tx_clone.clone(),hummock_manager.clone(),wait_build_actor.clone()).await;
            if result.is_err(){
                wait_recovery.store(true, atomic::Ordering::SeqCst);
                command_ctx_queue.write().await.get_mut(0).unwrap().states = Fail(result.unwrap_err());
            }
        }
        let mut command_ctx_queue_clone = command_ctx_queue.write().await;
        if command_ctx_queue_clone.len() > 0 && matches!(command_ctx_queue_clone.get(0).unwrap().states,Fail(_)){
            let count = command_ctx_queue_clone.iter().filter(|x| matches!(command_ctx_queue_clone.get(0).unwrap().states,Fail(_))|| x.states == Complete).count();
            if count == command_ctx_queue_clone.len(){
                let new_epoch = command_ctx_queue_clone.get(count - 1).unwrap().command_ctx.curr_epoch;

                let mut err_msg = None;
                while let Some(node) = command_ctx_queue_clone.pop_front(){
                    hummock_manager
                        .abort_epoch(node.command_ctx.prev_epoch.0)
                        .await.unwrap();

                    let err = match node.states{
                        Fail(err) =>{err},
                        Complete=>{RwError::from(ErrorCode::InternalError("err from before epoch".to_string()))},
                        _=>{panic!()},
                    };

                    node.notifiers.into_iter().for_each(|notifier| {
                        notifier.notify_collection_failed(err.clone())
                    });
                    if err_msg.is_none(){
                        err_msg = Some(err);
                    }
                    match node.command_ctx.command {
                        Command::Plain(..) => {}
                        _ => {
                            wait_build_actor.store(false, atomic::Ordering::SeqCst);
                        }
                    }
                }
                let err_msg = err_msg.unwrap();
                barrier_send_tx_clone
                    .send(BarrierSendResult::Err {
                        new_epoch,
                        err_msg,
                    })
                    .unwrap();
            }
        }
    }
    async fn try_commit_epoch(
        command_ctx_queue: Arc<RwLock<VecDeque<EpochNode<S>>>>,
        barrier_send_tx_clone: UnboundedSender<BarrierSendResult>,
        hummock_manager: HummockManagerRef<S>,
        wait_build_actor: Arc<AtomicBool>,
    )->Result<()>{
        let mut command_ctx_queue = command_ctx_queue.write().await;
        while let Some(node) = command_ctx_queue.get_mut(0){
            if let Complete = node.states{
                if node.command_ctx.prev_epoch.0 != INVALID_EPOCH {
                    match node.result {
                        Some(Ok(_)) => {
                            // We must ensure all epochs are committed in ascending order, because
                            // the storage engine will query from new to old in the order in which
                            // the L0 layer files are generated. see https://github.com/singularity-data/risingwave/issues/1251
                            hummock_manager
                                .commit_epoch(node.command_ctx.prev_epoch.0)
                                .await?;
                        }
                        Some(Err(_)) => {
                            hummock_manager
                                .abort_epoch(node.command_ctx.prev_epoch.0)
                                .await?;
                        }
                        _=>{
                            panic!();
                        }
                    };
                }
                let responses =node.result.clone().unwrap()?;
                node.command_ctx.post_collect().await?;

                let node = command_ctx_queue.pop_front().unwrap();
                let mut notifiers = node.notifiers;
                let new_epoch = node.command_ctx.curr_epoch;
                // Notify about collected first.
                notifiers.iter_mut().for_each(Notifier::notify_collected);
                // Then try to finish the barrier for Create MVs.
                let actors_to_finish = node.command_ctx.actors_to_finish();
                match node.command_ctx.command {
                    Command::Plain(..) => {}
                    _ => {
                        wait_build_actor.store(false, atomic::Ordering::SeqCst);
                    }
                }
                barrier_send_tx_clone
                    .send(BarrierSendResult::Ok {
                        new_epoch,
                        actors_to_finish,
                        notifiers,
                        responses,
                    })
                    .unwrap();
            }else {
                break;
            }
        };
        return Ok(());
    }

    /// Inject barrier to all computer nodes.
    async fn inject_barrier(
        env: MetaSrvEnv<S>,
        command_context: &CommandContext<S>,
    ) -> Result<Vec<InjectBarrierResponse>> {
        let mutation = command_context.to_mutation().await?;
        let info = &command_context.info;

        let collect_futures = info.node_map.iter().filter_map(|(node_id, node)| {
            let actor_ids_to_send = info.actor_ids_to_send(node_id).collect_vec();
            let actor_ids_to_collect = info.actor_ids_to_collect(node_id).collect_vec();

            if actor_ids_to_collect.is_empty() {
                // No need to send or collect barrier for this node.
                assert!(actor_ids_to_send.is_empty());
                None
            } else {
                let mutation = mutation.clone();
                let request_id = Uuid::new_v4().to_string();
                let barrier = Barrier {
                    epoch: Some(risingwave_pb::data::Epoch {
                        curr: command_context.curr_epoch.0,
                        prev: command_context.prev_epoch.0,
                    }),
                    mutation: Some(mutation),
                    // TODO(chi): add distributed tracing
                    span: vec![],
                };
                let env = env.clone();
                async move {
                    let mut client = env.stream_client_pool().get(node).await?;

                    let request = InjectBarrierRequest {
                        request_id,
                        barrier: Some(barrier),
                        actor_ids_to_send,
                        actor_ids_to_collect,
                    };
                    tracing::trace!(
                        target: "events::meta::barrier::inject_barrier",
                        "inject barrier request: {:?}", request
                    );

                    // This RPC returns only if this worker node has collected this barrier.
                    client
                        .inject_barrier(request)
                        .await
                        .map(tonic::Response::<_>::into_inner)
                        .to_rw_result()
                }
                .into()
            }
        });

        try_join_all(collect_futures).await
    }

    /// Resolve actor information from cluster and fragment manager.
    async fn resolve_actor_info(&self, creating_table_id: Option<TableId>) -> BarrierActorInfo {
        let all_nodes = self
            .cluster_manager
            .list_worker_node(WorkerType::ComputeNode, Some(Running))
            .await;
        let all_actor_infos = self
            .fragment_manager
            .load_all_actors(creating_table_id)
            .await;
        BarrierActorInfo::resolve(all_nodes, all_actor_infos)
    }

    async fn do_schedule(&self, command: Command, notifier: Notifier) -> Result<()> {
        self.scheduled_barriers
            .push((command, once(notifier).collect()))
            .await;
        Ok(())
    }

    /// Schedule a command and return immediately.
    #[allow(dead_code)]
    pub async fn schedule_command(&self, command: Command) -> Result<()> {
        self.do_schedule(command, Default::default()).await
    }

    /// Schedule a command and return when its corresponding barrier is about to sent.
    #[allow(dead_code)]
    pub async fn issue_command(&self, command: Command) -> Result<()> {
        let (tx, rx) = oneshot::channel();
        self.do_schedule(
            command,
            Notifier {
                to_send: Some(tx),
                ..Default::default()
            },
        )
        .await?;
        rx.await.unwrap();

        Ok(())
    }

    /// Run a command and return when it's completely finished.
    pub async fn run_command(&self, command: Command) -> Result<()> {
        let (collect_tx, collect_rx) = oneshot::channel();
        let (finish_tx, finish_rx) = oneshot::channel();

        let is_create_mv = matches!(command, Command::CreateMaterializedView { .. });

        self.do_schedule(
            command,
            Notifier {
                collected: Some(collect_tx),
                finished: Some(finish_tx),
                ..Default::default()
            },
        )
        .await?;

        collect_rx.await.unwrap()?; // Throw the error if it occurs when collecting this barrier.

        // TODO: refactor this
        if is_create_mv {
            // The snapshot ingestion may last for several epochs, we should pin the epoch here.
            // TODO: this should be done in `post_collect`
            let snapshot = self
                .hummock_manager
                .pin_snapshot(META_NODE_ID, HummockEpoch::MAX)
                .await?;
            finish_rx.await.unwrap(); // Wait for this command to be finished.
            self.hummock_manager
                .unpin_snapshot(META_NODE_ID, [snapshot])
                .await?;
        } else {
            finish_rx.await.unwrap(); // Wait for this command to be finished.
        }

        Ok(())
    }

    /// Wait for the next barrier to collect. Note that the barrier flowing in our stream graph is
    /// ignored, if exists.
    pub async fn wait_for_next_barrier_to_collect(&self) -> Result<()> {
        let (tx, rx) = oneshot::channel();
        let notifier = Notifier {
            collected: Some(tx),
            ..Default::default()
        };
        self.scheduled_barriers
            .attach_notifiers(once(notifier))
            .await;
        rx.await.unwrap()
    }
}

pub type BarrierManagerRef<S> = Arc<GlobalBarrierManager<S>>;
