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
import React from "react";
import { ComputeNode } from "@interfaces/ComputeNode";
import { FrontendNode } from "@interfaces/FrontendNode";
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
import NoData from "../components/NoData";

type TableNode = FrontendNode | ComputeNode;

type TableProps = {
  data: TableNode[];
};

const NodeTable = ({ data }: TableProps) => {
  return (
    <Box sx={{ width: "100%", maxWidth: 1000 }}>
      {data?.length ? (
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
              {data?.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{row.id}</TableCell>
                  <TableCell sx={{ color: "green" }}>
                    <Stack direction="row" alignItems="center">
                      <StatusLamp color="green" />
                      Running
                    </Stack>
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

export default NodeTable;
