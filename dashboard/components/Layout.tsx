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
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";

import Box from "@mui/material/Box";
import List from "@mui/material/List";
import Stack from "@mui/material/Stack";
import Drawer from "@mui/material/Drawer";
import Toolbar from "@mui/material/Toolbar";
import Divider from "@mui/material/Divider";
import MenuIcon from "@mui/icons-material/Menu";
import InfoIcon from "@mui/icons-material/Info";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import CssBaseline from "@mui/material/CssBaseline";
import ListItemIcon from "@mui/material/ListItemIcon";
import { styled, useTheme } from "@mui/material/styles";
import ListItemButton from "@mui/material/ListItemButton";
import ViewComfyIcon from "@mui/icons-material/ViewComfy";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import DoubleArrowIcon from "@mui/icons-material/DoubleArrow";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import MuiAppBar, { AppBarProps as MuiAppBarProps } from "@mui/material/AppBar";

import { capitalize } from "../lib/str";
import { NavItems } from "@interfaces/Items";
import { LayoutProps } from "@interfaces/LayoutProps";

interface AppBarProps extends MuiAppBarProps {
  open?: boolean;
  drawerwidth?: number;
  mainpadding?: number;
}

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})<AppBarProps>(({ theme, open, drawerwidth }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(["width", "margin"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerwidth,
    width: `calc(100% - ${drawerwidth}px)`,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const Main = styled("main", { shouldForwardProp: (prop) => prop !== "open" })<AppBarProps>(
  ({ theme, open, drawerwidth, mainpadding }) => ({
    height: "100%",
    width: "100%",
    flexGrow: 1,
    padding: mainpadding,
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: `-${drawerwidth}px`,
    ...(open && {
      transition: theme.transitions.create("margin", {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
    }),
  })
);

const DrawerHeader = styled("div")<AppBarProps>(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: "space-between",
}));

const NavBarItem = ({ text, icon, currentPage, setCurrentPage }: NavItems) => {
  const router = useRouter();

  return (
    <ListItemButton
      key={text}
      selected={currentPage === text}
      onClick={() => {
        setCurrentPage(text);
        router.push(text);
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="center">
        <ListItemIcon>{icon}</ListItemIcon>
        <span style={{ fontSize: "15px" }}>{capitalize(text)}</span>
      </Stack>
    </ListItemButton>
  );
};

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const theme = useTheme();
  const [open, setOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState("");

  useEffect(() => {
    if (router.pathname !== "/") {
      setCurrentPage(router.pathname.slice(1));
    } else {
      setCurrentPage("Home");
    }
  }, [router]);

  const handleDrawerClose = () => {
    setOpen(false);
  };

  return (
    <Box sx={{ display: "flex", height: "100vh", width: "100vw" }}>
      <CssBaseline />
      <AppBar open={open} drawerwidth={240}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="open drawer"
            onClick={() => setOpen(true)}
            sx={{ mr: 2, ...(open && { display: "none" }) }}
          >
            <MenuIcon />
          </IconButton>
          <Typography component="h1" variant="h6">
            {capitalize(currentPage)}
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        sx={{
          width: 240,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: 240,
            boxSizing: "border-box",
          },
        }}
        variant="persistent"
        anchor="left"
        open={open}
      >
        <DrawerHeader>
          <Stack direction="column" spacing={1} ml={1} mt={1}>
            <Stack
              direction="row"
              alignItems="flex-end"
              spacing={1}
              onClick={() => router.push("/")}
              sx={{ cursor: "pointer" }}
            >
              <Image src="/singularitydata.svg" width={32} height={32} alt="logo" />
              <Typography variant="subtitle1" color="primary">
                RisingWave
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" justifyItems="center">
              <Typography variant="subtitle2" color="secondary">
                Dashboard
              </Typography>
              <Typography variant="subtitle2" color="secondary">
                v0.0.1-alpha
              </Typography>
            </Stack>
          </Stack>
          <IconButton onClick={handleDrawerClose}>
            {theme.direction === "ltr" ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </DrawerHeader>
        <Divider />
        <List>
          <NavBarItem
            text="cluster"
            icon={<ViewComfyIcon fontSize="small" />}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
          <NavBarItem
            text="streaming"
            icon={<DoubleArrowIcon fontSize="small" />}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
        </List>
        <Divider />
        <List>
          <NavBarItem
            text="about"
            icon={<InfoIcon fontSize="small" />}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
        </List>
      </Drawer>
      <Main open={open} mainpadding={30}>
        <div style={{ height: "68px" }}></div>
        <div style={{ width: "calc(100vw - 275px)", height: "calc(100% - 68px)" }}>{children}</div>
      </Main>
    </Box>
  );
}
