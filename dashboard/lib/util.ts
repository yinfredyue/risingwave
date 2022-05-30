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

import { NodeOperator } from "@interfaces/Node";
import * as color from "@lib/color";

export function capitalize(sentence: string) {
  const arr = sentence.split(" ").map((x) => x.charAt(0).toUpperCase() + x.slice(1));
  return arr.join(" ");
}

export function iter(n: number, step: Function) {
  for (let i = 0; i < n; ++i) {
    step(i);
  }
}

export function newNumberArray(length: number) {
  const rtn: number[] = [];
  iter(length, () => {
    rtn.push(0);
  });
  return rtn;
}

export function newMatrix(n: number) {
  const rtn: number[][] = [];
  iter(n, () => {
    rtn.push([]);
  });
  return rtn;
}

export function hashIpv4Index(addr: string) {
  const ip = [...addr].filter((x) => !isNaN(+x)).join("");
  return +ip;
}

export function computeNodeAddrToSideColor(addr: string) {
  return color.TwoGradient(hashIpv4Index(addr))[1];
}

/**
 * Construct an id for a node (operator) in an actor box.
 * You may use this method to query and get the svg element
 * of the link.
 */
export function constructOperatorNodeId(node: NodeOperator) {
  return "node-" + node.id;
}

/**
 * Construct an id for a link in actor box.
 * You may use this method to query and get the svg element
 * of the link.
 */
export function constructInternalLinkId(node1: NodeOperator, node2: NodeOperator) {
  return "node-" + (node1.id > node2.id ? node1.id + "-" + node2.id : node2.id + "-" + node1.id);
}
