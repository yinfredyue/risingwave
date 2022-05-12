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
import Message from "../components/Message";
import { useEffect, useState } from "react";
import Stack from "@mui/material/Stack";
import type { NextPage } from "next";
import api from "./api/api";
import { Actors } from "./api/interfaces/Actor";
import { MaterializedView } from "./api/interfaces/MaterializedView";
import NoData from "../components/NoData";

const Streaming: NextPage = () => {
  const actorsPath = "api/actors";
  const fragmentsPath = "api/fragments";
  const mViewsPath = "api/materialized_views";

  const [actorProtoList, setActorProtoList] = useState<Actors[]>([]);
  const [mvList, setMvList] = useState<MaterializedView[]>([]);
  const [message, setMessage] = useState("");

  const getData = async (path: string) => {
    try {
      const res = await api.get(path);
      const data = await res?.json();
      return data;
    } catch (err) {
      if (err instanceof Error) {
        console.error(err);
        setMessage(err.message);
      }
    }
  };

  useEffect(() => {
    getData(actorsPath).then((res: Actors[]) => setActorProtoList(res));
    getData(mViewsPath).then((res: MaterializedView[]) => setMvList(res));

    return () => setMessage("");
  }, []);

  return (
    <Stack>
      {message ? <Message severity="error" content={message} /> : null}
      {actorProtoList?.length && actorProtoList[0].actors ? (
        <StreamingView data={actorProtoList} mvList={mvList} />
      ) : (
        <NoData />
      )}
    </Stack>
  );
};

export default Streaming;
