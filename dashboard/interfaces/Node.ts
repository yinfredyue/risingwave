/*
 * Copyright 2022 Singularity Data
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import { Host } from "./Host";
import { ParallelUnit } from "./ParallelUnit";
import { ColumnDesc } from "./Column";

export interface Node {
  id: number;
  type: string;
  host: Host;
  state: string;
  parallelUnits: ParallelUnit[];
}

export interface NodeOperator {
  id: number;
}

// for stream chart helper
export interface WorkerNode {
  type: string;
  host: Host;
  id?: number;
}

export interface DataType {
  typeName: string;
  isNullable: boolean;
}

export interface Field {
  name: string;
  dataType: DataType;
}

export interface Merge {
  fields: Field[];
  upstreamActorId: number[];
}

export interface InputRef {
  columnIdx?: number;
}

export interface Children {
  exprType: string;
  DataType: DataType;
  inputRef: InputRef;
}

export interface FuncCall {
  children: Children[];
}

export interface Condition {
  exprType: string;
  DataType: DataType;
  funcCall: FuncCall;
}

export interface HashJoin {
  joinType?: string;
  leftKey: number[];
  rightKey: number[];
  leftTableId: number;
  rightTableId: number;
  condition?: Condition;
  distributionKeys: number[];
}

export interface TableRefId {
  tableId?: number;
}

export interface HashMapping {
  originalIndices: string[];
  data: number[];
}

export interface BatchPlan {
  tableRefId: TableRefId;
  columnDescs: ColumnDesc[];
  distributionKeys: number[];
  hashMapping: HashMapping;
  parallelUnitId: number;
}

export interface ColumnOrder {
  orderType: string;
  inputRef: InputRef;
  DataType: DataType;
}

export interface Materialize {
  columnIds: number[];
  tableRefId: TableRefId;
  distributionKeys: number[];
  columnOrders: ColumnOrder[];
}

export interface Source {
  tableRefId: TableRefId;
  columnIds: number[];
}

export interface SelectList {
  exprType: string;
  DataType: DataType;
  inputRef: InputRef;
}

export interface Project {
  selectList: SelectList[];
}

export interface Chain {
  columnIds: number[];
  tableRefId: TableRefId;
  upstreamFields: Field[];
}

export interface HashAgg {
  distributionKeys: number[];
  aggCalls: AggCall[];
  tableIds: number[];
}

export interface Arg {
  input: InputRef;
  type: DataType;
}

export interface AggCall {
  type: string;
  returnType: DataType;
  args?: Arg[];
}

export interface OperatorNode {
  chain?: Chain;
  fields: Field[];
  source?: Source;
  identity: string;
  project?: Project;
  hashAgg?: HashAgg;
  operatorId: string;
  pkIndices: number[];
  hashJoin?: HashJoin;
  appendOnly?: boolean;
  batchPlan?: BatchPlan;
  input?: OperatorNode[];
  materialize?: Materialize;
}
