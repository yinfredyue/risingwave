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
import StreamingView from "../components/StreamingView";
import NoData from "../components/NoData";
import Message from "../components/Message";
import { getActors, getMaterializedViews } from "./api/streaming";
import { useEffect, useRef, useState } from "react";

export default function Streaming(props) {
  const [actorProtoList, setActorProtoList] = useState(null);
  const [mvList, setMvList] = useState([]);

  const message = useRef(null);

  useEffect(() => {
    const getActorLists = async () => {
      const actorLists = await getActors();
      return actorLists;
    };
    getActorLists()
      .then((res) => setActorProtoList(res))
      .catch((e) => {
        message.current.error(e.toString());
        console.error(e);
      });
  }, []);

  useEffect(() => {
    const getMVLists = async () => {
      const actorLists = await getMaterializedViews();
      return actorLists;
    };
    getMVLists()
      .then((res) => setMvList(res))
      .catch((e) => {
        message.current.error(e.toString());
        console.error(e);
      });
  }, []);

  return (
    <>
      {actorProtoList && actorProtoList.length !== 0 && actorProtoList[0].actors ? (
        <StreamingView data={actorProtoList} mvList={mvList} />
      ) : (
        <NoData />
      )}
      <Message ref={message} vertical="top" horizontal="center" />
    </>
  );
}
