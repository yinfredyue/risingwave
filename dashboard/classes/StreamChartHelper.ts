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
import { Group } from "@classes/Group";
import StreamPlanParser from "./StreamPlanParser";
import {
  constructInternalLinkId,
  constructOperatorNodeId,
  hashIpv4Index,
  newNumberArray,
} from "@lib/util";
import { ActorProto, Actors } from "@interfaces/Actor";
import { Fragments, ShellNode, WorkerNode } from "@interfaces/Node";
import { cloneDeep, max } from "lodash";
import { getConnectedComponent, treeBfs } from "@lib/algo";
import { TwoGradient } from "@lib/color";
import { linkHorizontal, curveBasis, line } from "d3-shape";

export class StreamChartHelper {
  topGroup: Group;
  streamPlan: StreamPlanParser;
  onNodeClick: Function;
  onActorClick: Function;
  selectedWorkerNode: string;
  selectedWorkerNodeStr: string;

  constructor(
    group: Group,
    data: Actors[],
    onNodeClick: Function,
    onActorClick: Function,
    selectedWorkerNode: string,
    shownActorIdList: number[] | null
  ) {
    this.topGroup = group;
    this.onNodeClick = onNodeClick;
    this.onActorClick = onActorClick;
    this.selectedWorkerNode = selectedWorkerNode;
    this.selectedWorkerNodeStr = selectedWorkerNode;
    this.streamPlan = new StreamPlanParser(data, shownActorIdList);
  }

  getMvTableIdToSingleViewActorList() {
    return this.streamPlan.mvTableIdToSingleViewActorList;
  }

  getMvTableIdToChainViewActorList() {
    return this.streamPlan.mvTableIdToChainViewActorList;
  }

  isInSelectedActor(actor: ActorProto) {
    if (this.selectedWorkerNodeStr === "Show All") {
      return true;
    } else {
      return actor.representedWorkNodes?.has(this.selectedWorkerNodeStr);
    }
  }

  _mainColor(actor: ActorProto) {
    const addr = actor.representedWorkNodes?.has(this.selectedWorkerNodeStr)
      ? this.selectedWorkerNodeStr
      : actor.computeNodeAddress;
    return TwoGradient(hashIpv4Index(addr))[1];
  }

  _sideColor(actor: ActorProto) {
    const addr = actor.representedWorkNodes?.has(this.selectedWorkerNodeStr)
      ? this.selectedWorkerNodeStr
      : actor.computeNodeAddress;
    return TwoGradient(hashIpv4Index(addr))[1];
  }

  _operatorColor = (actor: ActorProto, operator: WorkerNode) => {
    return this.isInSelectedActor(actor) && operator.type === "mviewNode"
      ? this._mainColor(actor)
      : "#eee";
  };

  _actorBoxBackgroundColor = (actor: ActorProto) => {
    return this.isInSelectedActor(actor) ? this._sideColor(actor) : "#eee";
  };

  _actorOutgoinglinkColor = (actor: ActorProto) => {
    return this.isInSelectedActor(actor) ? this._mainColor(actor) : "#fff";
  };

