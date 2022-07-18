use tokio::task_local;

task_local! {
    pub static ACTOR_INFO: String;
}
