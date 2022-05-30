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
import { fabric } from "fabric";
import { Text } from "./Text";
import { Circle } from "./Circle";
import { Rectangle } from "./Rectangle";
import { Polygan } from "./Polygan";
import { Path } from "./Path";

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
