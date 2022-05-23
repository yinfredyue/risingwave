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

// Disable cache to improve performance.
fabric.Object.prototype.objectCaching = false;
fabric.Object.prototype.statefullCache = false;
fabric.Object.prototype.noScaleCache = true;
fabric.Object.prototype.needsItsOwnCache = () => false;

type Element = {
  canvasElement?: fabric.Object;
  engine: CanvasEngine;
};

export class DrawElement {
  canvasElement: fabric.Object | undefined;
  engine: CanvasEngine;
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
    this.canvasElement = canvasElement;
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

type FuncDispatcher = {
  [key: string]: Function;
  g: Function;
  circle: Function;
  rect: Function;
  text: Function;
  path: Function;
  polygon: Function;
};

export class Group extends DrawElement {
  dispatcher: FuncDispatcher;

  constructor({ canvasElement, engine }: Element) {
    super({ canvasElement, engine });

    this.dispatcher = {
      g: this._appendGroup,
      circle: this._appendCircle,
      rect: this._appendRect,
      text: this._appendText,
      path: this._appendPath,
      polygon: this._appendPolygan,
    };
  }

  _appendGroup = () => {
    const props: Element = {
      engine: this.engine,
    };
    return new Group(props);
  };

  _appendCircle = () => {
    const props: Element = {
      canvasElement: new fabric.Circle({ selectable: false, hoverCursor: "pointer" }),
      engine: this.engine,
    };
    return new Circle(props);
  };

  _appendRect = () => {
    const props: Element = {
      canvasElement: new fabric.Rect({ selectable: false, hoverCursor: "pointer" }),
      engine: this.engine,
    };
    return new Rectangle(props);
  };

  _appendText = () => {
    return (content: string) => {
      // TODO: find a better way to rotate text
      let rotation = -10;
      if (content?.includes("Fragment") || content?.includes(",")) {
        rotation = 0;
      }

      const props: Element = {
        engine: this.engine,
        canvasElement: new fabric.Text(content || "undefined", {
          angle: rotation,
          selectable: false,
          textAlign: "left",
        }),
      };
      return new Text(props);
    };
  };

  _appendPath = () => {
    return (d: string) => {
      const props: Element = {
        engine: this.engine,
        canvasElement: new fabric.Path(d, { selectable: false }),
      };
      return new Path(props);
    };
  };

  _appendPolygan = () => {
    const props: Element = {
      engine: this.engine,
    };
    return new Polygan(props);
  };

  append = (type: string) => {
    return this.dispatcher[type]();
  };
}

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

export class Circle extends DrawElement {
  radius: number;

  constructor({ canvasElement, engine }: Element) {
    super({ canvasElement, engine });
    this.radius = 0;
  }

  init(x: number, y: number, r: number) {
    this.canvasElement?.set("left", x - r);
    this.canvasElement?.set("top", y - r);
    this.canvasElement?.set("radius", r);
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

export class Text extends DrawElement {
  constructor({ canvasElement, engine }: Element) {
    super({ canvasElement, engine });
  }

  position(x: number, y: number) {
    const e = this.canvasElement;
    e?.set("top", y);
    e?.set("left", x);
    super._afterPosition();
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

export class Polygan extends DrawElement {
  constructor({ canvasElement, engine }: Element) {
    super({ canvasElement, engine });
  }
}

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

// TODO: Use rbtree
class CordMapper {
  map: Map<any, any>;

  constructor() {
    this.map = new Map();
  }

  rangeQuery(start, end) {
    let rtn = new Set();
    for (let [k, s] of this.map.entries()) {
      if (start <= k && k <= end) {
        s.forEach((v) => rtn.add(v));
      }
    }
    return rtn;
  }

  insert(k, v) {
    if (this.map.has(k)) {
      this.map.get(k).add(v);
    } else {
      this.map.set(k, new Set([v]));
    }
  }
}

class GridMapper {
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

  addObject(minX: number, maxX: number, minY: number, maxY: number, ele: any) {
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

export class CanvasEngine {
  height: number;
  width: number;
  canvas: fabric.Canvas;
  clazzMap: Map<string, Set<DrawElement>>;
  topGroup: Group;
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
    this.topGroup = new Group({ engine: this });
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
   * Invoke the click hander of an object.
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
      canvasElement.left,
      canvasElement.left + canvasElement.width,
      canvasElement.top,
      canvasElement.top + canvasElement.height,
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
        if (vpt) {
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
    const zoom = this.canvas.getZoom() * 0.999;
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
