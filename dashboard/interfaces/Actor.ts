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
import { ComputeNode } from "./ComputeNode";
import { Dispatcher } from "./Dispatcher";
import { OperatorNode } from "./Node";

export interface Actor {
  actorId: number;
  fragmentId: number;
  nodes: OperatorNode;
  dispatcher: Dispatcher[];
  upstreamActorId?: number[];
  downstreamActorId?: number[];
}

export interface ActorProto extends Actor {
  computeNodeAddress: string;
  output: OperatorNode[];
  rootNode: OperatorNode | null;
}

export interface Actors {
  node: ComputeNode;
  actors: Actor[];
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

// for stream chart helper
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
  representedWorkNodes: Set<string>;
}
