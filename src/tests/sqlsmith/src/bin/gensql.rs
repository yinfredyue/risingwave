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

use std::panic;
use std::sync::Arc;

use rand::SeedableRng;
use rand;
use risingwave_frontend::handler::create_table;
use risingwave_frontend::session::{OptimizerContext, SessionImpl};
use risingwave_frontend::test_utils::LocalFrontend;
use risingwave_frontend::FrontendOpts;
use risingwave_sqlparser::ast::Statement;
use risingwave_sqlparser::parser::Parser;
use risingwave_sqlsmith::{sql_gen, Table};

/// Create the tables defined in testdata.
async fn create_tables(session: Arc<SessionImpl>) -> Vec<Table> {
    let sql = std::fs::read_to_string("./src/tests/sqlsmith/tests/testdata/tpch.sql").unwrap();
    let statements =
        Parser::parse_sql(&sql).unwrap_or_else(|_| panic!("Failed to parse SQL: {}", sql));

    let mut tables = vec![];
    for s in statements.into_iter() {
        match s {
            Statement::CreateTable {
                name,
                columns,
                with_options,
                ..
            } => {
                let context = OptimizerContext::new(session.clone(), Arc::from(sql.clone()));
                create_table::handle_create_table(
                    context,
                    name.clone(),
                    columns.clone(),
                    with_options,
                )
                    .await
                    .unwrap();
                tables.push(Table {
                    name: name.0[0].value.clone(),
                    columns: columns.iter().map(|c| c.clone().into()).collect(),
                })
            }
            _ => panic!("Unexpected statement: {}", s),
        }
    }
    tables
}

#[tokio::main(flavor = "multi_thread", worker_threads = 5)]
async fn main() {
    env_logger::init();

    let frontend = LocalFrontend::new(FrontendOpts::default()).await;
    let session = frontend.session_ref();
    let tables = create_tables(session.clone()).await;

    let mut rng = rand::thread_rng();

    // let mut rng = rand::rngs::SmallRng::seed_from_u64(1);

    for _ in 0..1 {
        let sql = sql_gen(&mut rng, tables.clone());
        log::info!("Executing: {}", sql);
        // println!("gen sql: {}", sql);
        // let _ = client.query(sql.as_str(), &[]).await.unwrap();
    }
}
