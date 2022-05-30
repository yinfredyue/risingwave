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

// TODO: Use rbtree
export class CordMapper {
  map: Map<any, any>;

  constructor() {
    this.map = new Map();
  }

  rangeQuery(start: number, end: number) {
    let rtn = new Set();
    for (let [k, s] of this.map.entries()) {
      if (start <= k && k <= end) {
        s.forEach((v: any) => rtn.add(v));
      }
    }
    return rtn;
  }

  insert(k: number, v: any) {
    if (this.map.has(k)) {
      this.map.get(k).add(v);
    } else {
      this.map.set(k, new Set([v]));
    }
  }
}
