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

import { Fragments, ShellNode } from "@interfaces/Node";
import { newMatrix } from "./util";

/**
 * Traverse a tree from its root node, and do operation
 * by calling the step function.
 * Every node will be visted only once.
 * @param {{nextNodes: []}} root The root node of the tree
 * @param {(node: any) => boolean} step callback when a node is visited.
 * return true if you want to stop to traverse its next nodes.
 */
export function treeBfs(root: any, step: Function) {
  const queue = [root];

  while (queue.length) {
    const c = queue.shift();

    if (!step(c)) {
      for (const nextNode of c.nextNodes) {
        queue.push(nextNode);
      }
    }
  }
}

/**
 * Traverse a graph from a random node, and do
 * operation by calling the step function.
 * Every node will be visted only once.
 * @param {{nextNodes: []}} root A random node in the graph
 * @param {(node: any) => boolean} step callback when a node is visited.
 * @param {string} [neighborListKey="nextNodes"]
 * return true if you want to stop traverse its next nodes
 */
export function graphBfs(root: ShellNode, step: Function, neighborListKey?: string) {
  const key = neighborListKey || "nextNodes";
  const vis = new Set();
  const queue = [root];

  while (queue.length) {
    const node = queue.shift()!;
    const descriptor = Object.getOwnPropertyDescriptor(node, key);
    vis.add(node);

    // TODO:
    // temporarily use descriptor to solve Typescript error and get node's values
    // maybe there is better way such as Typescript indexable types
    if (!step(node) && descriptor?.value) {
      for (const nextNode of descriptor?.value) {
        if (!vis.has(nextNode)) {
          queue.push(nextNode);
        }
      }
    }
  }
}

/**
 * Group nodes in the same connected component. The method will not change the input.
 * The output contains the original references.
 * @returns {Array<Array<any>>} A list of groups containing
 * nodes in the same connected component
 */
export function getConnectedComponent(nodes: Fragments[]) {
  const node2shellNodes = new Map();

  for (const node of nodes) {
    // TODO: why???
    const shellNode = {
      val: node,
      nextNodes: [],
      g: -1,
    };
    node2shellNodes.set(node, shellNode);
  }

  // TODO:
  // make a shell non-directed graph from the original DAG.
  for (const node of nodes) {
    const shellNode = node2shellNodes.get(node);
    if (node.nextNodes) {
      for (const nextNode of node.nextNodes) {
        const nextShellNode = node2shellNodes.get(nextNode);
        // ???
        shellNode.nextNodes.push(nextShellNode);
        nextShellNode.nextNodes.push(shellNode);
      }
    }
  }

  // TODO: this is literally an adjacent graph
  console.log("new map", node2shellNodes);

  // bfs assign group number
  // TODO: optimize this
  let cnt = 0;
  for (const shell of node2shellNodes.values()) {
    if (shell.g === -1) {
      shell.g = cnt++;
      graphBfs(shell, (c: any) => {
        c.g = shell.g;
        return false;
      });
    }
  }

  const group = newMatrix(cnt);
  for (const node of node2shellNodes.keys()) {
    const shellNode = node2shellNodes.get(node);
    group[shellNode.g].push(node);
  }

  // TODO: why not use adjacent graph?
  console.log(group);
  return group;
}
