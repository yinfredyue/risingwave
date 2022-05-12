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
import Image from "next/image";
import { useRouter } from "next/router";

import React from "react";
import { useState } from "react";
import { styled, useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Drawer from "@mui/material/Drawer";
import CssBaseline from "@mui/material/CssBaseline";
import Toolbar from "@mui/material/Toolbar";
import List from "@mui/material/List";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import MuiAppBar, { AppBarProps as MuiAppBarProps } from "@mui/material/AppBar";

import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DoubleArrowIcon from "@mui/icons-material/DoubleArrow";
import ViewComfyIcon from "@mui/icons-material/ViewComfy";
import InfoIcon from "@mui/icons-material/Info";

import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";

import { capitalize } from "../lib/str";
import Typography from "@mui/material/Typography";

interface AppBarProps extends MuiAppBarProps {
  open?: boolean;
  drawerWidth?: number;
  mainPadding?: number;
}

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})<AppBarProps>(({ theme, open, drawerWidth }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(["width", "margin"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const Main = styled("main", { shouldForwardProp: (prop) => prop !== "open" })<AppBarProps>(
  ({ theme, open, drawerWidth, mainPadding }) => ({
    height: "100%",
    width: "100%",
    flexGrow: 1,
    padding: `${mainPadding}px`,
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: `-${drawerWidth}px`,
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

const NavBarItem = (props) => {
  const router = useRouter();

  return (
    <ListItemButton
      key={props.text}
      selected={props.currentPage === props.text}
      onClick={() => router.push(props.text)}
    >
      <Stack direction="row" alignItems="center" justifyContent="center">
        <ListItemIcon>{props.icon}</ListItemIcon>
        <span style={{ fontSize: "15px" }}>{capitalize(props.text)}</span>
      </Stack>
    </ListItemButton>
  );
};

export default function Layout(props) {
  const theme = useTheme();
  const [open, setOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState(props.currentPage ? props.currentPage : " ");
  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const WrapNavItem = (props) => (
    <NavBarItem
      text={props.text}
      icon={props.icon}
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
    />
  );

  return (
    <Box sx={{ display: "flex", height: "100vh", width: "100vw" }}>
      <CssBaseline />
      <AppBar open={open} drawerWidth={240}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{ mr: 2, ...(open && { display: "none" }) }}
          >
            <MenuIcon />
          </IconButton>
          <div>{capitalize(currentPage)}</div>
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
          <Stack direction="column" alignItems="center" justifyContent="center">
            <Stack direction="row" alignItems="center" justifyItems="center" spacing={2}>
              <Image src="/singularitydata.svg" width={32} height={32} alt="logo" />
              <Typography variant="subtitle1" color="primary">
                RisingWave
              </Typography>
            </Stack>
            <div>
              <span style={{ fontSize: "13px" }}>Dashboard </span>
              <span style={{ fontSize: "13px" }}>v0.0.1-alpha</span>
            </div>
          </Stack>
          <IconButton onClick={handleDrawerClose}>
            {theme.direction === "ltr" ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </DrawerHeader>
        <Divider />
        <List>
          <WrapNavItem text="cluster" icon={<ViewComfyIcon fontSize="small" />} />
          <WrapNavItem text="streaming" icon={<DoubleArrowIcon fontSize="small" />} />
        </List>
        <Divider />
        <List>
          <WrapNavItem text="about" icon={<InfoIcon fontSize="small" />} />
        </List>
      </Drawer>
      <Main open={open} mainPadding={30}>
        <div style={{ height: "68px" }}></div>
        <div style={{ width: "calc(100vw - 275px)", height: "calc(100% - 68px)" }}>
          {props.children}
        </div>
      </Main>
    </Box>
  );
}
