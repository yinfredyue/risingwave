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
import { ActorInfo } from "@interfaces/Actor";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import React from "react";

type Props = {
  actor: ActorInfo | null;
};

export function ActorInfoView({ actor }: Props) {
  const generateMessageTraceLink = (actorId: number) => {
    return `http://localhost:16680/search?service=compute&tags=%7B%22actor_id%22%3A%22${actorId}%22%2C%22msg%22%3A%22chunk%22%7D`;
  };

  const generateEpochTraceLink = (actorId: number) => {
    return `http://localhost:16680/search?service=compute&tags=%7B%22actor_id%22%3A%22${actorId}%22%2C%22epoch%22%3A%22-1%22%7D`;
  };

  return (
    <Stack alignItems="center" p={2} width="100%" height="100%" overflow="auto">
      {actor?.representedActorList?.map((act, idx) => (
        <Stack
          key={idx}
          spacing={1}
          width="100%"
          marginBottom={4}
          direction="column"
          justifyContent="center"
          alignItems="center"
        >
          <Typography variant="subtitle1" color="#1976D2">
            Actor {act.actorId}
          </Typography>
          <Link
            target="_blank"
            rel="noopener noreferrer"
            href={generateMessageTraceLink(act.actorId)}
          >
            <Button variant="outlined"> Trace Message of Actor #{act.actorId} </Button>
          </Link>
          <Link
            target="_blank"
            rel="noopener noreferrer"
            href={generateEpochTraceLink(act.actorId)}
          >
            <Button variant="outlined">
              Trace Epoch {"-1"} of Actor #{act.actorId}
            </Button>
          </Link>
        </Stack>
      ))}
    </Stack>
  );
}
