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
import { CordMapper } from "@classes/CordMapper";

export class GridMapper {
  xMap: CordMapper;
  yMap: CordMapper;
  gs: number;

  constructor() {
    this.xMap = new CordMapper();
    this.yMap = new CordMapper();
    this.gs = 100; // grid size
  }

  _getKey(value: number) {
    return Math.round(value / this.gs);
  }

  addObject(minX: number, maxX: number, minY: number, maxY: number, ele: fabric.Object) {
    for (let i = minX; i <= maxX + this.gs; i += this.gs) {
      this.xMap.insert(this._getKey(i), ele);
    }
    for (let i = minY; i <= maxY + this.gs; i += this.gs) {
      this.yMap.insert(this._getKey(i), ele);
    }
  }

  areaQuery(minX: number, maxX: number, minY: number, maxY: number) {
    let xs = this.xMap.rangeQuery(this._getKey(minX), this._getKey(maxX));
    let ys = this.yMap.rangeQuery(this._getKey(minY), this._getKey(maxY));
    let rtn = new Set();
    xs.forEach((e) => {
      if (ys.has(e)) {
        rtn.add(e);
      }
    });
    return rtn;
  }
}
