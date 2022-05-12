import { Host } from "./Host";
import { ParallelUnit } from "./ParallelUnit";

export interface ComputeNode {
  id: number;
  type: string;
  host: Host;
  state: string;
  parallelUnits: ParallelUnit[];
}
