use std::collections::{HashMap, HashSet};
use std::hash::Hash;

use risingwave_common::error::{ErrorCode, Result, RwError};

use crate::cluster::{ClusterManagerRef, WorkerId};
use crate::model::ActorId;
use crate::orchestrater::graph::{Edge, Vertex};
use crate::orchestrater::promql_client::PromQlClient;
use crate::orchestrater::scale_client::ScaleClient;
use crate::storage::MetaStore;
use crate::stream::FragmentManagerRef;

/// In Graph Orchestrater, we assume execute_placement() will
/// cause global recovery, so the recovery time is not related
/// with the number of actor to be moved.
pub struct GraphOrchestrater<S: MetaStore> {
    /// Manages definition and status of fragments and actors
    fragment_manager: FragmentManagerRef<S>,
    /// Maintains information of the cluster, WorkerId -> Worker
    cluster_manager: ClusterManagerRef<S>,
    /// Scale in/out
    scale_client: ScaleClient,
    /// Extract metrics
    promql_client: PromQlClient,
}

impl<S> GraphOrchestrater<S>
where
    S: MetaStore,
{
    pub fn new(
        fragment_manager: FragmentManagerRef<S>,
        cluster_manager: ClusterManagerRef<S>,
        scale_address: String,
        promql_address: String,
    ) -> Self {
        Self {
            fragment_manager,
            cluster_manager,
            scale_client: ScaleClient::new(scale_address),
            promql_client: PromQlClient::new(promql_address),
        }
    }

    pub async fn orchestrate(&self) -> Result<()> {
        let (actors, edges) = self.collect_cluster_status().await?;
        let (vertices, edges) = self.collect_metrics(actors, edges).await?;
        Ok(())
    }

    /// Get three mappings
    /// Output: Actor Id -> True Rate
    ///         Actor Id -> CPU Utilization
    ///         <Actor Id, Actor Id> -> Bandwidth
    pub async fn collect_metrics(
        &self,
        actors: HashMap<ActorId, WorkerId>,
        edges: HashMap<ActorId, Vec<ActorId>>,
    ) -> Result<(
        HashMap<ActorId, Vertex>,
        HashMap<ActorId, Vec<(ActorId, Edge)>>,
    )> {
        let mut vertices = HashMap::new();
        let mut edges_with_bandwidth = HashMap::new();
        for (actor_id, worker_id) in actors {
            vertices.insert(
                actor_id,
                Vertex {
                    cpu_utilization: self
                        .promql_client
                        .get_actor_cpu_utilization(actor_id)
                        .await?,
                    process_rate: self.promql_client.get_actor_process_rate(actor_id).await?,
                    output_rate: self.promql_client.get_actor_output_rate(actor_id).await?,
                    worker_id,
                },
            );
        }
        for (actor_id, upstream_actor_ids) in edges {
            let mut bandwidths = vec![];
            for upstream_actor_id in upstream_actor_ids {
                bandwidths.push((
                    upstream_actor_id,
                    Edge(
                        self.promql_client
                            .get_bandwidth(actor_id, upstream_actor_id)
                            .await?,
                    ),
                ));
            }
            edges_with_bandwidth.insert(actor_id, bandwidths);
        }
        Ok((vertices, edges_with_bandwidth))
    }

    /// Get two information
    /// Output: Actor Id -> CN ID
    ///         Stream Graph
    pub async fn collect_cluster_status(
        &self,
    ) -> Result<(HashMap<ActorId, WorkerId>, HashMap<ActorId, Vec<ActorId>>)> {
        let mut actors = HashMap::new();
        let mut edges = HashMap::new();

        let table_fragments_vec = self.fragment_manager.list_table_fragments().await?;
        for table_fragments in table_fragments_vec {
            for (worker_id, actor_states) in table_fragments.node_actor_states() {
                actor_states.into_iter().for_each(|(actor_id, _)| {
                    actors.insert(actor_id, worker_id);
                });
            }
            let topological_order = table_fragments.generate_topological_order();
            for fragment_id in topological_order {
                let fragment = table_fragments.fragments.get(&fragment_id).unwrap();
                let actors = &fragment.actors;
                for actor in actors {
                    edges.insert(actor.actor_id, actor.upstream_actor_id.clone());
                }
            }
        }
        Ok((actors, edges))
    }

    /// Convert Stream Graph to an abstract graph
    /// generate parallelism based on true rate? (how to get SLO)
    /// evaluate a proper CN number
    /// Input: abstract graph,
    ///        Actor Id -> True Rate
    /// Output: Operator -> Parallelism
    ///         new CN number
    ///         new Actor Number
    pub async fn generate_parallelism() {}

    /// Input: Stream Graph,
    ///        Operator -> Parallelism
    /// Output: new Actor
    ///         Actor to Drop
    pub async fn generate_actor() {}

    /// Run graph partitioning
    /// Input: abstract graph,
    ///        Actor Id -> CPU Utilization
    ///        new CN number
    ///        new Actor
    ///        <Actor Id, Actor Id> -> Bandwidth
    /// Output: Actor Id -> CN ID
    pub async fn generate_placement() {}

    /// Call scale to increase/decrease CN
    /// Input: new CN number
    ///        CN to Drop
    pub async fn scale() {}

    /// Place Actors to CN
    /// Input: new Actor
    ///        Actor Id -> CN ID
    ///        Actor to Drop
    pub async fn execute_placement() {}
}
