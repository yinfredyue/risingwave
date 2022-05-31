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
import { CanvasEngine } from "@classes/CanvasEngine";

// Disable cache to improve performance.
fabric.Object.prototype.noScaleCache = true;
fabric.Object.prototype.objectCaching = false;
fabric.Object.prototype.statefullCache = false;
fabric.Object.prototype.needsItsOwnCache = () => false;

type FabricObjects = fabric.Object | fabric.Circle | fabric.Rect | fabric.Text;

export type Element = {
  engine: CanvasEngine;
  canvasElement: FabricObjects;
};

export class DrawElement {
  engine: CanvasEngine;
  canvasElement: FabricObjects;
  eventHandler: Map<string, Function>;

  constructor({ canvasElement, engine }: Element) {
    // optimizing performance
    canvasElement.hasBorders = false;
    canvasElement.selectable = false;
    canvasElement.hasControls = false;
    canvasElement.hasRotatingPoint = false;

    engine.canvas.add(canvasElement);
    this.canvasElement = canvasElement;

    this.engine = engine;
    this.eventHandler = new Map();
  }

  // TODO: this method is for migrating from d3.js to fabric.js.
  // This should be replaced by a more suitable way.
  _attrMap(key: string, value: string | number) {
    return [key, value];
  }

  // TODO: this method is for migrating from d3.js to fabric.js.
  // This should be replaced by a more suitable way.
  attr(key: string, value: any) {
    const settings = this._attrMap(key, value);
    if (settings.length === 2) {
      this.canvasElement?.set(settings[0], settings[1]);
    }
    return this;
  }

  _afterPosition() {
    this.canvasElement && this.engine._addDrawElement(this);
  }

  // TODO: this method is for migrating from d3.js to fabric.js.
  // This should be replaced by a more suitable way.
  position(x: number, y: number) {
    this.canvasElement.top = y;
    this.canvasElement.left = x;
    this._afterPosition();
    return this;
  }

  on(event: string, callback: Function) {
    this.eventHandler.set(event, callback);
    return this;
  }

  getEventHandler(event: any) {
    return this.eventHandler.get(event);
  }

  // TODO: this method is for migrating from d3.js to fabric.js.
  // This should be replaced by a more suitable way.
  style(key: any, value: any) {
    return this.attr(key, value);
  }

  classed(clazz: any, flag: any) {
    this.engine.classedElement(clazz, this, flag);
    return this;
  }
}
