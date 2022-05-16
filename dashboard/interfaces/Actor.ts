import { Dispatcher } from "./Dispatcher";
import { Nodes } from "./Node";

export interface Actor {
  actorId: number;
  fragmentId: number;
  dispatcher: Dispatcher[];
  upstreamActorId?: number[];
}

export interface Actors {
  node: Node;
  actors: Actors[];
}

interface StreamNode {
  actorId: number;
  id: string;
  isLeaf: boolean;
  layer: number;
  // nextNodes: Nodes[];
  // nodeProto
  type: string;
  // typeInfo:
  width: number;
  x: number;
  y: number;
}

export interface ActorInfo {
  row: number;
  layer: number;
  actorId: number;
  boxWidth: number;
  boxHeight: number;
  fragmentId: number;
  output: StreamNode[];
  // rootNode: Dispatcher;
  computeNodeAddress: string;
  representedActorList: ActorInfo[];
  representedWorkNodes: Set<ActorInfo>;
}
