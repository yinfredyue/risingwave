use risingwave_frontend::binder::Binder;
use risingwave_frontend::planner::Planner;
use risingwave_frontend::session::{OptimizerContext, OptimizerContextRef};
use risingwave_frontend::FrontendOpts;
use risingwave_sqlparser::ast::Statement;

#[macro_use]
extern crate afl;
fn main() {
    fuzz!(|data: &[u8]| {
        let frontend = risingwave_frontend::test_utils::LocalFrontend::new(FrontendOpts::default());
        let session = frontend.session_ref();

        if let Ok(s) = std::str::from_utf8(data) {
            if let Ok(mut statements) = risingwave_sqlparser::parser::Parser::parse_sql(s) {
                for stmt in statements {
                    let context = OptimizerContext::new(session.clone());
                    if matches!(
                        stmt.clone(),
                        Statement::Query(_) | Statement::Insert { .. } | Statement::Delete { .. }
                    ) {
                        let context = OptimizerContextRef::from(context);
                        let session = context.inner().session_ctx.clone();
                        let bound = {
                            let mut binder = Binder::new(
                                session.env().catalog_reader().read_guard(),
                                session.database().to_string(),
                            );
                            match binder.bind(stmt.clone()) {
                                Ok(bound) => bound,
                                Err(err) => {
                                    return;
                                }
                            }
                        };
                        let mut planner = Planner::new(context.clone());

                        let logical_plan = planner.plan(bound);
                        if let Ok(mut logical_plan) = logical_plan {
                            logical_plan.gen_optimized_logical_plan();
                            logical_plan.gen_batch_query_plan();
                            logical_plan.gen_create_mv_plan("test".to_string());
                        }
                    }
                }
            }
        }
    })
}
