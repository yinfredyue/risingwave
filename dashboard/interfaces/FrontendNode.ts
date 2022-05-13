import { Host } from "./Host";

export interface FrontendNode {
  id: number;
  host: Host;
  state: string;
}
