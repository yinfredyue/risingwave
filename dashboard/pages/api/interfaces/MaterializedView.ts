import { Column } from "./Column";

export interface MaterializedView {
  id: number;
  name: string;
  columns: Column[];
  orderColumnIds: number[];
  orders: number[];
  distributionKeys: number[];
  pk: number[];
  associatedSourceId?: number;
  dependentRelations?: number[];
}
