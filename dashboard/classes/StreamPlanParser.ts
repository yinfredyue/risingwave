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
import { OperatorNode, ShellNode } from "@interfaces/Node";
import { ActorProto, Actors } from "@interfaces/Actor";
import { getNodeId } from "@classes/BaseNode";
import { StreamNode } from "@classes/StreamNode";
import { Dispatcher } from "@classes/Dispatcher";

export default class StreamPlanParser {
  shownActorSet: Set<number>;
  parsedNodeMap: Map<string, any>;
  parsedActorMap: Map<number, any>;
  actorIdToMVNodes: Map<number, any>;
  actorId2Proto: Map<number, ActorProto>;
  fragmentRepresentedActors: Set<ActorProto>;
  mvTableIdToChainViewActorList: Map<any, any>;
  mvTableIdToSingleViewActorList: Map<any, any>;

  constructor(datas: Actors[], shownActorList: number[] | null) {
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

    // TODO:
    // Since all the actorProtos are parsed in actorId2Proto,
    // we dont need parsedActorMap and ~~parsedActorList~~
    for (const actor of this.actorId2Proto.values()) {
      this.parseActor(actor);
    }

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
    const fragmentId2actorList = new Map<number, ActorProto[]>();
    const fragmentRepresentedActors = new Set<ActorProto>();

    for (const actor of this.actorId2Proto.values()) {
      if (!fragmentId2actorList.has(actor.fragmentId)) {
        fragmentRepresentedActors.add(actor);
        fragmentId2actorList.set(actor.fragmentId, [actor]);
      } else {
        fragmentId2actorList.get(actor.fragmentId)!.push(actor);
      }
    }

    for (const actor of this.actorId2Proto.values()) {
      const actors_list = fragmentId2actorList
        .get(actor.fragmentId)!
        .sort((a, b) => a.actorId - b.actorId);
      actor.representedActorList = actors_list;

      actor.representedWorkNodes = new Set();
      for (const representedActor of actor.representedActorList) {
        actor.representedWorkNodes.add(representedActor.computeNodeAddress);
      }
    }
    return fragmentRepresentedActors;
  }

  // TODO:
  _constructChainViewMvList() {
    let mvTableIdToChainViewActorList = new Map();
    let shellNodes = new Map();
    const getShellNode = (actorId: number) => {
      if (shellNodes.has(actorId)) {
        return shellNodes.get(actorId);
      }

      const shellNode: ShellNode = {
        id: actorId,
        parentNodes: [],
        nextNodes: [],
      };

      for (const node of this.parsedActorMap.get(actorId).output) {
        const nextNode = getShellNode(node.actorId);
        nextNode.parentNodes.push(shellNode);
        shellNode.nextNodes?.push(nextNode);
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
      graphBfs(shellNode, (n: any) => {
        list.add(n.id);
      });
      graphBfs(
        shellNode,
        (n: any) => {
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

  // TODO:
  _constructSingleViewMvList() {
    const shellNodes = new Map();
    const mvTableIdToSingleViewActorList = new Map();

    const getShellNode = (actorId: number) => {
      if (shellNodes.has(actorId)) {
        return shellNodes.get(actorId);
      }

      const shellNode: ShellNode = {
        id: actorId,
        parentNodes: [],
      };

      // TODO:
      // what is the type of ActorProto.output? OperatorNode or StreamNode
      console.log("this actor id:", actorId, this.actorId2Proto.get(actorId)!.output);
      for (const node of this.actorId2Proto.get(actorId)!.output) {
        if (node.actorId) {
          const parent = getShellNode(node.actorId);
          parent.parentNodes.push(shellNode);
        }
      }

      shellNodes.set(actorId, shellNode);
      return shellNode;
    };

    for (const actor of this.actorId2Proto.values()) {
      getShellNode(actor.actorId);
    }

    for (const [actorId, mviewNode] of this.actorIdToMVNodes.entries()) {
      const list = [];
      const shellNode = getShellNode(actorId);
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
  parseActor(actorProto: ActorProto): ActorProto {
    const actorId = actorProto.actorId;
    if (this.parsedActorMap.has(actorId)) {
      return this.parsedActorMap.get(actorId);
    }

    let rootNode;
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

    if (nodeProto.input) {
      for (const inputNode of nodeProto.input) {
        newNode.nextNodes.push(this.parseNode(actorId, inputNode));
      }
    }

    if (newNode.type === "merge" && newNode.typeInfo.upstreamActorId) {
      for (const actorId of newNode.typeInfo.upstreamActorId) {
        if (this.actorId2Proto.has(actorId)) {
          const actor = this.actorId2Proto.get(actorId)!;
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
    return [...this.actorId2Proto.values()];
  }
}
