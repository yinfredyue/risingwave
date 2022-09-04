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

use std::fmt;

use itertools::Itertools;
use risingwave_common::catalog::Field;
use risingwave_common::error::{ErrorCode, Result};
use risingwave_common::types::DataType;

use super::logical_agg::PlanAggOrderByField;
use super::{
    ColPrunable, LogicalFilter, PlanBase, PlanRef, PlanTreeNodeUnary, PredicatePushdown, ToBatch,
    ToStream,
};
use crate::expr::{Expr, ExprImpl, InputRef, WindowFunction, WindowFunctionType};
use crate::utils::{ColIndexMapping, Condition};

/// Rewritten version of [`WindowFunction`] which uses `InputRef` instead of `ExprImpl`.
#[derive(Clone)]
pub struct PlanWindowFunction {
    pub function_type: WindowFunctionType,
    pub return_type: DataType,
    pub partition_by: Vec<InputRef>,
    /// TODO: rename & move `PlanAggOrderByField` so that it can be better shared like
    /// [`crate::expr::OrderByExpr`]
    pub order_by: Vec<PlanAggOrderByField>,
}

impl std::fmt::Debug for PlanWindowFunction {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if f.alternate() {
            f.debug_struct("WindowFunction")
                .field("function_type", &self.function_type)
                .field("return_type", &self.return_type)
                .field("partition_by", &self.partition_by)
                .field("order_by", &self.order_by)
                .finish()
        } else {
            write!(f, "{}() OVER(", self.function_type.name())?;

            let mut delim = "";
            if !self.partition_by.is_empty() {
                delim = " ";
                write!(f, "PARTITION BY {}", self.partition_by.iter().format(", "))?;
            }
            if !self.order_by.is_empty() {
                write!(f, "{delim}ORDER BY {:?}", self.order_by.iter().format(", "))?;
            }
            f.write_str(")")?;

            Ok(())
        }
    }
}

/// `LogicalWindowAgg` performs `OVER` window aggregates ([`WindowFunction`]) to its input.
///
/// The output schema is the input schema plus the window functions.
#[derive(Debug, Clone)]
pub struct LogicalWindowAgg {
    pub base: PlanBase,
    pub window_function: PlanWindowFunction,
    input: PlanRef,
}

impl LogicalWindowAgg {
    pub fn new(window_function: PlanWindowFunction, input: PlanRef) -> Self {
        let ctx = input.ctx();
        let mut schema = input.schema().clone();
        schema.fields.push(Field::with_name(
            window_function.return_type.clone(),
            window_function.function_type.name(),
        ));

        let logical_pk = input.logical_pk().to_vec();

        let mapping =
            ColIndexMapping::identity_or_none(input.schema().len(), input.schema().len() + 1);
        let fd_set = input.functional_dependency().clone();
        let fd_set = mapping.rewrite_functional_dependency_set(fd_set);

        let base = PlanBase::new_logical(ctx, schema, logical_pk, fd_set);

        Self {
            base,
            window_function,
            input,
        }
    }

    pub fn create(
        input: PlanRef,
        mut select_exprs: Vec<ExprImpl>,
    ) -> Result<(PlanRef, Vec<ExprImpl>)> {
        let input_len = input.schema().len();
        let mut window_funcs = vec![];
        for expr in &mut select_exprs {
            if let ExprImpl::WindowFunction(f) = expr {
                window_funcs.push(*(f.clone()));
                *expr = InputRef::new(
                    input_len + window_funcs.len() - 1,
                    expr.return_type().clone(),
                )
                .into();
            }
        }
        for f in &window_funcs {
            if f.function_type.is_rank_function() {
                if f.order_by.sort_exprs.is_empty() {
                    return Err(ErrorCode::InvalidInputSyntax(format!(
                        "window rank function without order by: {:?}",
                        f
                    ))
                    .into());
                }
                if f.function_type != WindowFunctionType::RowNumber {
                    return Err(ErrorCode::NotImplemented(
                        format!("window rank function: {}", f.function_type.name()),
                        4847.into(),
                    )
                    .into());
                }
            }
        }
        if window_funcs.len() > 1 {
            return Err(ErrorCode::NotImplemented(
                "Multiple window functions".to_string(),
                None.into(),
            )
            .into());
        }
        let WindowFunction {
            args,
            return_type,
            function_type,
            partition_by,
            order_by,
        } = window_funcs.into_iter().next().unwrap();
        assert!(args.is_empty());
        assert!(return_type == DataType::Int64);

        // TODO: rewrite ORDER BY & PARTITION BY expr to InputRef like `LogicalAgg`
        let order_by = order_by
            .sort_exprs
            .into_iter()
            .map(|e| match e.expr.as_input_ref() {
                Some(i) => Ok(PlanAggOrderByField {
                    input: *i.clone(),
                    direction: e.direction,
                    nulls_first: e.nulls_first,
                }),
                None => Err(ErrorCode::NotImplemented(
                    "ORDER BY expression in window function".to_string(),
                    None.into(),
                )
                .into()),
            })
            .collect::<Result<Vec<_>>>()?;
        let partition_by = partition_by
            .into_iter()
            .map(|e| match e.as_input_ref() {
                Some(i) => Ok(*i.clone()),
                None => Err(ErrorCode::NotImplemented(
                    "PARTITION BY expression in window function".to_string(),
                    None.into(),
                )
                .into()),
            })
            .collect::<Result<Vec<_>>>()?;

        let window_agg = Self::new(
            PlanWindowFunction {
                function_type,
                return_type,
                partition_by,
                order_by,
            },
            input,
        );
        Ok((window_agg.into(), select_exprs))
    }
}

impl PlanTreeNodeUnary for LogicalWindowAgg {
    fn input(&self) -> PlanRef {
        self.input.clone()
    }

    fn clone_with_input(&self, input: PlanRef) -> Self {
        Self::new(self.window_function.clone(), input)
    }
}

impl_plan_tree_node_for_unary! { LogicalWindowAgg }

impl fmt::Display for LogicalWindowAgg {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(
            f,
            "LogicalWindowAgg {{ window_function: {:?} }}",
            self.window_function
        )
    }
}

impl ColPrunable for LogicalWindowAgg {
    fn prune_col(&self, required_cols: &[usize]) -> PlanRef {
        let _ = required_cols;
        self.clone().into()
    }
}

impl PredicatePushdown for LogicalWindowAgg {
    fn predicate_pushdown(&self, predicate: Condition) -> PlanRef {
        LogicalFilter::create(self.clone().into(), predicate)
    }
}

impl ToBatch for LogicalWindowAgg {
    fn to_batch(&self) -> Result<PlanRef> {
        todo!();
    }
}

impl ToStream for LogicalWindowAgg {
    fn to_stream(&self) -> Result<PlanRef> {
        todo!()
    }

    fn logical_rewrite_for_stream(&self) -> Result<(PlanRef, crate::utils::ColIndexMapping)> {
        todo!()
    }
}
