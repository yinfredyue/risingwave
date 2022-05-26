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
import { OperatorNode } from "@interfaces/Node";

let cnt = 0;
function generateNewNodeId() {
  return "g" + ++cnt;
}

export function getNodeId(nodeProto: OperatorNode, actorId: number) {
  return `${actorId}:${nodeProto.operatorId ? "o" + nodeProto.operatorId : generateNewNodeId()}`;
}

export class BaseNode {
  id: any;
  actorId: any;
  nodeProto: any;
  nextNodes: any[];

  constructor(id: any, actorId: any, nodeProto: any) {
    this.id = id; //operatorId
    this.nextNodes = [];
    this.actorId = actorId;
    this.nodeProto = nodeProto;
  }
}