  //
  // A simple DAG layout algorithm.
  // The layout is built based on two rules.
  // 1. The link should have at two turnning points.
  // 2. The turnning point of a link should be placed
  //    at the margin after the layer of its starting point.
  // -------------------------------------------------------
  // Example 1: (X)-(Z) and (Y)-(Z) is valid.
  // Row 0   (X)---------------->(Z)
  //                         |
  // Row 1                   |
  //                         |
  // Row 2             (Y)---/
  //       Layer 1 | Layer 2 | Layer 3
  // -------------------------------------------------------
  // Example 2: (A)-(B) is not valid.
  // Row 0   (X)   /---------\   (Z)
  //               |         |
  // Row 1   (A)---/   (Y)   |-->(B)
  //
  //       Layer 1 | Layer 2 | Layer 3
  // -------------------------------------------------------
  // Example 3: (C)-(Z) is not valid
  // Row 0   (X)             /-->(Z)
  //                         |
  // Row 1   (C)-------------/
  //
  //        Layer 1 | Layer 2 | Layer 3
  // -------------------------------------------------------
  // Note that the layer of each node can be different
  // For example:
  // Row 0   ( 1)     ( 3)      ( 5)      ( 2)      ( 9)
  // Row 1   ( 4)                         ( 6)      (10)
  // Row 2                                ( 7)      ( 8)
  //       Layer 0 | Layer 1 | Layer 2 | Layer 3 | Layer 4 |
  //
  // Row 0   ( 1)     ( 3)      ( 5)      ( 2)      ( 9)
  // Row 1            ( 4)                ( 6)      (10)
  // Row 2                                ( 7)      ( 8)
  //       Layer 0 | Layer 1 | Layer 2 | Layer 3 | Layer 4 |
  /**
   * Topological sort
   * @param {Array<Node>} nodes An array of node: {nextNodes: [...]}
   * @returns {Map<Node, [number, number]>} position of each node
   */
  dagLayout(nodes: any[]) {
    const node2dagNode = new Map();

    // TODO: refactor by using onetime BFS
    const visit = (n: any) => {
      if (n.temp) {
        throw Error("This is not a DAG");
      }
      if (!n.perm) {
        n.temp = true;
        let maxG = -1;
        for (const nextNode of n.node.nextNodes) {
          node2dagNode.get(nextNode).isInput = false;
          n.isOutput = false;
          const g = visit(node2dagNode.get(nextNode));
          if (g > maxG) {
            maxG = g;
          }
        }
        n.temp = false;
        n.perm = true;
        n.g = maxG + 1;
      }
      return n.g;
    };

    for (const node of nodes) {
      const dagNode = { node: node, temp: false, perm: false, isInput: true, isOutput: true };
      node2dagNode.set(node, dagNode);
    }

    let maxLayer = 0;
    // console.log("before topsort", node2dagNode);
    // TODO: use bfs to maintain g
    for (const node of node2dagNode.values()) {
      const g = visit(node);
      if (g > maxLayer) {
        maxLayer = g;
      }
    }
    // console.log("after topsort", node2dagNode);

    // use the bottom up strategy to construct generation number
    // makes the generation number of root node the samllest
    // to make the computation easier, need to flip it back.
    for (const node of node2dagNode.values()) {
      // node.g = node.isInput ? 0 : (maxLayer - node.g); // TODO: determine which is more suitable
      node.g = maxLayer - node.g;
    }

    const layers: any[] = [];
    const myLayer: any[] = [];

    const topoSort = () => {
      const indegree = new Map<number, number>();
      const edges = this.streamPlan.adjacentFragments;

      for (const [fragmentId, fragment] of edges) {
        if (!indegree.get(fragmentId)) indegree.set(fragmentId, 0);

        if (fragment.nextFragments.length) {
          for (const next of fragment.nextFragments) {
            if (!indegree.get(next)) indegree.set(next, 0);
            indegree.set(next, indegree.get(next)! + 1);
          }
        }
      }

      const queue: number[] = [];
      for (const [fragmentId, ind] of indegree.entries()) {
        if (ind === 0) {
          queue.push(fragmentId);
        }
      }

      let maxLayer = -1;
      while (queue.length) {
        const size = queue.length;
        for (let i = 0; i < size; ++i) {
          if (myLayer[maxLayer + 1] === undefined) {
            myLayer[maxLayer + 1] = {};
            myLayer[maxLayer + 1].fragments = [];
          }
          const fragment = queue.shift()!;

          myLayer[maxLayer + 1].fragments.push(fragment);

          const nextFragments = edges.get(fragment)?.nextFragments!;
          for (const next of nextFragments) {
            indegree.set(next, indegree.get(next)! - 1);
            if (indegree.get(next) === 0) {
              queue.push(next);
            }
          }
        }
        maxLayer++;
      }
      return maxLayer;
    };

    topoSort();
    console.log("myLayer", myLayer);

    for (let i = 0; i < maxLayer + 1; ++i) {
      layers.push({
        nodes: [],
        occupyRow: new Set(),
      });
    }

    console.log("layers", layers);
    const node2Layer = new Map();
    const node2Row = new Map();
    for (const node of node2dagNode.values()) {
      layers[node.g].nodes.push(node.node);
      node2Layer.set(node.node, node.g);
    }

    // layers to rtn
    const rtn = new Map();

    const putNodeInPosition = (node, row) => {
      node2Row.set(node, row);
      layers[node2Layer.get(node)].occupyRow.add(row);
    };

    const occupyLine = (ls: any, le: any, r: any) => {
      // layer start, layer end, row
      for (let i = ls; i <= le; ++i) {
        layers[i].occupyRow.add(r);
      }
    };

    const hasOccupied = (layer: any, row: any) => layers[layer].occupyRow.has(row);

    const isStraightLineOccupied = (ls, le, r) => {
      // layer start, layer end, row
      if (r < 0) {
        return false;
      }
      for (let i = ls; i <= le; ++i) {
        if (hasOccupied(i, r)) {
          return true;
        }
      }
      return false;
    };

    for (const node of nodes) {
      node.nextNodes.sort((a, b) => node2Layer.get(b) - node2Layer.get(a));
    }

    for (const layer of layers) {
      for (const node of layer.nodes) {
        if (!node2Row.has(node)) {
          // checking node is not placed.
          for (let nextNode of node.nextNodes) {
            if (node2Row.has(nextNode)) {
              continue;
            }
            let r = -1;
            while (isStraightLineOccupied(node2Layer.get(node), node2Layer.get(nextNode), ++r)) {}
            putNodeInPosition(node, r);
            putNodeInPosition(nextNode, r);
            occupyLine(node2Layer.get(node) + 1, node2Layer.get(nextNode) - 1, r);
            break;
          }
          if (!node2Row.has(node)) {
            let r = -1;
            while (hasOccupied(node2Layer.get(node), ++r)) {}
            putNodeInPosition(node, r);
          }
        }
        // checking node is placed in some position
        for (let nextNode of node.nextNodes) {
          if (node2Row.has(nextNode)) {
            continue;
          }
          // check straight line position first
          let r = node2Row.get(node);
          if (!isStraightLineOccupied(node2Layer.get(node) + 1, node2Layer.get(nextNode), r)) {
            putNodeInPosition(nextNode, r);
            occupyLine(node2Layer.get(node) + 1, node2Layer.get(nextNode) - 1, r);
            continue;
          }
          // check lowest available position
          r = -1;
          while (isStraightLineOccupied(node2Layer.get(node) + 1, node2Layer.get(nextNode), ++r)) {}
          putNodeInPosition(nextNode, r);
          occupyLine(node2Layer.get(node) + 1, node2Layer.get(nextNode) - 1, r);
        }
      }
    }

    for (const node of nodes) {
      rtn.set(node.id, [node2Layer.get(node), node2Row.get(node)]);
    }
    // console.log("daglayout, rtn", rtn);
    return rtn;
  }

