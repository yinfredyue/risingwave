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
import { graphBfs } from "lib/algo";
import { OperatorNode } from "@interfaces/Node";
import { Actor, ActorProto, Actors } from "@interfaces/Actor";
import { Dispatcher, getNodeId, StreamNode } from "../lib/streamPlan/parser";

export default class StreamPlanParser {
  parsedActorList: any[];
  shownActorSet: Set<number>;
  parsedNodeMap: Map<string, any>;
  parsedActorMap: Map<number, any>;
  actorIdToMVNodes: Map<number, any>;
  fragmentRepresentedActors: Set<any>;
  actorId2Proto: Map<number, ActorProto>;
  mvTableIdToChainViewActorList: Map<any, any>;
  mvTableIdToSingleViewActorList: Map<any, any>;

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
        console.log("actor:", actor);
        console.log("proto", proto);

        this.actorId2Proto.set(actor.actorId, proto);
      }
    }

    for (const actor of this.actorId2Proto.values()) {
      this.parseActor(actor);
    }

    // TODO:
    // if actorProto is parsed in actorId2Proto,
    // do we still need parsedActorMap and actorActorList?
    for (const [_, actor] of this.parsedActorMap.entries()) {
      this.parsedActorList.push(actor);
    }

    console.log(
      'check if it"s equal: ',
      [...this.actorId2Proto.values()][0],
      this.parsedActorList[0]
    );

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
    const getShellNode = (actorId: number) => {
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
        (n: any) => {
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

      rootNode = new Dispatcher(actorProto.actorId, type, downstreamActorId!, {
        operatorId: 100000 + actorId,
      });

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

  getParsedActorList() {
    return this.parsedActorList;
  }
}
