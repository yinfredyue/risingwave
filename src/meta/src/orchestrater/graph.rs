use crate::cluster::WorkerId;

pub struct Vertex {
    pub cpu_utilization: f64,
    // true processing rate
    pub process_rate: f64,
    // true output rate
    pub output_rate: f64,
    // host node
    pub worker_id: WorkerId,
}

pub struct Edge(pub f64);
