mod scale_client;
mod graph_orchestrater;

use risingwave_common::error::Result;
use tokio::sync::mpsc::Receiver;
use tokio::sync::oneshot::Sender;
use tokio::task::JoinHandle;

pub struct OrchestraterConfig {
    pub periodically: bool,
    pub interval_ms: u64,
}

pub async fn start_orchestrater(
    config: OrchestraterConfig,
    mut orchestrate_reciver: Receiver<()>,
) -> Result<(JoinHandle<()>, Sender<()>)> {
    let (shutdown_send, mut shutdown_recv) = tokio::sync::oneshot::channel();
    let handler = tokio::spawn(async move {
        let mut min_interval =
            tokio::time::interval(std::time::Duration::from_millis(config.interval_ms));
        min_interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
        loop {
            tokio::select! {
                // Wait for interval
                _ = min_interval.tick() => {
                    if !config.periodically {
                        continue;
                    }
                },
                // Wait for dashboard signal
                _ = orchestrate_reciver.recv() => {},
                // Shutdown
                _ = &mut shutdown_recv => {
                    tracing::info!("orchestrater is shutting down");
                    return;
                }
            }
            // TODO: add scheduling here.
            log::info!("One round of scheduling");
            orchestrate().await;
        }
    });
    Ok((handler, shutdown_send))
}


pub async fn orchestrate() {
    // TODO Run orchestrate
}