  /**
   * Calculate the position of each node in the actor box.
   * @param {{id: any, nextNodes: [], x: number, y: number}} rootNode The root node of an actor box (dispatcher)
   * @returns {[width, height]} The size of the actor box
   */
  calculateActorBoxSize(rootNode) {
    let rootNodeCopy = cloneDeep(rootNode);
    return this.layoutActorBox(rootNodeCopy, 0, 0);
  }

  /**
   * Calculate the position of each node (operator) in the actor box.
   * This will change the node's position
   * @param {{id: any, nextNodes: [], x: number, y: number}} rootNode The root node of an actor box (dispatcher)
   * @param {number} baseX The x coordination of the top-left corner of the actor box
   * @param {number} baseY The y coordination of the top-left corner of the actor box
   * @returns {[width, height]} The size of the actor box
   */
  layoutActorBox(rootNode, baseX, baseY) {
    // calculate nodes' required width
    let maxLayer = 0;
    const getRequiredWidth = (node, layer) => {
      if (node.width !== undefined) {
        return node.width;
      }

      if (layer > maxLayer) {
        maxLayer = layer;
      }

      node.layer = layer;

      let requiredWidth = 0;
      for (let nextNode of node.nextNodes) {
        requiredWidth += getRequiredWidth(nextNode, layer + 1);
      }

      node.isLeaf = requiredWidth === 0;

      node.width = requiredWidth > 0 ? requiredWidth : widthUnit;

      return node.width;
    };

    getRequiredWidth(rootNode, 0);

    // calculate nodes' position
    rootNode.x = baseX || 0;
    rootNode.y = baseY || 0;
    let leafY = rootNode.x - heightUnit * maxLayer;
    treeBfs(rootNode, (c) => {
      let tmpY = c.y - c.width / 2;
      for (let nextNode of c.nextNodes) {
        nextNode.x = nextNode.isLeaf ? leafY : c.x - heightUnit;
        nextNode.y = tmpY + nextNode.width / 2;
        tmpY += nextNode.width;
      }
    });

    // calculate box size
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    treeBfs(rootNode, (node) => {
      if (node.x > maxX) {
        maxX = node.x;
      }
      if (node.x < minX) {
        minX = node.x;
      }
      if (node.y > maxY) {
        maxY = node.y;
      }
      if (node.y < minY) {
        minY = node.y;
      }
    });
    let boxWidth = maxX - minX;
    let boxHeight = maxY - minY;
    return [boxWidth + actorBoxPadding * 2, boxHeight + actorBoxPadding * 2];
  }

