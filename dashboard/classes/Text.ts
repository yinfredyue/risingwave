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
import { DrawElement, Element } from "@classes/DrawElement";

export class Text extends DrawElement {
  constructor({ canvasElement, engine }: Element) {
    super({ canvasElement, engine });
  }

  position(x: number, y: number) {
    this.canvasElement.top = y;
    this.canvasElement.left = x;
    this._afterPosition();
    return this;
  }

  _attrMap(key: string, value: string | number) {
    if (key === "text-anchor") {
      return ["textAlign", value];
    }
    if (key === "font-size") {
      return ["fontSize", value];
    }
    return [key, value];
  }

  text(_content: string) {
    return this;
  }

  getWidth() {}
}
