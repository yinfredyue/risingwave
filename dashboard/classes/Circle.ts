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
import { fabric } from "fabric";
import { DrawElement, Element } from "./DrawElement";

export class Circle extends DrawElement {
  radius: number;

  constructor({ canvasElement, engine }: Element) {
    super({ canvasElement, engine });
    this.radius = 0;
  }

  init(x: number, y: number, r: number) {
    this.canvasElement.left = x - r;
    this.canvasElement.top = y - r;
    this.canvasElement?.set("radius", r); // TODO: how to set custom property

    super._afterPosition();
    return this;
  }

  _attrMap(key: string, value: string | number) {
    if (key === "r") {
      this.radius = +value;
      return ["radius", value];
    }
    if (key === "cx") {
      return ["left", +value - this.radius];
    }
    if (key === "cy") {
      return ["top", +value - this.radius];
    }
    return [key, value];
  }
}
