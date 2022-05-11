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
import * as React from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";

const NotFound: NextPage = () => {
  const router = useRouter();

  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          my: 4,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          404 Not Found
        </Typography>
        <Stack direction="row" spacing={8} mt={2}>
          <Button variant="contained" onClick={() => router.push("/")}>
            HOME
          </Button>
          <Button variant="contained" onClick={() => router.back()}>
            Go Back
          </Button>
        </Stack>
      </Box>
    </Container>
  );
};

export default NotFound;
