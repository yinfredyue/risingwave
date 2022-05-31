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
import { Group } from "@classes/Group";
import { GridMapper } from "@classes/GridMapper";
import { DrawElement } from "@classes/DrawElement";

export class CanvasEngine {
  height: number;
  width: number;
  canvas: fabric.Canvas;
  clazzMap: Map<string, Set<DrawElement>>;
  // topGroup: Group;
  gridMapper: GridMapper;
  canvasElementToDrawElement: Map<any, any>;
  isDragging: boolean = false;
  selection: boolean = false;
  lastPosX: number | undefined;
  lastPosY: number | undefined;

  constructor(canvasId: string, height: number, width: number) {
    const canvas = new fabric.Canvas(canvasId);
    canvas.selection = false; // improve performance
    canvas.setDimensions({ width: width, height: height });

    this.width = width;
    this.height = height;
    this.clazzMap = new Map();
    this.gridMapper = new GridMapper();
    this.canvasElementToDrawElement = new Map();

    // register mouse event
    canvas.on("mouse:wheel", (opt) => {
      const e = opt.e;
      if (e.ctrlKey) {
        const delta = opt.e.deltaY;
        let zoom = canvas.getZoom();
        zoom *= 0.999 ** delta;
        if (zoom > 10) zoom = 10;
        if (zoom < 0.03) zoom = 0.03;
        canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
        this._refreshView();
        e.preventDefault();
        e.stopPropagation();
      } else {
        this.moveCamera(-e.deltaX, -e.deltaY);
        e.preventDefault();
        e.stopPropagation();
      }
    });

    canvas.on("mouse:down", (opt) => {
      const e = opt.e;
      this.isDragging = true;
      this.selection = false;
      this.lastPosX = e.clientX;
      this.lastPosY = e.clientY;
      if (opt.target) {
        this._handleClickEvent(opt.target);
      }
    });

    canvas.on("mouse:move", (opt) => {
      if (this.isDragging) {
        const e = opt.e;
        this.moveCamera(e.clientX - this.lastPosX!, e.clientY - this.lastPosY!);
        this.lastPosX = e.clientX;
        this.lastPosY = e.clientY;
      }
    });

    canvas.on("mouse:up", (_opt) => {
      canvas.setViewportTransform(canvas.viewportTransform!);
      this.isDragging = false;
      this.selection = true;
    });

    this.canvas = canvas;
    // this.topGroup = new Group({ engine: this, canvasElement: new fabric.Object() });
  }

  async moveCamera(deltaX: number, deltaY: number) {
    this.canvas.setZoom(this.canvas.getZoom()); // essential for rendering (seems like a bug)
    if (this.canvas.viewportTransform) {
      this.canvas.viewportTransform[4] += deltaX;
      this.canvas.viewportTransform[5] += deltaY;
    }
    this._refreshView();
  }

  /**
   * Invoke the click handler of an object.
   */
  async _handleClickEvent(target: fabric.Object | null) {
    if (target) {
      const ele = this.canvasElementToDrawElement.get(target);
      ele.getEventHandler("click") && ele.getEventHandler("click")();
    }
  }

  /**
   * Set the objects in the current view point visible.
   * And set other objects not visible.
   */
  async _refreshView() {
    const padding = 50; // Make the rendering area a little larger.
    const viewPort = this.canvas.viewportTransform;
    const zoom = this.canvas.getZoom();
    const cameraWidth = this.width;
    const cameraHeight = this.height;
    if (viewPort) {
      const minX = -viewPort[4] - padding;
      const maxX = -viewPort[4] + cameraWidth + padding;
      const minY = -viewPort[5] - padding;
      const maxY = -viewPort[5] + cameraHeight + padding;
      const visibleSet = this.gridMapper.areaQuery(
        minX / zoom,
        maxX / zoom,
        minY / zoom,
        maxY / zoom
      );

      this.canvas.getObjects().forEach((e) => {
        if (visibleSet.has(e)) {
          e.visible = true;
        } else {
          e.visible = false;
        }
      });
    }
    this.canvas.requestRenderAll();
  }

  /**
   * Register an element to the engine. This should
   * be called when a DrawElement instance is added
   * to the canvas.
   */
  _addDrawElement(ele: DrawElement) {
    const canvasElement = ele.canvasElement;
    this.canvasElementToDrawElement.set(canvasElement, ele);
    this.gridMapper.addObject(
      canvasElement.left!,
      canvasElement.left! + canvasElement.width!,
      canvasElement.top!,
      canvasElement.top! + canvasElement.height!,
      canvasElement
    );
  }

  /**
   * Assign a class to an object or remove a class from it.
   * @param {string} clazz class name
   * @param {DrawElement} element target object
   * @param {boolean} flag true if the object is assigned, otherwise
   * remove the class from the object
   */
  classedElement(clazz: string, element: DrawElement, flag: boolean) {
    if (!flag) {
      this.clazzMap.has(clazz) && this.clazzMap.get(clazz)?.delete(element);
    } else {
      if (this.clazzMap.has(clazz)) {
        this.clazzMap.get(clazz)?.add(element);
      } else {
        this.clazzMap.set(clazz, new Set([element]));
      }
    }
  }

  /**
   * Move current view point to the object specified by
   * the selector. The selector is the class of the
   * target object for now.
   * @param {string} selector The class of the target object
   */
  locateTo(selector: string) {
    const selectorSet = this.clazzMap.get(selector);
    if (selectorSet) {
      const arr = Array.from<DrawElement>(selectorSet);
      if (arr.length > 0) {
        const x = arr[0].canvasElement.get("left");
        const y = arr[0].canvasElement.get("top");
        // TODO: remove d3 selection
        console.log("d3 get left and top: ", x, y);
        const scale = 1.0;
        this.canvas.setZoom(scale);
        const vpt = this.canvas.viewportTransform;
        if (vpt && x && y) {
          vpt[4] = (-x + this.width * 0.5) * scale;
          vpt[5] = (-y + this.height * 0.5) * scale;
        }
        this.canvas.requestRenderAll();
        this._refreshView();
      }
    }
  }

  /**
   * Move current view point to (0, 0)
   */
  resetCamera() {
    const zoom = this.canvas.getZoom() * 1;
    this.canvas.setZoom(zoom);
    const vpt = this.canvas.viewportTransform;

    if (vpt) {
      vpt[4] = 0;
      vpt[5] = 0;
    }
    this.canvas.requestRenderAll();
    this._refreshView();
  }

  /**
   * Dispose the current canvas. Remove all the objects to
   * free memory. All objects in the canvas will be removed.
   */
  cleanGraph() {
    console.log("clean called", this.canvas);
    try {
      if (this.canvas._objects) {
        this.canvas.dispose();
      }
    } catch (err) {
      console.error(err);
    }
  }

  /**
   * Resize the canvas. This is called when the browser size
   * is changed, such that the canvas can fix the current
   * size of the browser.
   *
   * Note that the outter div box of the canvas will be set
   * according to the parameters. However, the width and
   * height of the canvas is double times of the parameters.
   * This is the feature of fabric.js to keep the canvas
   * in high resolution all the time.
   *
   * @param {number} width the width of the canvas
   * @param {number} height the height of the canvas
   */
  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    if (this.canvas.width && this.canvas.height) {
      this.canvas.setDimensions({ width: this.width, height: this.height });
    }
  }
}
