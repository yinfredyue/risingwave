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
import { Actor, ActorProto, Actors } from "@interfaces/Actor";
import { OperatorNode } from "@interfaces/Node";
import { graphBfs } from "../algo";

let cnt = 0;
function generateNewNodeId() {
  return "g" + ++cnt;
}

function getNodeId(nodeProto: OperatorNode, actorId: number) {
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

class StreamNode extends BaseNode {
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

class Dispatcher extends BaseNode {
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

export default class StreamPlanParser {
  actorId2Proto: Map<number, ActorProto>;
  actorIdToMVNodes: Map<number, any>;
  shownActorSet: Set<number>;
  parsedNodeMap: Map<string, any>;
  parsedActorMap: Map<number, any>;
  parsedActorList: any[];
  fragmentRepresentedActors: Set<any>;
  mvTableIdToSingleViewActorList: Map<any, any>;
  mvTableIdToChainViewActorList: Map<any, any>;

  constructor(datas: Actors[], shownActorList: number[] | null) {
    this.parsedActorList = [];
    this.actorId2Proto = new Map();
    this.parsedNodeMap = new Map();
    this.parsedActorMap = new Map();
    this.actorIdToMVNodes = new Map();
    this.shownActorSet = new Set(shownActorList);

    for (const data of datas) {
      const { host, port } = data.node.host;

      for (const actor of data.actors) {
        if (shownActorList && !this.shownActorSet.has(actor.actorId)) {
          continue;
        }
        const proto: ActorProto = {
          ...actor,
          output: [],
          rootNode: null,
          computeNodeAddress: `${host}:${port}`,
        };

        this.actorId2Proto.set(actor.actorId, proto);
      }
    }

    for (const [_, actorProto] of this.actorId2Proto.entries()) {
      this.parseActor(actorProto);
    }

    for (const [_, actor] of this.parsedActorMap.entries()) {
      this.parsedActorList.push(actor);
    }

    /** @type {Set<Actor>} */
    this.fragmentRepresentedActors = this._constructRepresentedActorList();

    /** @type {Map<number, Array<number>} */
    this.mvTableIdToSingleViewActorList = this._constructSingleViewMvList();

    /** @type {Map<number, Array<number>} */
    this.mvTableIdToChainViewActorList = this._constructChainViewMvList();
  }

  /**
   * Randomly select a actor to represent its fragment,
   * and append a property named `representedActorList`
   * to store all the other actors in the same fragement.
   *
   * Actors are degree of parallelism of a fragment, such that one of
   * the actor in a fragement can represent all the other actor in
   * the same fragment.
   *
   * @returns A Set containing actors representing its fragment.
   */
  _constructRepresentedActorList() {
    const fragmentId2actorList = new Map();
    const fragmentRepresentedActors = new Set();

    for (const actor of this.parsedActorList) {
      if (!fragmentId2actorList.has(actor.fragmentId)) {
        fragmentRepresentedActors.add(actor);
        fragmentId2actorList.set(actor.fragmentId, [actor]);
      } else {
        fragmentId2actorList.get(actor.fragmentId).push(actor);
      }
    }

    for (let actor of fragmentRepresentedActors) {
      actor.representedActorList = fragmentId2actorList
        .get(actor.fragmentId)
        .sort((x) => x.actorId);
      actor.representedWorkNodes = new Set();
      for (let representedActor of actor.representedActorList) {
        representedActor.representedActorList = actor.representedActorList;
        actor.representedWorkNodes.add(representedActor.computeNodeAddress);
      }
    }
    return fragmentRepresentedActors;
  }

  _constructChainViewMvList() {
    let mvTableIdToChainViewActorList = new Map();
    let shellNodes = new Map();
    const getShellNode = (actorId) => {
      if (shellNodes.has(actorId)) {
        return shellNodes.get(actorId);
      }
      let shellNode = {
        id: actorId,
        parentNodes: [],
        nextNodes: [],
      };
      for (let node of this.parsedActorMap.get(actorId).output) {
        let nextNode = getShellNode(node.actorId);
        nextNode.parentNodes.push(shellNode);
        shellNode.nextNodes.push(nextNode);
      }
      shellNodes.set(actorId, shellNode);
      return shellNode;
    };

    for (let actorId of this.actorId2Proto.keys()) {
      getShellNode(actorId);
    }

    for (let [actorId, mviewNode] of this.actorIdToMVNodes.entries()) {
      let list = new Set();
      let shellNode = getShellNode(actorId);
      graphBfs(shellNode, (n) => {
        list.add(n.id);
      });
      graphBfs(
        shellNode,
        (n) => {
          list.add(n.id);
        },
        "parentNodes"
      );
      for (let actor of this.parsedActorMap.get(actorId).representedActorList) {
        list.add(actor.actorId);
      }
      mvTableIdToChainViewActorList.set(mviewNode.typeInfo.tableRefId.tableId, [...list.values()]);
    }

    return mvTableIdToChainViewActorList;
  }

  _constructSingleViewMvList() {
    let mvTableIdToSingleViewActorList = new Map();
    let shellNodes = new Map();
    const getShellNode = (actorId: number) => {
      if (shellNodes.has(actorId)) {
        return shellNodes.get(actorId);
      }
      let shellNode = {
        id: actorId,
        parentNodes: [],
      };
      for (let node of this.parsedActorMap.get(actorId).output) {
        getShellNode(node.actorId).parentNodes.push(shellNode);
      }
      shellNodes.set(actorId, shellNode);
      return shellNode;
    };
    for (let actor of this.parsedActorList) {
      getShellNode(actor.actorId);
    }

    for (let actorId of this.actorId2Proto.keys()) {
      getShellNode(actorId);
    }

    for (let [actorId, mviewNode] of this.actorIdToMVNodes.entries()) {
      let list = [];
      let shellNode = getShellNode(actorId);
      graphBfs(
        shellNode,
        (n) => {
          list.push(n.id);
          if (shellNode.id !== n.id && this.actorIdToMVNodes.has(n.id)) {
            return true; // stop to traverse its next nodes
          }
        },
        "parentNodes"
      );
      for (let actor of this.parsedActorMap.get(actorId).representedActorList) {
        list.push(actor.actorId);
      }
      mvTableIdToSingleViewActorList.set(mviewNode.typeInfo.tableRefId.tableId, list);
    }

    return mvTableIdToSingleViewActorList;
  }

  newDispatcher(actorId: number, type: string, downstreamActorId: number[]) {
    return new Dispatcher(actorId, type, downstreamActorId, {
      operatorId: 100000 + actorId,
    });
  }

  /**
   * Parse raw data from meta node to an ActorProto
   */
  parseActor(actorProto: ActorProto) {
    const actorId = actorProto.actorId;
    if (this.parsedActorMap.has(actorId)) {
      return this.parsedActorMap.get(actorId);
    }

    let rootNode;
    // TODO: optional chaining with filter
    if (actorProto.dispatcher && actorProto.dispatcher[0].type) {
      const { type, downstreamActorId } = actorProto.dispatcher[0];
      rootNode = this.newDispatcher(actorProto.actorId, type, downstreamActorId!);

      const nodeBeforeDispatcher = this.parseNode(actorId, actorProto.nodes);
      rootNode.nextNodes = [nodeBeforeDispatcher];
    } else {
      rootNode = this.parseNode(actorId, actorProto.nodes);
    }
    actorProto.rootNode = rootNode;

    this.parsedActorMap.set(actorId, actorProto);
    return actorProto;
  }

  parseNode(actorId: number, nodeProto: OperatorNode) {
    const id = getNodeId(nodeProto, actorId);
    if (this.parsedNodeMap.has(id)) {
      return this.parsedNodeMap.get(id);
    }

    const newNode = new StreamNode(id, actorId, nodeProto);
    this.parsedNodeMap.set(id, nodeProto);

    // input: OperatorNode, use dfs to parseNode
    if (nodeProto.input) {
      for (const inputNode of nodeProto.input) {
        newNode.nextNodes.push(this.parseNode(actorId, inputNode));
      }
    }

    if (newNode.type === "merge" && newNode.typeInfo.upstreamActorId) {
      for (const actorId of newNode.typeInfo.upstreamActorId) {
        if (this.actorId2Proto.has(actorId)) {
          const actor = this.actorId2Proto.get(actorId);
          this.parseActor(actor!).output.push(newNode);
        }
      }
    }

    // TODO: chain is not with upstreamActors
    if (newNode.type === "chain" && newNode.typeInfo.upstreamActorIds) {
      for (const actorId of newNode.typeInfo.upstreamActorIds) {
        if (this.actorId2Proto.has(actorId)) {
          const actor = this.actorId2Proto.get(actorId);
          this.parseActor(actor!).output.push(newNode);
        }
      }
    }

    if (newNode.type === "materialize") {
      this.actorIdToMVNodes.set(actorId, newNode);
    }

    return newNode;
  }

  getActor(actorId: number) {
    return this.parsedActorMap.get(actorId);
  }

  getOperator(operatorId: string) {
    return this.parsedNodeMap.get(operatorId);
  }

  /**
   * @returns {Array<Actor>}
   */
  getParsedActorList() {
    return this.parsedActorList;
  }
}