  /**
   * @param {{
   *   g: Group,
   *   rootNode: {id: any, nextNodes: []},
   *   nodeColor: string,
   *   strokeColor?: string,
   *   baseX?: number,
   *   baseY?: number
   * }} props
   * @param {Group} props.g The group element in canvas engine
   * @param {{id: any, nextNodes: []}} props.rootNode The root node of the tree in the actor
   * @param {string} props.nodeColor [optinal] The filled color of nodes.
   * @param {string} props.strokeColor [optinal] The color of the stroke.
   * @param {number} props.baseX [optinal] The x coordination of the lef-top corner. default: 0
   * @param {number} props.baseY [optinal] The y coordination of the lef-top corner. default: 0
   * @returns {Group} The group element of this tree
   */
  drawActorBox(
    _actor: any,
    _g: Group,
    _rootNode: any,
    _x: number,
    _y: number,
    _strokeColor: string,
    _linkColor: string
  ) {
    if (_g === undefined) {
      throw Error("Invalid Argument: Target group cannot be undefined.");
    }

    const actor = _actor;
    const group = _g.append("g").attr("class", actor.computeNodeAddress);
    const rootNode = _rootNode || [];
    const baseX = _x === undefined ? 0 : _x;
    const baseY = _y === undefined ? 0 : _y;
    const strokeColor = _strokeColor || "white";
    const linkColor = _linkColor || "gray";

    const [boxWidth, boxHeight] = this.calculateActorBoxSize(rootNode);
    this.layoutActorBox(rootNode, baseX + boxWidth - actorBoxPadding, baseY + boxHeight / 2);

    const onNodeClicked = (e: any, node: any, actor: any) => {
      this.onNodeClick && this.onNodeClick(e, node, actor);
    };

    const onActorClick = (e: any, actor: any) => {
      this.onActorClick && this.onActorClick(e, actor);
    };

    /**
     * @param {Group} g actor box group
     * @param {number} x top-right corner of the label
     * @param {number} y top-right corner of the label
     * @param {Array<number>} actorIds
     * @param {string} color
     * @returns {number} width of this label
     */
    const drawActorIdLabel = (g: any, x: any, y: any, actorIds: any, color: any) => {
      y = y - actorBoxStroke;
      let actorStr = actorIds.toString();
      let padding = 15;
      // let height = fontSize + 2 * padding;
      let gap = 30;
      // let polygon = g.append("polygon");
      let textEle = g
        .append("text")(actorStr)
        .attr("font-size", fontSize)
        .position(x - padding - 5, y + padding);
      let width = textEle.getWidth() + 2 * padding;
      // polygon.attr("points", `${x},${y} ${x - width - gap},${y}, ${x - width},${y + height}, ${x},${y + height}`)
      //   .attr("fill", color);
      return width + gap;
    };

    // draw box
    group.attr("id", "actor-" + actor.actorId);
    let actorRect = group.append("rect");
    for (const representedActor of actor.representedActorList) {
      actorRect.classed("actor-" + representedActor, true);
    }
    actorRect.classed("fragment-" + actor.fragmentId, true);
    actorRect
      .init(baseX, baseY, boxWidth, boxHeight)
      .attr("fill", this._actorBoxBackgroundColor(actor))
      .attr("rx", actorBoxRadius)
      .attr("stroke-width", actorBoxStroke)
      .on("click", (e: any) => onActorClick(e, actor));

    group
      .append("text")(`Fragment ${actor.fragmentId}`)
      .position(baseX, baseY - actorBoxStroke - fontSize)
      .attr("font-size", fontSize);

    // draw compute node label
    const computeNodeToActorIds = new Map();
    for (const actorId of actor.representedActorList) {
      const representedActor = this.streamPlan.getActor(actorId);
      if (computeNodeToActorIds.has(representedActor?.computeNodeAddress)) {
        computeNodeToActorIds
          .get(representedActor?.computeNodeAddress)
          .push(representedActor?.actorId);
      } else {
        computeNodeToActorIds.set(representedActor?.computeNodeAddress, [
          representedActor?.actorId,
        ]);
      }
    }
    let labelStartX = baseX + actorBoxStroke;
    for (let [addr, actorIds] of computeNodeToActorIds.entries()) {
      let w = drawActorIdLabel(
        group,
        labelStartX,
        baseY + boxHeight,
        actorIds,
        TwoGradient(hashIpv4Index(addr))[1]
      );
      labelStartX -= w;
    }

    // draw links
    const linkData: any[] = [];

    treeBfs(rootNode, (c) => {
      for (let nextNode of c.nextNodes) {
        linkData.push({
          sourceNode: c,
          nextNode: nextNode,
          source: [c.x, c.y],
          target: [nextNode.x, nextNode.y],
        });
      }
    });
    // TODO: find a way to remove d3 and implement own path generator
    const linkGen = linkHorizontal();
    for (let link of linkData) {
      // console.log("linkgen function and link", linkGen(link));
      group
        .append("path")(linkGen(link))
        .attr("stroke-dasharray", `${internalLinkStrokeWidth / 2},${internalLinkStrokeWidth / 2}`)
        .attr("fill", "none")
        .attr("class", "actor-" + actor.actorId)
        .classed("interal-link", true)
        .attr("id", constructInternalLinkId(link.sourceNode, link.nextNode))
        .style("stroke-width", internalLinkStrokeWidth)
        .attr("stroke", linkColor);
    }

    // draw nodes
    treeBfs(rootNode, (node: any) => {
      node.d3Selection = group
        .append("circle")
        .init(node.x, node.y, operatorNodeRadius)
        .attr("id", constructOperatorNodeId(node))
        .attr("stroke", strokeColor)
        .attr("fill", this._operatorColor(actor, node))
        .style("cursor", "pointer")
        .style("stroke-width", operatorNodeStrokeWidth)
        .on("click", (e: any) => onNodeClicked(e, node, actor));
      group
        .append("text")(node.type ? node.type : node.dispatchType)
        .position(node.x, node.y + operatorNodeRadius + 10)
        .attr("font-size", fontSize);
    });

    return {
      g: group,
      x: baseX - boxWidth - actorBoxPadding,
      y: baseY - boxHeight / 2 - actorBoxPadding,
      width: boxWidth + actorBoxPadding * 2,
      height: boxHeight + actorBoxPadding * 2,
    };
  }

