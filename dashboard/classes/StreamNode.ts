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
import { BaseNode } from "@classes/BaseNode";
import types from "@classes/types";
import { OperatorNode } from "@interfaces/Node";

export class StreamNode extends BaseNode {
  typeInfo: any; // TODO: abstract typeInfo to key?
  dispatchType?: string;
  type: string | undefined;
  downstreamActorId: number[];

  constructor(
    id: string,
    actorId: number,
    downstreamActorId: number[],
    nodeProto: OperatorNode,
    dispatchType?: string
  ) {
    super(id, actorId, nodeProto);
    this.downstreamActorId = downstreamActorId;

    // Object.keys(nodeProto) are attributes that nodeProto may have
    // StreamNode only has one of them
    this.type = Object.keys(nodeProto).filter((key) => types.has(key))[0];
    this.typeInfo = nodeProto[this.type];
    this.dispatchType = dispatchType;
  }
}
