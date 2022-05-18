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

type SVGElement = {
  canvasElement: d3.Selection<any, any, any, any>;
  engine: any;
};

export class DrawElement {
  props: SVGElement;
  eventHandler: Map<any, any>;

  constructor(props: SVGElement) {
    if (props.canvasElement) {
      props.engine.canvas.add(props.canvasElement);
      props.canvasElement.on("mouse:down", (e) => {
        console.log("canvasElement", e);
      });
    }

    this.props = props;
    this.eventHandler = new Map();
  }

  // TODO: this method is for migrating from d3.js to fabric.js.
  // This should be replaced by a more suitable way.
  _attrMap(key: any, value: any) {
    return [key, value];
  }

  // TODO: this method is for migrating from d3.js to fabric.js.
  // This should be replaced by a more suitable way.
  attr(key: any, value: any) {
    const settings = this._attrMap(key, value);
    if (settings.length === 2) {
      this.props.canvasElement?.set(settings[0], settings[1]);
    }
    return this;
  }

  _afterPosition() {
    const ele = this.props.canvasElement;
    ele && this.props.engine._addDrawElement(this);
  }

  // TODO: this method is for migrating from d3.js to fabric.js.
  // This should be replaced by a more suitable way.
  position(x: any, y: any) {
    this.props.canvasElement?.set("left", x);
    this.props.canvasElement?.set("top", y);
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
    this.props.engine.classedElement(clazz, this, flag);
    return this;
  }
}

export class Group extends DrawElement {
  /**
   * @param {{engine: CanvasEngine}} props
   */
  constructor(props) {
    super(props);

    this.appendFunc = {
      g: this._appendGroup,
      circle: this._appendCircle,
      rect: this._appendRect,
      text: this._appendText,
      path: this._appendPath,
      polygon: this._appendPolygan,
    };

    this.basicSetting = {
      engine: props.engine,
    };
  }

  _appendGroup = () => {
    return new Group(this.basicSetting);
  };

  _appendCircle = () => {
    return new Circle({
      ...this.basicSetting,
      ...{
        canvasElement: new fabric.Circle({ selectable: false, hoverCursor: "pointer" }),
      },
    });
  };

  _appendRect = () => {
    return new Rectangle({
      ...this.basicSetting,
      ...{
        canvasElement: new fabric.Rect({ selectable: false, hoverCursor: "pointer" }),
      },
    });
  };

  _appendText = () => {
    return (content) =>
      new Text({
        ...this.basicSetting,
        ...{
          canvasElement: new fabric.Text(content || "undefined", {
            selectable: false,
            textAlign: "justify-center",
          }),
        },
      });
  };

  _appendPath = () => {
    return (d) =>
      new Path({
        ...this.basicSetting,
        ...{
          canvasElement: new fabric.Path(d, { selectable: false }),
        },
      });
  };

  _appendPolygan = () => {
    return new Polygan(this.basicSetting);
  };

  append = (type) => {
    return this.appendFunc[type]();
  };
}

export class Rectangle extends DrawElement {
  /**
   * @param {{g: fabric.Group}} props
   */
  constructor(props) {
    super(props);
    this.props = props;
  }

  init(x, y, width, height) {
    let ele = this.props.canvasElement;
    ele.set("left", x);
    ele.set("top", y);
    ele.set("width", width);
    ele.set("height", height);
    super._afterPosition();
    return this;
  }

  _attrMap(key, value) {
    if (key === "rx") {
      this.props.canvasElement.set("rx", value);
      this.props.canvasElement.set("ry", value);
      return false;
    }
    return [key, value];
  }
}

export class Circle extends DrawElement {
  /**
   * @param {{svgElement: d3.Selection<SVGCircleElement, any, any, any>}} props
   */
  constructor(props) {
    super(props);
    this.props = props;
    this.radius = 0;
  }

  init(x, y, r) {
    this.props.canvasElement.set("left", x - r);
    this.props.canvasElement.set("top", y - r);
    this.props.canvasElement.set("radius", r);
    super._afterPosition();
    return this;
  }

