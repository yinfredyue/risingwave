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
import { getNodeId } from "@classes/BaseNode";
import { StreamNode } from "@classes/StreamNode";
import { ActorProto, Actors } from "@interfaces/Actor";
import { OperatorNode, ShellNode } from "@interfaces/Node";

export default class StreamPlanParser {
  shownActorSet: Set<number>;
  parsedNodeMap: Map<string, StreamNode>;
  actorId2Proto: Map<number, ActorProto>;
  actorId2MVNodes: Map<number, StreamNode>;
  fragmentRepresentedActors: Set<ActorProto>;
  mvTableIdToChainViewActorList: Map<number, number[]>;
  mvTableIdToSingleViewActorList: Map<number, number[]>;

  constructor(datas: Actors[], shownActorList: number[] | null) {
    this.actorId2Proto = new Map();
    this.parsedNodeMap = new Map();
    this.actorId2MVNodes = new Map();
    this.shownActorSet = new Set(shownActorList);

    // TODO: try to use BFS once to get all the structures
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

    // since all the actorProtos are parsed and stored in actorId2Proto Map,
    // we dont need ~~parsedActorMap~~ and ~~parsedActorList~~
    for (const actor of this.actorId2Proto.values()) {
      this.parseActor(actor);
    }

    this.fragmentRepresentedActors = this._constructRepresentedActorList();
    this.mvTableIdToChainViewActorList = this._constructChainViewMvList();
    this.mvTableIdToSingleViewActorList = this._constructSingleViewMvList();
  }

