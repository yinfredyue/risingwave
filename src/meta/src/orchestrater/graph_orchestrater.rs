/// In Graph Orchestrater, we assume execute_placement() will
/// cause global recovery, so the recovery time is not related
/// with the number of actor to be moved.
pub struct GraphOrchestrater {}

impl GraphOrchestrater {
    pub fn new() -> Self {
        Self {}
    }

    /// Get three mappings
    /// Output: Actor Id -> True Rate
    ///         Actor Id -> CPU Utilization
    ///         <Actor Id, Actor Id> -> Bandwidth
    pub async fn collect_metrics() {}

    /// Get two information
    /// Output: Actor Id -> CN ID
    ///         Stream Graph
    pub async fn collect_cluster_status() {}

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
