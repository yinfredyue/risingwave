use prometheus_http_query::{Client, Error, RuleType, Selector};

#[derive(Debug)]
pub struct PromSQLClient {
    address: String,
}

impl PromSQLClient {
    fn new(address: String) -> Self {
        Self { address }
    }

    async fn get_actor_througput(&self, actor_id: u32) -> Result<f64, Box<dyn std::error::Error>> {
        let q = format!(
            r#"rate(stream_actor_row_count{{actor_id="{}"}}[15s])"#,
            actor_id
        );
        self.point_query(q).await
    }

    async fn get_actor_true_rate(&self, actor_id: u32) -> Result<f64, Box<dyn std::error::Error>> {
        let q = format!(
            r#"increase(stream_actor_row_count{{actor_id="{}"}}[1d]) /
             (increase(stream_actor_schedule_count{{actor_id="{}"}}[1d]) / 1000.0)"#,
            actor_id, actor_id
        );
        self.point_query(q).await
    }

    async fn get_executor_throughput(
        &self,
        actor_id: u32,
        executor_id: String,
    ) -> Result<f64, Box<dyn std::error::Error>> {
        let q = format!(
            r#"rate(executor_output_row_count{{actor_id="{}",executor_id="{}"}}[15s])"#,
            actor_id.to_string(),
            executor_id
        );
        self.point_query(q).await
    }

    async fn point_query(&self, query: String) -> Result<f64, Box<dyn std::error::Error>> {
        let client = Client::try_from(self.address.clone())?;

        let response = client.query(query, None, None).await?;
        let result = response.as_instant();
        let vec = result.unwrap();
        if vec.len() == 1 {
            Ok(vec[0].sample().value())
        } else {
            Err("Empty query result".into())
        }
    }
}