  getShellNode(
    shellNodes: Map<number, ShellNode>,
    actorId: number,
    next: boolean = true
  ): ShellNode {
    if (shellNodes.has(actorId)) {
      return shellNodes.get(actorId)!;
    }

    const shellNode: ShellNode = {
      id: actorId,
      nextNodes: [],
      parentNodes: [],
    };

    // Use DFS to traversal all nodes to connect links
    // If the node1 has outputs nodes, which is defined in `parseNode`,
    // there exists a link: node1 -> nodes
    for (const node of this.actorId2Proto.get(actorId)!.output) {
      const nextNode = this.getShellNode(shellNodes, node.actorId);
      nextNode.parentNodes.push(shellNode);
      if (next) {
        shellNode.nextNodes?.push(nextNode);
      }
    }

    shellNodes.set(actorId, shellNode);
    return shellNode;
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
      const actorsList = fragmentId2actorList
        .get(actor.fragmentId)!
        .sort((a, b) => a.actorId - b.actorId);

      actor.representedActorList = actorsList;
      actor.representedWorkNodes = new Set();

      for (const representedActor of actor.representedActorList) {
        actor.representedWorkNodes.add(representedActor.computeNodeAddress);
      }
    }
    return fragmentRepresentedActors;
  }

  /**
   * Use ShellNode to pack StreamNodes that is materialize view, and shellNode has parentNodes and nextNodes
   * use BFS to get chain-view list and return a map that maps tableRefId.tableId to chain-view list
   */
  _constructChainViewMvList() {
    const mvTableIdToChainViewActorList = new Map<number, number[]>();
    const shellNodes = new Map<number, ShellNode>();

    for (const actorId of this.actorId2Proto.keys()) {
      this.getShellNode(shellNodes, actorId);
    }

    // when StreamNode.type === 'materalize', actorIdToMvNodes will map actorID to that StreamNode
    for (const MVNode of this.actorId2MVNodes.values()) {
      const actorId = MVNode.actorId;
      const chainViewList = new Set<number>();
      const shellNode = this.getShellNode(shellNodes, MVNode.actorId);

      const func = (node: ShellNode) => {
        chainViewList.add(node.id);
        return false; // TODO: what's the difference between return false and true
      };

      graphBfs(shellNode, func);
      graphBfs(shellNode, func, "parentNodes");

      const representedList = this.actorId2Proto.get(actorId)!.representedActorList!;
      for (const actor of representedList) {
        chainViewList.add(actor.actorId);
      }

      mvTableIdToChainViewActorList.set(MVNode.typeInfo.tableRefId.tableId, [
        ...chainViewList.values(),
      ]);
    }

    return mvTableIdToChainViewActorList;
  }

  /**
   * Use ShellNode to pack StreamNodes that only has parentNodes,
   * use BFS to get single-view list return a map that maps tableRefId.tableId to single-view list
   *
   * TODO:
   * What's the difference between single-view and chain-view anyway
   */
  _constructSingleViewMvList() {
    const shellNodes = new Map<number, ShellNode>();
    const mvTableIdToSingleViewActorList = new Map<number, number[]>();

    for (const actor of this.actorId2Proto.values()) {
      this.getShellNode(shellNodes, actor.actorId, false);
    }

    for (const MVNode of this.actorId2MVNodes.values()) {
      const list = [];
      const actorId = MVNode.actorId;
      const shellNode = this.getShellNode(shellNodes, actorId, false);

      graphBfs(
        shellNode,
        (n: ShellNode) => {
          list.push(n.id);
          if (shellNode?.id !== n.id && this.actorId2MVNodes.has(n.id)) {
            return true; // stop to traverse its next nodes
          }
        },
        "parentNodes"
      );

      const representedList = this.actorId2Proto.get(actorId)!.representedActorList!;
      for (const actor of representedList) {
        list.push(actor.actorId);
      }
      mvTableIdToSingleViewActorList.set(MVNode.typeInfo.tableRefId.tableId, list);
    }

    return mvTableIdToSingleViewActorList;
  }

  /**
   * Parse actors.json data from meta node to an ActorProto
   * with representedActorList and representedWorkNodes
   *
   * since downstreamActorId only appears in dispatcher (./proto/stream_plan.proto)
   */
  parseActor(actorProto: ActorProto): ActorProto {
    let rootNode;
    const actorId = actorProto.actorId;

    if (actorProto.dispatcher && actorProto.dispatcher[0].type) {
      const id = getNodeId(actorProto.nodes, actorId);
      const { type, downstreamActorId } = actorProto.dispatcher[0];

      rootNode = new StreamNode(
        id,
        actorProto.actorId,
        downstreamActorId!,
        {
          operatorId: (100000 + actorId).toString(),
        },
        type
      );

      const nodeBeforeDispatcher = this.parseNode(actorId, actorProto.nodes);
      rootNode.nextNodes = [nodeBeforeDispatcher];
    } else {
      rootNode = this.parseNode(actorId, actorProto.nodes);
    }
    actorProto.rootNode = rootNode!;

    return actorProto;
  }

  /**
   * parse actors.nodes (OperatorNode) to StreamNode,
   * and set typeInfo and nextNodes
   */
  parseNode(actorId: number, nodeProto: OperatorNode) {
    const id = getNodeId(nodeProto, actorId);
    if (this.parsedNodeMap.has(id)) {
      return this.parsedNodeMap.get(id);
    }

    const actorProto = this.actorId2Proto.get(actorId)!;
    const newNode = new StreamNode(
      id,
      actorId,
      actorProto.dispatcher[0].downstreamActorId!,
      nodeProto
    );
    this.parsedNodeMap.set(id, newNode);

    if (nodeProto.input) {
      for (const inputNode of nodeProto.input) {
        newNode.nextNodes.push(this.parseNode(actorId, inputNode));
      }
    }

    if (newNode.type === "merge" && newNode.typeInfo.upstreamActorId) {
      for (const actorId of newNode.typeInfo.upstreamActorId) {
        if (this.actorId2Proto.has(actorId)) {
          this.actorId2Proto.get(actorId)!.output.push(newNode);
        }
      }
    }

    if (newNode.type === "materialize") {
      this.actorId2MVNodes.set(actorId, newNode);
    }

    return newNode;
  }

  getActor(actorId: number) {
    return this.actorId2Proto.get(actorId);
  }

  getOperator(operatorId: string) {
    return this.parsedNodeMap.get(operatorId);
  }

  getParsedActorList() {
    return [...this.actorId2Proto.values()];
  }
}
