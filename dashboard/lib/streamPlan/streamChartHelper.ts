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
import { ActorProto, Actors } from "@interfaces/Actor";
import { CanvasEngine } from "@classes/CanvasEngine";
import { StreamChartHelper } from "@classes/StreamChartHelper";
import { Group } from "@classes/Group";
import { fabric } from "fabric";

// Actor constant
//
// =======================================================
//                  ^
//                  | actorBoxPadding
//                  v
//        --┌───────────┐
//        | │      node │
//        | │<--->radius│>───────\
//        | │           │        │
//        | └───────────┘        │
//        |                      │
//        | ┌───────────┐        │         ┌───────────┐
//        | │      node │        │         │      node │
// widthUnit│<--->radius│>───────┼────────>│<--->radius│
//        | │           │        │         │           │
//        | └───────────┘        │         └───────────┘
//        |                      │
//        | ┌───────────┐        │
//        | │      node │        │
//        | │<--->radius│>───────/
//        | │           │
//       ---└───────────┘
//          |-----------------heightUnit---------------|
//

/**
 * Work flow
 *   1. Get the layout for actor boxes (Calculate the base coordination of each actor box)
 *   2. Get the layout for operators in each actor box
 *   3. Draw all actor boxes
 *   4. Draw link between actor boxes
 *
 *
 * Dependencies
 *   layoutActorBox         <- dagLayout         <- drawActorBox      <- drawFlow
 *   [ The layout of the ]     [ The layout of ]    [ Draw an actor ]    [ Draw many actors   ]
 *   [ operators in an   ]     [ actors in a   ]    [ in specified  ]    [ and links between  ]
 *   [ actor.            ]     [ stram plan    ]    [ place         ]    [ them.              ]
 *
 */

/**
 * create a graph view based on raw input from the meta node,
 * and append the canvas component for the giving canvas group.
 */
export default function createView(
  engine: CanvasEngine,
  data: Actors[],
  onNodeClick: Function,
  onActorClick: Function,
  selectedWorkerNode: string,
  shownActorIdList: number[] | null
) {
  const group = new Group({ engine: engine, canvasElement: new fabric.Group() });
  const streamChartHelper = new StreamChartHelper(
    group,
    data,
    onNodeClick,
    onActorClick,
    selectedWorkerNode,
    shownActorIdList
  );

  streamChartHelper.drawManyFlow();
  return streamChartHelper;
}
