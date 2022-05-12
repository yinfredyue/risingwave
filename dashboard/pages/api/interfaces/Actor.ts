import { Dispatcher } from "./Dispatcher";
import { Nodes } from "./Node";

export interface Actor {
  actorId: number;
  fragmentId: number;
  nodes: Nodes;
  dispatcher: Dispatcher[];
  upstreamActorId?: number[];
}

export interface Actors {
  node: Node;
  actors: Actors[];
}
