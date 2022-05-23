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
import type { NextPage } from "next";
import React, { useEffect, useState } from "react";
import api from "@api/api";
import Message from "@components/Message";
import NodeTable from "@components/NodeTable";
import { FrontendNode } from "@interfaces/FrontendNode";
import { ComputeNode } from "@interfaces/ComputeNode";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import frontendNode from "./mock/0.json";
import computeNode from "./mock/1.json";

const Cluster: NextPage = () => {
  const clusterFrontendPath = "api/clusters/0";
  const clusterComputeNodePath = "api/clusters/1";

  const [message, setMessage] = useState("");
  const [frontendList, setFrontendList] = useState<FrontendNode[]>([]);
  const [computeNodeList, setComputeNodeList] = useState<ComputeNode[]>([]);

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
    setFrontendList(frontendNode);
    setComputeNodeList(computeNode);
    // getData(clusterComputeNodePath).then((res: ComputeNode[]) => setComputeNodeList(res));
    // getData(clusterFrontendPath).then((res: FrontendNode[]) => setFrontendList(res));

    return () => setMessage("");
  }, []);

  return (
    <Stack>
      {message ? <Message severity="error" content={message} /> : null}
      <Stack justifyContent="center" alignItems="flex-start" mt={4}>
        <Typography variant="subtitle1" color="initial">
          Frontend
        </Typography>
        <NodeTable data={frontendList} />
      </Stack>
      <Stack justifyContent="center" alignItems="flex-start" mt={4}>
        <Typography variant="subtitle1" color="initial">
          Compute Node
        </Typography>
        <NodeTable data={computeNodeList} />
      </Stack>
    </Stack>
  );
};

export default Cluster;
