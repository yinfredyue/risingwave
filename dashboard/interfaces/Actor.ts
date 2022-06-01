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
import { StreamNode } from "@classes/StreamNode";

export interface Actor {
  actorId: number;
  fragmentId: number;
  nodes: OperatorNode;
  vnodeBitmap: string;
  dispatcher: Dispatcher[];
  upstreamActorId?: number[];
}

export interface ActorProto extends Actor {
  output: StreamNode[];
  computeNodeAddress: string;
  rootNode: StreamNode | null;
  downstreamActorId?: number[];
  representedWorkNodes?: Set<string>;
  representedActorList?: number[];
}

export interface Actors {
  node: ComputeNode;
  actors: Actor[];
}
