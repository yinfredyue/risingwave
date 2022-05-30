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

export class Rectangle extends DrawElement {
  constructor({ canvasElement, engine }: Element) {
    super({ canvasElement, engine });
  }

  init(x: any, y: any, width: any, height: any) {
    const ele = this.canvasElement;
    ele?.set("left", x);
    ele?.set("top", y);
    ele?.set("width", width);
    ele?.set("height", height);
    super._afterPosition();
    return this;
  }

  // TODO:
  _attrMap(key: string, value: string | number) {
    if (key === "rx") {
      this.canvasElement?.set("rx", value);
      this.canvasElement?.set("ry", value);
      return false;
    }
    return [key, value];
  }
}