  /**
   *
   * @param {{
   *   g: Group,
   *   actorDagList: Array,
   *   baseX?: number,
   *   baseY?: number
   * }} props
   * @param {Group} props.g The target group contains this group.
   * @param {Arrary} props.actorDagList A list of dag nodes constructed from actors
   * { id: actor.actorId, nextNodes: [], actor: actor }
   * @param {number} props.baseX [optional] The x coordination of left-top corner. default: 0.
   * @param {number} props.baseY [optional] The y coordination of left-top corner. default: 0.
   * @returns {{group: Group, width: number, height: number}} The size of the flow
   */
  drawFlow(group: Group, x: any, y: any, list: any) {
    if (group === undefined) {
      throw Error("Invalid Argument: Target group cannot be undefined.");
    }

    const g = group;
    const baseX = x || 0;
    const baseY = y || 0;
    const actorDagList = list || [];
    const layoutPositionMapper = this.dagLayout(actorDagList);
    // console.log("layoutPositionMapper", layoutPositionMapper);

    const actors = [];
    for (const actorDag of actorDagList) {
      actors.push(actorDag.actor);
    }

    // calculate actor box size
    for (const actor of actors) {
      [actor.boxWidth, actor.boxHeight] = this.calculateActorBoxSize(actor.rootNode);
      [actor.layer, actor.row] = layoutPositionMapper.get(actor.actorId);
    }

    // calculate the minimum required width of each layer and row
    let maxRow = 0;
    let maxLayer = 0;
    for (let actor of actors) {
      maxLayer = max([actor.layer, maxLayer]);
      maxRow = max([actor.row, maxRow]);
    }
    let rowGap = newNumberArray(maxRow + 1);
    let layerGap = newNumberArray(maxLayer + 1);
    for (let actor of actors) {
      layerGap[actor.layer] = max([layerGap[actor.layer], actor.boxWidth]);
      rowGap[actor.row] = max([rowGap[actor.row], actor.boxHeight]);
    }
    let row2y = newNumberArray(maxRow + 1);
    let layer2x = newNumberArray(maxLayer + 1);
    row2y = row2y.map((_, r) => {
      if (r === 0) {
        return 0;
      }
      let rtn = 0;
      for (let i = 0; i < r; ++i) {
        rtn += rowGap[i] + gapBetweenRow;
      }
      return rtn;
    });
    layer2x = layer2x.map((_, l) => {
      if (l === 0) {
        return 0;
      }
      let rtn = 0;
      for (let i = 0; i < l; ++i) {
        rtn += layerGap[i] + gapBetweenLayer;
      }
      return rtn;
    });

    // Draw fragment (represent by one actor)
    const appendGourp = g.append("g");
    const linkLayerBackground = appendGourp.append("g");
    const linkLayer = appendGourp.append("g");
    const fragmentLayer = appendGourp.append("g");
    linkLayerBackground.attr("class", "linkLayerBackground");
    linkLayer.attr("class", "linkLayer");
    fragmentLayer.attr("class", "fragmentLayer");

    const actorBoxList = [];
    for (const actor of actors) {
      const actorBox = this.drawActorBox(
        actor,
        fragmentLayer,
        actor.rootNode,
        baseX + layer2x[actor.layer],
        baseY + row2y[actor.row],
        "white",
        "white"
      );
      actorBoxList.push(actorBox);
    }

    // Draw link between (represent by one actor)
    const getLinkBetweenPathStr = (start: any, end: any, compensation: any) => {
      const lineGen = line().curve(curveBasis);
      let pathStr = lineGen([
        end,
        [start[0] + compensation + actorBoxPadding + connectionGap + bendGap * 2, end[1]],
        [start[0] + compensation + actorBoxPadding + connectionGap + bendGap, end[1]],
        [start[0] + compensation + actorBoxPadding + connectionGap + bendGap, start[1]],
        [start[0] + compensation + actorBoxPadding + connectionGap, start[1]],
        start,
      ]);
      return pathStr;
    };

    let linkData = [];
    for (let actor of actors) {
      for (let outputNode of actor.output) {
        linkData.push({
          actor: actor,
          d: getLinkBetweenPathStr(
            [actor.rootNode.x, actor.rootNode.y],
            [outputNode.x, outputNode.y],
            layerGap[actor.layer] - actor.boxWidth
          ),
        });
      }
    }

    for (let s of linkData) {
      linkLayer
        .append("path")(s.d)
        .attr("stroke-dasharray", `${outgoingLinkStrokeWidth},${outgoingLinkStrokeWidth}`)
        .attr("fill", "none")
        .attr("class", "actor-" + s.actor.actorId)
        .classed("outgoing-link", true)
        .style("stroke-width", outgoingLinkStrokeWidth)
        .attr("stroke", this._actorOutgoinglinkColor(s.actor))
        .attr("layer", "back");
    }

    for (let s of linkData) {
      linkLayerBackground
        .append("path")(s.d)
        .attr("fill", "none")
        .style("stroke-width", outgoingLinkBgStrokeWidth)
        .attr("class", "actor-" + s.actor.actorId)
        .classed("outgoing-link-bg", true)
        .attr("stroke", outGoingLinkBgColor)
        .attr("layer", "back");
    }

    // calculate box size
    let width = 0;
    let height = 0;
    for (let actorBox of actorBoxList) {
      let biggestX = actorBox.x - baseX + actorBox.width;
      let biggestY = actorBox.y - baseY + actorBox.height;
      width = max([biggestX, width]);
      height = max([biggestY, height]);
    }

    group.attr("class", "flowchart");
    return {
      g: group,
      width: width,
      height: height,
    };
  }

