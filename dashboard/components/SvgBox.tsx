import styled from "@emotion/styled";

export const SvgBox = styled("div")(() => ({
  padding: "10px",
  borderRadius: "20px",
  boxShadow: "5px 5px 10px #ebebeb, -5px -5px 10px #ffffff",
  position: "relative",
  marginBottom: "100px",
  height: "100%",
  width: "100%",
}));

export const SvgBoxCover = styled("div")(() => ({
  position: "absolute",
  zIndex: "6",
}));
