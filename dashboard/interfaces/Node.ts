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
import { ActorProto } from "./Actor";

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
  host: Host;
  id?: number;
  type: string;
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

export interface Constant {
  body: string;
}

export interface Children {
  exprType: string;
  inputRef: InputRef;
  funcCall?: FuncCall;
  constant?: Constant;
  returnType: DataType;
}

export interface FuncCall {
  children: Children[];
}

export interface Condition {
  exprType: string;
  funcCall: FuncCall;
  returnType: DataType;
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
  parallelUnitId: number;
  hashMapping: HashMapping;
  columnDescs: ColumnDesc[];
  distributionKeys: number[];
}

export interface ColumnOrder {
  orderType: string;
  inputRef: InputRef;
  returnType: DataType;
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
  inputRef: InputRef;
  returnType: DataType;
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
  tableIds: number[];
  aggCalls: AggCall[];
  distributionKeys: number[];
}

export interface Arg {
  type: DataType;
  input: InputRef;
}

export interface AggCall {
  args?: Arg[];
  type: string;
  returnType: DataType;
}

export interface TopN {
  columnOrders: ColumnOrder[];
  limit: string;
}

export interface OperatorNode {
  [key: string]: any;
  operatorId?: string;
  topN?: TopN;
  chain?: Chain;
  merge?: Merge;
  fields?: Field[];
  source?: Source;
  filter?: Filter;
  actorId?: number;
  identity?: string;
  project?: Project;
  hashAgg?: HashAgg;
  pkIndices?: number[];
  hashJoin?: HashJoin;
  appendOnly?: boolean;
  batchPlan?: BatchPlan;
  input?: OperatorNode[];
  materialize?: Materialize;
  // TODO: implement AnyScript
  union?: any;
  lookup?: any;
  arrange?: any;
  exchange?: any;
  hopWindow?: any;
  lookupUnion?: any;
  appendOnlyTopN?: any;
  deltaIndexJoin?: any;
  localSimpleAgg?: any;
  globalSimpleAgg?: any;
}

export interface Filter {
  searchCondition: SearchCondition;
}

export interface SearchCondition {
  exprType: string;
  returnType: DataType;
  funcCall: FuncCall;
}

export interface ShellNode {
  id: number;
  nextNodes?: ShellNode[];
  parentNodes: ShellNode[];
}

export interface Fragments extends ShellNode {
  g: number;
  actor: ActorProto;
}
