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
import { ChangeEvent, SyntheticEvent, useEffect, useRef, useState, useCallback } from "react";
import LocationSearchingIcon from "@mui/icons-material/LocationSearching";
import CircularProgress from "@mui/material/CircularProgress";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Stack, Tabs, Tab, Box } from "@mui/material";
import {
  Tooltip,
  FormControl,
  MenuItem,
  InputLabel,
  FormHelperText,
  Input,
  InputAdornment,
  IconButton,
  Autocomplete,
  TextField,
  Switch,
  Typography,
} from "@mui/material";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import JsonView from "@components/JsonView";
import { Close } from "@mui/icons-material";
import { ToolBoxTitle } from "@components/ToolBox";
import Dots from "@components/Dots";
import { SvgBox, SvgBoxCover } from "@components/SvgBox";
import { ActorInfoView } from "@components/ActorInfoView";

import useWindowSize from "hook/useWindowSize";
import { MaterializedView } from "@interfaces/MaterializedView";
import { ActorProto, Actors } from "@interfaces/Actor";
import { SelectedMateralizedView } from "../interfaces/MaterializedView";
import { debounce } from "lodash";
import { CanvasEngine } from "@classes/CanvasEngine";
import { computeNodeAddrToSideColor } from "@lib/util";
import { StreamChartHelper } from "@classes/StreamChartHelper";
import createView from "@lib/streamPlan/streamChartHelper";

type Props = {
  data: Actors[];
  mvList: MaterializedView[];
};