  _attrMap(key, value) {
    if (key === "r") {
      this.radius = value;
      return ["radius", value];
    }
    if (key === "cx") {
      return ["left", value - this.radius];
    }
    if (key === "cy") {
      return ["top", value - this.radius];
    }
    return [key, value];
  }
}

export class Text extends DrawElement {
  /**
   * @param {{svgElement: d3.Selection<d3.Selection<any, any, any, any>, any, null, undefined>}} props
   */
  constructor(props) {
    super(props);
    this.props = props;
  }

  position(x, y) {
    let e = this.props.canvasElement;
    e.set("top", y);
    e.set("left", x);
    super._afterPosition();
    return this;
  }

  _attrMap(key, value) {
    if (key === "text-anchor") {
      return ["textAlign", value];
    }
    if (key === "font-size") {
      return ["fontSize", value];
    }
    return [key, value];
  }

  text(content) {
    return this;
  }

  getWidth() {}
}

export class Polygan extends DrawElement {
  constructor(props) {
    super(props);
    this.props = props;
  }
}

export class Path extends DrawElement {
  constructor(props) {
    super(props);
    this.props = props;
    this.strokeWidth = 1;
    super._afterPosition();
  }

  _attrMap(key, value) {
    if (key === "fill") {
      return ["fill", value === "none" ? false : value];
    }
    if (key === "stroke-width") {
      this.props.canvasElement.set("top", this.props.canvasElement.get("top") - value / 2);
      return ["strokeWidth", value];
    }
    if (key === "stroke-dasharray") {
      return ["strokeDashArray", value.split(",")];
    }
    if (key === "layer") {
      if (value === "back") {
        this.props.canvasElement.canvas.sendToBack(this.props.canvasElement);
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
  /**
   * @param {string} canvasId The DOM id of the canvas
   * @param {number} height the height of the canvas
   * @param {number} width the width of the canvas
   */
  constructor(canvasId: string, height: number, width: number) {
    const canvas = new fabric.Canvas(canvasId);
    canvas.selection = false; // improve performance

    this.height = height;
    this.width = width;
    this.canvas = canvas;
    this.clazzMap = new Map();
    this.topGroup = new Group({ engine: this });
    this.gridMapper = new GridMapper();
    this.canvasElementToDrawElement = new Map();

    canvas.on("mouse:wheel", (opt) => {
      const e = opt.e;
      if (e.ctrlKey === true) {
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
      this._handleClickEvent(opt.target!);
    });

    canvas.on("mouse:move", (opt) => {
      if (this.isDragging) {
        const e = opt.e;
        this.moveCamera(e.clientX - this.lastPosX, e.clientY - this.lastPosY);
        this.lastPosX = e.clientX;
        this.lastPosY = e.clientY;
      }
    });

    canvas.on("mouse:up", (_opt) => {
      canvas.setViewportTransform(canvas.viewportTransform!);
      this.isDragging = false;
      this.selection = true;
    });
  }

  /**
   * Move the current view point.
   */
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
    const vpt = this.canvas.viewportTransform;
    const zoom = this.canvas.getZoom();
    const cameraWidth = this.width;
    const cameraHeight = this.height;
    if (vpt) {
      const minX = -vpt[4] - padding;
      const maxX = -vpt[4] + cameraWidth + padding;
      const minY = -vpt[5] - padding;
      const maxY = -vpt[5] + cameraHeight + padding;
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
    const canvasElement = ele.props.canvasElement;
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
      this.clazzMap.has(clazz) && this.clazzMap.get(clazz)!.delete(element);
    } else {
      if (this.clazzMap.has(clazz)) {
        this.clazzMap.get(clazz)!.add(element);
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
        const x = arr[0].props.canvasElement.get("left");
        const y = arr[0].props.canvasElement.get("top");
        const scale = 0.6;
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
    console.log("clean called");
    this.canvas?.dispose();
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
    this.canvas.setDimensions({ width: this.width, height: this.height });
  }
}
