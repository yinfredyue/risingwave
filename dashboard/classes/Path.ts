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
import { DrawElement, Element } from "./DrawElement";

export class Path extends DrawElement {
  strokeWidth: number;

  constructor({ canvasElement, engine }: Element) {
    super({ canvasElement, engine });
    this.strokeWidth = 1;
    super._afterPosition();
  }

  _attrMap(key: string, value: string | number) {
    if (key === "fill") {
      return ["fill", value === "none" ? false : value];
    }
    if (key === "stroke-width") {
      this.canvasElement?.set("top", this.canvasElement?.get("top")! - +value / 2);
      return ["strokeWidth", value];
    }
    if (key === "stroke-dasharray") {
      return ["strokeDashArray", (value as string).split(",")];
    }
    if (key === "layer") {
      if (value === "back") {
        this.canvasElement?.canvas?.sendToBack(this.canvasElement);
      }
      return false;
    }
    return [key, value];
  }
}