export default function StreamingView({ data, mvList }: Props) {
  const actorList = data.map((x) => x.node);
  const windowSize = useWindowSize();

  const [nodeJson, setNodeJson] = useState("");
  const [showInfoPane, setShowInfoPane] = useState(false);
  const [selectedWorkerNode, setSelectedWorkerNode] = useState("Show All");
  const [searchType, setSearchType] = useState("Actor");
  const [searchContent, setSearchContent] = useState("");
  const [mvTableIdToSingleViewActorList, setMvTableIdToSingleViewActorList] = useState<Map<
    number,
    number[]
  > | null>(null);
  const [mvTableIdToChainViewActorList, setMvTableIdToChainViewActorList] = useState<Map<
    number,
    number[]
  > | null>(null);
  const [filterMode, setFilterMode] = useState("Chain View");
  const [selectedMvTableId, setSelectedMvTableId] = useState<number | null>(null);
  const [showFullGraph, setShowFullGraph] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [actor, setActor] = useState<ActorProto | null>(null);
  const [chartHelper, setChartHelper] = useState<StreamChartHelper | null>(null);
  const [canvasEngine, setCanvasEngine] = useState<CanvasEngine | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasOutterBox = useRef<HTMLDivElement | null>(null);

  const exprNode = (actorNode: any) => (({ input, ...o }) => o)(actorNode);

  const locateTo = useCallback(
    (selector: string) => {
      canvasEngine?.locateTo(selector);
    },
    [canvasEngine]
  );

  const onTabChange = (_: any, v: any) => {
    setTabValue(v);
  };

  const locateSearchPosition = useCallback(() => {
    const type = searchType === "Operator" ? "Node" : searchType;
    if (type.toLocaleLowerCase() === "actor") {
      locateTo(`actor-${searchContent}`);
    } else if (type.toLocaleLowerCase() === "fragment") {
      locateTo(`fragment-${searchContent}`);
    }
  }, [searchType, locateTo, searchContent]);

  const onNodeClick = (_e: any, node: any, actor: any) => {
    setActor(actor);
    setShowInfoPane(true);
    setNodeJson(
      node.dispatcherType
        ? JSON.stringify(
            {
              dispatcher: { type: node.dispatcherType },
              downstreamActorId: node.downstreamActorId,
            },
            null,
            2
          )
        : JSON.stringify(exprNode(node.nodeProto), null, 2)
    );
  };

  const onActorClick = (_e: any, actor: ActorProto) => {
    setActor(actor);
    setShowInfoPane(true);
    setNodeJson("Click a node to show its raw json");
  };

  const onWorkerNodeSelect = (e: SelectChangeEvent) => {
    setSelectedWorkerNode(e.target.value);
  };

  const onSearchTypeChange = (e: SelectChangeEvent) => {
    setSearchType(e.target.value);
  };

  const onSearchButtonClick = () => {
    locateSearchPosition();
  };

  const searchHandler = useCallback(
    debounce((_type: string, _content: string) => {
      const type = _type === "Operator" ? "Node" : _type;
      if (type.toLocaleLowerCase() === "actor") {
        locateTo(`actor-${_content}`);
      } else if (type.toLocaleLowerCase() === "fragment") {
        locateTo(`fragment-${_content}`);
      }
    }, 300),
    []
  );

  useEffect(() => {
    if (searchContent) {
      searchHandler(searchType, searchContent);
    }
  }, [searchType, searchContent]);

  const onSelectMvChange = (
    _e: SyntheticEvent<Element, Event>,
    v: SelectedMateralizedView | null
  ) => {
    setSelectedMvTableId(v?.tableId || null);
  };

  const onFilterModeChange = (e: SelectChangeEvent<string>) => {
    setFilterMode(e.target.value);
  };

  const onFullGraphSwitchChange = (_e: ChangeEvent<HTMLInputElement>, v: boolean) => {
    setShowFullGraph(v);
  };

  const onRefresh = async () => {
    window.location.reload();
  };

  useEffect(() => {
    const cur = canvasOutterBox.current;
    if (cur?.clientWidth && cur?.clientHeight) {
      const canvasEngine = new CanvasEngine("c", cur.clientHeight, cur.clientWidth);
      setCanvasEngine(canvasEngine);

      const newView = createView(
        canvasEngine,
        data,
        onNodeClick,
        onActorClick,
        selectedWorkerNode,
        null
      );
      setChartHelper(newView);
      setMvTableIdToChainViewActorList(newView.getMvTableIdToChainViewActorList());
      setMvTableIdToSingleViewActorList(newView.getMvTableIdToSingleViewActorList());
    }

    return () => {
      canvasEngine?.cleanGraph();
    };
  }, []);

  // TODO: resize handler that can shrink the outter box
  useEffect(() => {
    const canvasCur = canvasOutterBox.current;
    if (canvasCur?.clientWidth && canvasCur?.clientHeight) {
      canvasEngine?.resize(canvasCur.clientWidth, canvasCur.clientHeight);
    }
  }, [windowSize]);

  useEffect(() => {
    if (selectedMvTableId && mvTableIdToChainViewActorList && mvTableIdToSingleViewActorList) {
      const shownActorIdList =
        (filterMode.includes("chain")
          ? mvTableIdToChainViewActorList
          : mvTableIdToSingleViewActorList
        ).get(selectedMvTableId) || [];
      locateTo(`actor-${shownActorIdList[0]}`);

      if (showFullGraph) {
        const newView = createView(
          canvasEngine!,
          data,
          onNodeClick,
          onActorClick,
          selectedWorkerNode,
          null
        );
        setChartHelper(newView);
      } else {
        // rerender graph if it is a partial graph
        canvasEngine?.canvas?.clear();
        const newView = createView(
          canvasEngine!,
          data,
          onNodeClick,
          onActorClick,
          selectedWorkerNode,
          shownActorIdList
        );
        canvasEngine?.resetCamera();
        setChartHelper(newView);
      }
      canvasEngine?._refreshView();
    }
  }, [
    selectedWorkerNode,
    filterMode,
    selectedMvTableId,
    showFullGraph,
    mvTableIdToChainViewActorList,
    mvTableIdToSingleViewActorList,
  ]);

  return (
    <SvgBox>
      <SvgBoxCover style={{ right: "10px", top: "10px", width: "500px" }}>
        {showInfoPane ? (
          <Stack
            alignItems="center"
            width="100%"
            bgcolor="#fafafa"
            borderRadius={4}
            boxShadow="5px 5px 10px #ebebeb, -5px -5px 10px #ffffff"
            height={canvasOutterBox?.current ? canvasOutterBox.current.clientHeight - 100 : 500}
          >
            <Stack
              p={2}
              width="100%"
              height="50px"
              direction="row"
              alignItems="center"
              justifyContent="end"
              bgcolor="#1a76d2"
              borderRadius="20px 20px 0 0"
            >
              <IconButton onClick={() => setShowInfoPane(false)}>
                <Close sx={{ color: "white" }} />
              </IconButton>
            </Stack>
            <Stack
              direction="row"
              bgcolor="white"
              width="100%"
              justifyContent="center"
              alignItems="center"
            >
              <Tabs value={tabValue} onChange={onTabChange} aria-label="basic tabs example">
                <Tab label="Info" id="0" />
                <Tab label="Raw JSON" id="1" />
              </Tabs>
            </Stack>
            {tabValue === 0 ? <ActorInfoView actor={actor} /> : null}
            {tabValue === 1 ? <JsonView nodeJson={nodeJson} /> : null}
          </Stack>
        ) : null}
      </SvgBoxCover>

      <Stack className="noselect" zIndex={6} position="absolute">
        <ToolBoxTitle> Select a worker node </ToolBoxTitle>
        <FormControl sx={{ m: 1, minWidth: 300 }}>
          <InputLabel> Worker Node </InputLabel>
          <Select value={selectedWorkerNode} label="Woker Node" onChange={onWorkerNodeSelect}>
            <MenuItem value="Show All" key="all">
              <Typography variant="subtitle1"> Show All </Typography>
            </MenuItem>
            {actorList.map((x, idx) => (
              <MenuItem key={idx} value={x.host.host + ":" + x.host.port}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle1">{x.type}</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {x.host.host + ":" + x.host.port}
                  </Typography>
                  <Dots bgcolor={computeNodeAddrToSideColor(x.host.host + ":" + x.host.port)} />
                </Stack>
              </MenuItem>
            ))}
          </Select>
          <FormHelperText> Select an Actor </FormHelperText>
        </FormControl>

        <ToolBoxTitle> Search </ToolBoxTitle>
        <Stack direction="row" alignItems="center">
          <FormControl sx={{ p: 0, m: 1, minWidth: 120 }}>
            <InputLabel> Type </InputLabel>
            <Select value={searchType} label="Type" onChange={onSearchTypeChange}>
              <MenuItem value="Actor"> Actor </MenuItem>
              <MenuItem value="Fragment"> Fragment </MenuItem>
            </Select>
          </FormControl>
          <Input
            sx={{ m: 1, width: 150 }}
            onChange={(e) => setSearchContent(e.target.value)}
            value={searchContent}
            endAdornment={
              <InputAdornment position="end">
                <IconButton aria-label="toggle password visibility" onClick={onSearchButtonClick}>
                  <SearchIcon />
                </IconButton>
              </InputAdornment>
            }
          />
        </Stack>

        <ToolBoxTitle> Filter materialized view </ToolBoxTitle>
        <Stack>
          <FormControl sx={{ m: 1, width: 300 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
              <Box>
                <InputLabel> Mode </InputLabel>
                <Select
                  sx={{ my: 1, width: 140 }}
                  value={filterMode}
                  label="Mode"
                  onChange={onFilterModeChange}
                >
                  <MenuItem value="Single View"> Single View </MenuItem>
                  <MenuItem value="Chain View"> Chain View </MenuItem>
                </Select>
              </Box>
              <Stack direction="row" alignItems="center" ml={1}>
                <Box> Full Graph </Box>
                <Switch defaultChecked value={showFullGraph} onChange={onFullGraphSwitchChange} />
              </Stack>
            </Stack>
            <Autocomplete
              disablePortal
              onChange={onSelectMvChange}
              isOptionEqualToValue={(option, value) => {
                return option.tableId === value.tableId;
              }}
              options={mvList.map((mv) => {
                return { label: mv.name, tableId: mv.id };
              })}
              renderInput={(param) => <TextField {...param} label="Materialized View" />}
            />
          </FormControl>
        </Stack>
      </Stack>

      <SvgBoxCover style={{ right: "10px", bottom: "10px", cursor: "pointer" }}>
        <Stack direction="row" spacing={2}>
          <Tooltip title="Reset">
            <Box onClick={() => canvasEngine?.resetCamera()}>
              <LocationSearchingIcon color="action" />
            </Box>
          </Tooltip>

          <Tooltip title="refresh">
            {!refreshing ? (
              <Box onClick={() => onRefresh()}>
                <RefreshIcon color="action" />
              </Box>
            ) : (
              <CircularProgress />
            )}
          </Tooltip>
        </Stack>
      </SvgBoxCover>

      <Box
        ref={canvasOutterBox}
        width="100%"
        height="100%"
        zIndex={5}
        overflow="auto"
        className="noselect"
      >
        <canvas ref={canvasRef} id="c" width={1000} height={1000} style={{ cursor: "pointer" }} />
      </Box>
    </SvgBox>
  );
}
