use prometheus_http_query::Client;
use risingwave_common::error::{ErrorCode, Result, RwError, ToRwResult};

#[derive(Debug)]
pub struct PromQlClient {
    address: String,
}

impl PromQlClient {
    pub fn new(address: String) -> Self {
        Self { address }
    }

    async fn get_actor_througput(&self, actor_id: u32) -> Result<f64> {
        let q = format!(
            r#"rate(stream_actor_row_count{{actor_id="{}"}}[15s])"#,
            actor_id
        );
        self.point_query(q).await
    }

    async fn get_actor_true_rate(&self, actor_id: u32) -> Result<f64> {
        let q = format!(
            r#"increase(stream_actor_row_count{{actor_id="{}"}}[15s]) /
             (increase(stream_actor_schedule_count{{actor_id="{}"}}[15s]) / 1000.0)"#,
            actor_id, actor_id
        );
        self.point_query(q).await
    }

    async fn get_executor_throughput(&self, actor_id: u32, executor_id: String) -> Result<f64> {
        let q = format!(
            r#"rate(executor_output_row_count{{actor_id="{}",executor_id="{}"}}[15s])"#,
            actor_id.to_string(),
            executor_id
        );
        self.point_query(q).await
    }

    async fn get_executor_true_rate(&self, actor_id: u32, executor_id: String) -> Result<f64> {
        let q = format!(
            r#"increase(executor_output_row_count{{actor_id="{}",executor_id="{}"}}[15s]) / 
            (increase(stream_actor_schedule_count{{actor_id="{}"}}[15s]) / 1000.0) "#,
            actor_id.to_string(),
            executor_id,
            actor_id.to_string()
        );
        self.point_query(q).await
    }

    pub async fn get_actor_output_rate(&self, actor_id: u32) -> Result<f64> {
        todo!()
    }

    pub async fn get_actor_process_rate(&self, actor_id: u32) -> Result<f64> {
        todo!()
    }

    pub async fn get_actor_cpu_utilization(&self, actor_id: u32) -> Result<f64> {
        todo!()
    }

    pub async fn get_bandwidth(&self, actor_id: u32, upstream_actor_id: u32) -> Result<f64> {
        todo!()
    }

    pub async fn get_source_throughtput(&self, actor_id: u32) -> Result<f64> {
        todo!()
    }

    async fn point_query(&self, query: String) -> Result<f64> {
        let client = Client::try_from(self.address.clone()).map_err(|e| {
            RwError::from(ErrorCode::InternalError(format!(
                "failed to connect to {}, err {}",
                self.address, e
            )))
        })?;

        let response = client.query(query.clone(), None, None).await;
        let response = response.map_err(|e| {
            RwError::from(ErrorCode::InternalError(format!(
                "failed to query metrics {}, err {}",
                query, e
            )))
        })?;
        let result = response.as_instant();
        let vec = result.unwrap();
        if vec.len() == 1 {
            Ok(vec[0].sample().value())
        } else {
            Err(RwError::from(ErrorCode::InternalError(format!(
                "get wrong metrics from prometheus: {:?}",
                vec
            ))))
        }
    }
}
