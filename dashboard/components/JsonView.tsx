import React from "react";
import { Box } from "@mui/material";
import SyntaxHighlighter from "react-syntax-highlighter";
import atomOneDarkReasonable from "react-syntax-highlighter/dist/esm/styles/hljs/atom-one-dark-reasonable";

type Props = {
  nodeJson: string;
};

export default function JsonView({ nodeJson }: Props) {
  return (
    <Box width="100%" height="100%" overflow="auto">
      <SyntaxHighlighter
        language="json"
        style={atomOneDarkReasonable}
        wrapLines={true}
        showLineNumbers={false}
      >
        {nodeJson}
      </SyntaxHighlighter>
    </Box>
  );
}
