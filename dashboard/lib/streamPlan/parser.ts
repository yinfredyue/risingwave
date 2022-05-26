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
import { graphBfs } from "../algo";

let cnt = 0;
function generateNewNodeId() {
  return "g" + ++cnt;
}

export function getNodeId(nodeProto: OperatorNode, actorId: number) {
  return `${actorId}:${nodeProto.operatorId ? "o" + nodeProto.operatorId : generateNewNodeId()}`;
}

class BaseNode {
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

const types = new Set([
  "source",
  "project",
  "filter",
  "materialize",
  "localSimpleAgg",
  "globalSimpleAgg",
  "hashAgg",
  "appendOnlyTopN",
  "hashJoin",
  "topN",
  "hopWindow",
  "merge",
  "exchange",
  "chain",
  "batchPlan",
  "lookup",
  "arrange",
  "lookupUnion",
  "union",
  "deltaIndexJoin",
]);

export class StreamNode extends BaseNode {
  type: string | undefined;
  typeInfo: any;

  constructor(id: any, actorId: any, nodeProto: any) {
    super(id, actorId, nodeProto);
    // Object.keys(nodeProto) are attributes that nodeProto have
    // StreamNode only has one of them
    this.type = Object.keys(nodeProto).filter((key) => types.has(key))[0];
    this.typeInfo = nodeProto[this.type];
  }
}

export class Dispatcher extends BaseNode {
  dispatcherType: any;
  downstreamActorId: any;

  constructor(
    actorId: number,
    dispatcherType: string,
    downstreamActorId: number[],
    nodeProto: any
  ) {
    const id = getNodeId(nodeProto, actorId);
    super(id, actorId, nodeProto);
    this.dispatcherType = dispatcherType;
    this.downstreamActorId = downstreamActorId;
  }
}

// export class Actor {
//   constructor(actorId, output, rootNode, fragmentId, computeNodeAddress) {
//     /**
//      * @type {number}
//      */
//     this.actorId = actorId;
//     /**
//      * @type {Array<Node>}
//      */
//     this.output = output;
//     /**
//      * @type {Node}
//      */
//     this.rootNode = rootNode;
//     /**
//      * @type {number}
//      */
//     this.fragmentId = fragmentId;
//     /**
//      * @type {string}
//      */
//     this.computeNodeAddress = computeNodeAddress;
//     /**
//      * @type {Array<Actor>}
//      */
//     this.representedActorList = null;
//     /**
//      * @type {Set<string>}
//      */
//     this.representedWorkNodes = null;
//   }
// }

// interface StreamNode {
//   id: string; // TODO:
//   actorId: number;
//   nodeProto: any;
//   nextNodes: OperatorNode[];
// }
