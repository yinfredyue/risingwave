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

pub use anyhow::anyhow;
use risingwave_common::array::ArrayError;
use risingwave_common::error::{ErrorCode, RwError};
use thiserror::Error;
use risingwave_pb::ProstFieldNotFound;

pub type Result<T> = std::result::Result<T, BatchError>;

pub trait Error = std::error::Error + Send + Sync + 'static;

#[derive(Error, Debug)]
pub enum BatchError {
    #[error("Unsupported function: {0}")]
    UnsupportedFunction(String),

    #[error("Can't cast {0} to {1}")]
    Cast(&'static str, &'static str),

    #[error("Array error: {0}")]
    Array(#[from] ArrayError),

    #[error("Out of range")]
    NumericOutOfRange,

    #[error("Failed to send result to channel")]
    SenderError,

    #[error(transparent)]
    Internal(#[from] anyhow::Error),
}

impl From<BatchError> for RwError {
    fn from(s: BatchError) -> Self {
        ErrorCode::BatchError(Box::new(s)).into()
    }
}

impl From<RwError> for BatchError {
    fn from(e: RwError) -> Self {
        BatchError::Internal(anyhow!(e))
    }
}


impl From<ProstFieldNotFound> for BatchError {
    fn from(err: ProstFieldNotFound) -> Self {
        anyhow!("Failed to decode prost: field not found `{}`", err.0).into()
    }
}

impl From<BatchError> for tonic::Status {
    fn from(err: BatchError) -> Self {
        match &*err.inner {
            ErrorCode::OK => tonic::Status::ok(err.to_string()),
            ErrorCode::ExprError(e) => tonic::Status::invalid_argument(e.to_string()),
            ErrorCode::PermissionDenied(e) => tonic::Status::permission_denied(e),
            _ => {
                let bytes = {
                    let status = err.to_status();
                    let mut bytes = Vec::<u8>::with_capacity(status.encoded_len());
                    status.encode(&mut bytes).expect("Failed to encode status.");
                    bytes
                };
                let mut header = MetadataMap::new();
                header.insert_bin(RW_ERROR_GRPC_HEADER, MetadataValue::from_bytes(&bytes));
                tonic::Status::with_metadata(Code::Internal, err.to_string(), header)
            }
        }
    }
}