  /**
   * A flow is an extracted connected component of actors of the raw response from the meta node.
   * This method will first merge actors in the same fragment using some identifier
   * (currently it is the id of the operator before the dispatcher).
   * And then use `drawFlow()` to draw each connected component.
   */
  drawManyFlow() {
    const fragments = this.streamPlan.adjacentFragments;
    // TODO: this is also duplicates, since it just connect actors by fragments and nextNodes
    // get dag layout of these actors
    const dagNodeMap = new Map<number, Fragments>();

    for (const [_, fragment] of fragments.entries()) {
      const { representActors } = fragment;
      const actor = this.streamPlan.getActor(representActors[0])!;
      const shellActor: Fragments = {
        actor: actor,
        nextNodes: [],
        parentNodes: [],
        id: representActors[0],
      };
      dagNodeMap.set(actor.actorId, shellActor);
      // TODO: optimize this structure, since ShellNode already has nextNodes and parentNodes
      // then you can get corresponding Actor by ShellNode id from actorId2Proto or getActor(id)
    }

    for (const [_, fragment] of fragments.entries()) {
      const { representActors } = fragment;
      const actor = this.streamPlan.getActor(representActors[0])!;

      if (actor.output.length) {
        for (const ouputNode of actor.output) {
          const outputDagNode = dagNodeMap.get(ouputNode.actorId);

          if (outputDagNode) {
            // the output actor node is in a represented actor
            dagNodeMap.get(actor.actorId)!.nextNodes!.push(outputDagNode);
          }
        }
      }
    }
    // TODO: is dagNodeMap an adjacent graph??
    console.log("[...dagNodeMap.values()]: ", [...dagNodeMap.values()]);
    // console.log("fragments", fragments);
    // TODO:
    // since the length of dagNodeMap is the same as the number of  fragemenes
    // we can use adjacent graph to replace and then remove dagNodeMap
    const g = this.topGroup.attr("id", "");
    const actorsList = getConnectedComponent([...dagNodeMap.values()]);

    let y = 0;
    for (const actorDagList of actorsList) {
      const flowChart = this.drawFlow(g, 0, y, actorDagList);
      y += flowChart.height + gapBetweenFlowChart;
    }
  }
}

