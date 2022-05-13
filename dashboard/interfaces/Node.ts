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

export interface DataType {
  typeName: string;
  isNullable: boolean;
}

export interface Field {
  dataType: DataType;
  name: string;
}

export interface Merge {
  upstreamActorId: number[];
  fields: Field[];
}

export interface ReturnType {
  typeName: string;
  isNullable: boolean;
}

export interface InputRef {
  columnIdx?: number;
}

export interface Children {
  exprType: string;
  returnType: ReturnType;
  inputRef: InputRef;
}

export interface FuncCall {
  children: Children[];
}

export interface Condition {
  exprType: string;
  returnType: ReturnType;
  funcCall: FuncCall;
}

export interface HashJoin {
  joinType?: string;
  leftKey: number[];
  rightKey: number[];
  distributionKeys: number[];
  leftTableId: number;
  rightTableId: number;
  condition?: Condition;
}

export interface Input2 {
  operatorId: string;
  pkIndices: number[];
  identity: string;
  fields: Field[];
  merge: Merge;
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

export interface Input {
  operatorId?: string;
  pkIndices: number[];
  identity: string;
  fields?: Field[];
  merge?: Merge;
  input?: Input2[];
  hashJoin?: HashJoin;
  appendOnly?: boolean;
  batchPlan?: BatchPlan;
}

export interface ColumnOrder {
  orderType: string;
  inputRef: InputRef;
  returnType: ReturnType;
}

export interface Materialize {
  tableRefId: TableRefId;
  columnOrders: ColumnOrder[];
  columnIds: number[];
  distributionKeys: number[];
}

export interface Source {
  tableRefId: TableRefId;
  columnIds: number[];
}

export interface SelectList {
  exprType: string;
  returnType: ReturnType;
  inputRef: InputRef;
}

export interface Project {
  selectList: SelectList[];
}

export interface UpstreamField {
  dataType: DataType;
  name: string;
}

export interface Chain {
  tableRefId: TableRefId;
  upstreamFields: UpstreamField[];
  columnIds: number[];
}

export interface Nodes {
  operatorId: string;
  input?: Input[];
  pkIndices: number[];
  identity: string;
  fields: Field[];
  materialize?: Materialize;
  source?: Source;
  project?: Project;
  chain?: Chain;
}
