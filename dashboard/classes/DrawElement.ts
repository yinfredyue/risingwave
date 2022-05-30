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
fabric.Object.prototype.hasRotatingPoint = false;
fabric.Object.prototype.needsItsOwnCache = () => false;

export type Element = {
  engine: CanvasEngine;
  canvasElement?: fabric.Object;
};

export class DrawElement {
  engine: CanvasEngine;
  canvasElement: fabric.Object;
  eventHandler: Map<any, Function>;

  constructor({ canvasElement, engine }: Element) {
    if (canvasElement) {
      engine.canvas.add(canvasElement);
      // TODO: remove
      canvasElement.on("mouse:down", (e: any) => {
        console.log("canvasElement", e);
      });
    }

    this.engine = engine;
    this.eventHandler = new Map();
    this.canvasElement = canvasElement!;
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
    const ele = this.canvasElement;
    ele && this.engine._addDrawElement(this);
  }

  // TODO: this method is for migrating from d3.js to fabric.js.
  // This should be replaced by a more suitable way.
  position(x: any, y: any) {
    this.canvasElement?.set("left", x);
    this.canvasElement?.set("top", y);
    this._afterPosition();
    return this;
  }

  on(event: any, callback: Function) {
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
