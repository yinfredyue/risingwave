import { HashMapping } from "./HashMapping";

export interface Dispatcher {
  type: string;
  downstreamActorId?: number[];
  columnIndices?: number[];
  hashMapping?: HashMapping;
  dispatcherId?: string;
}