const SCALE_FACTOR = 0.5;

const operatorNodeRadius = 30 * SCALE_FACTOR; // the radius of the tree nodes in an actor
const operatorNodeStrokeWidth = 5 * SCALE_FACTOR; // the stroke width of the link of the tree nodes in an actor
const widthUnit = 230 * SCALE_FACTOR; // the width of a tree node in an actor
const heightUnit = 250 * SCALE_FACTOR; // the height of a tree layer in an actor
const actorBoxPadding = 100 * SCALE_FACTOR; // box padding
const actorBoxStroke = 15 * SCALE_FACTOR; // the width of the stroke of the box
const internalLinkStrokeWidth = 30 * SCALE_FACTOR; // the width of the link between nodes
const actorBoxRadius = 20 * SCALE_FACTOR;

// Stream Plan constant
const gapBetweenRow = 100 * SCALE_FACTOR;
const gapBetweenLayer = 300 * SCALE_FACTOR;
const gapBetweenFlowChart = 500 * SCALE_FACTOR;
const outgoingLinkStrokeWidth = 20 * SCALE_FACTOR;
const outgoingLinkBgStrokeWidth = 40 * SCALE_FACTOR;

// Draw linking effect
const bendGap = 50 * SCALE_FACTOR; // try example at: http://bl.ocks.org/d3indepth/b6d4845973089bc1012dec1674d3aff8
const connectionGap = 20 * SCALE_FACTOR;

// Others
const fontSize = 30 * SCALE_FACTOR;
const outGoingLinkBgColor = "#eee";
