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
import React, { useEffect } from "react";
import { useState, useRef } from "react";
import Message from "../components/Message";
import NoData from "../components/NoData";
import { getClusterInfoFrontend, getClusterInfoComputeNode } from "./api/cluster";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import StatusLamp from "../components/StatusLamp";
import Typography from "@mui/material/Typography";

const NodeTable = (props) => {
  return (
    <Box sx={{ width: "100%", maxWidth: 1000 }}>
      {props.data.length !== 0 ? (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Host</TableCell>
                <TableCell>Post</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {props.data.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{row.id}</TableCell>
                  <TableCell sx={{ color: "green" }}>
                    <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                      <StatusLamp color="green" />
                      Running
                    </div>
                  </TableCell>
                  <TableCell>{row.host.host}</TableCell>
                  <TableCell>{row.host.port}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <NoData />
      )}
    </Box>
  );
};

const Cluster: NextPage = () => {
  const [frontendList, setFrontendList] = useState([]);
  const [computeNodeList, setComputeNodeList] = useState([]);

  const message = useRef(null);

  useEffect(() => {
    const getFrontends = async () => {
      const frontends = await getClusterInfoFrontend();
      return frontends;
    };
    getFrontends()
      .then((res) => setFrontendList(res))
      .catch((e) => {
        message.current.error(e.toString());
        console.error(e);
      });
  }, []);

  useEffect(() => {
    const getComputeNodes = async () => {
      const computeNodes = await getClusterInfoComputeNode();
      return computeNodes;
    };
    getComputeNodes()
      .then((res) => setComputeNodeList(res))
      .catch((e) => {
        message.current.error(e.toString());
        console.error(e);
      });
  }, []);

  return (
    <Stack>
      <Message ref={message} vertical="top" horizontal="center" />
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
