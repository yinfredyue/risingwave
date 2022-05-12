import { Host } from "./Host";
import { ParallelUnit } from "./ParallelUnit";

export interface Node {
  id: Number;
  type: String;
  host: Host;
  state: String;
  parallelUnits: ParallelUnit[];
}
