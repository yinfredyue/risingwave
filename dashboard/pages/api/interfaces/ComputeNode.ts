import { Host } from "./Host";
import { ParallelUnit } from "./ParallelUnit";

export interface ComputeNode {
  id: Number;
  type: String;
  host: Host;
  state: String;
  parallelUnits: ParallelUnit[];
}
