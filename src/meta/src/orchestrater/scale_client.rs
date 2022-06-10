use anyhow::{anyhow, Ok};
use hyper::{Body, Client, Request, Uri};
use risingwave_common::error::Result;
use serde::{Deserialize, Serialize};

#[derive(Debug)]
pub struct ScaleClient {
    address: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ScaleRequest {
    /// A id to identify this cluster
    pub cluster_id: String,
    /// The target number of compute-nodes in the clutser
    pub target_num: u32,
    /// The list of current compute-nodes' addresses
    pub current_list: Vec<String>,
    /// The list of address to remove from the cluster
    pub remove_list: Vec<String>,
    /// Instance CPU number
    pub cpu: u32,
    /// Instance memory size in GB
    pub memory: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ScaleResponse {
    /// Response message
    pub message: String,
    /// A id to identify this cluster
    pub cluster_id: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ListRequest {
    /// A id to identify this cluster
    pub cluster_id: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ListResponse {
    /// Response message
    pub message: String,
    /// A id to identify this cluster
    pub cluster_id: String,
    /// The list of current compute-nodes' addresses
    pub current_list: Vec<String>,
    /// Instance CPU number
    pub cpu: u32,
    /// Instance memory size in GB
    pub memory: u32,
}

impl ScaleClient {
    pub fn new(address: String) -> Self {
        ScaleClient { address }
    }

    pub async fn scale(&self, request: &ScaleRequest) -> anyhow::Result<()> {
        let client = Client::new();
        let uri_string = format!(r#"http://{}/scale"#, self.address);
        let req = Request::builder()
            .method("POST")
            .uri(uri_string)
            .body(Body::from(serde_json::to_string(request).unwrap()))?;
        let res = client.request(req).await?;
        let body = hyper::body::to_bytes(res.into_body()).await?;
        let response: ScaleResponse = serde_json::from_slice(&body).unwrap();
        if response.message != "success" {
            return Err(anyhow!(
                "Failed to call scale, response: {}",
                serde_json::to_string(&response).unwrap()
            ));
        }
        if response.cluster_id != request.cluster_id {
            return Err(anyhow!(
                "Get response with wrong cluster_id, response: {}, expected cluster_id: {}",
                serde_json::to_string(&response).unwrap(),
                request.cluster_id
            ));
        }
        Ok(())
    }

    pub async fn list(&self, request: &ListRequest) -> anyhow::Result<ListResponse> {
        let client = Client::new();
        let uri_string = format!(r#"http://{}/list"#, self.address);
        let req = Request::builder()
            .method("GET")
            .uri(uri_string)
            .body(Body::from(serde_json::to_string(request).unwrap()))?;
        let res = client.request(req).await?;
        let body = hyper::body::to_bytes(res.into_body()).await?;
        let response: ListResponse = serde_json::from_slice(&body).unwrap();
        if response.message != "success" {
            return Err(anyhow!(
                "Failed to call scale, response: {}",
                serde_json::to_string(&response).unwrap()
            ));
        }
        if response.cluster_id != request.cluster_id {
            return Err(anyhow!(
                "Get response with wrong cluster_id, response: {}, expected cluster_id: {}",
                serde_json::to_string(&response).unwrap(),
                request.cluster_id
            ));
        }
        Ok(response)
    }
}
