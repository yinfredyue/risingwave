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

use std::str::FromStr;

use itertools::Itertools;
use risingwave_common::error::{ErrorCode, RwError};
use risingwave_common::types::DataType;
use risingwave_sqlparser::ast::{
    JoinConstraint, JoinOperator, ObjectName, Query, TableFactor, TableWithJoins, FunctionArg, TableAlias, FunctionArgExpr,
};

use super::{Binder, Relation, Result};
use crate::expr::{ExprImpl, InputRef};
use risingwave_sqlparser::ast::FunctionArg::{Named,Unnamed};

#[derive(Debug)]
pub struct BoundTableFunction {
    pub name: String,       
    pub args: Vec<ExprImpl>, 
    pub alias: Option<String>,
}

impl Binder {
    pub(super) fn bind_table_function(&mut self, name: ObjectName,args: Vec<FunctionArg>,alias: Option<TableAlias>) -> Result<BoundTableFunction> {
        let name=name.0.get(0).unwrap().value.clone();
        let args= args
        .into_iter()
        .map(|arg| self.bind_func_arg_expr(match arg{
            Named{name:_,arg}=>{arg},
            Unnamed(arg)=>{arg},
        }))
        .collect::<Result<_>>()?;
        let alias=alias.map(|value|value.name.value);
        Ok(BoundTableFunction {
            name,
            args,
            alias,
        })
    }

    fn bind_func_arg_expr(&mut self,arg: FunctionArgExpr)->Result<ExprImpl>{
        match arg{
            FunctionArgExpr::Expr(expr)=>Ok(self.bind_expr(expr)?),
            _=>Err(ErrorCode::InternalError("function arg should be expr".into()).into())
        }

    }
}
