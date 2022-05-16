import React from "react";

type Props = {
  bgcolor: string;
};

export default function Dots({ bgcolor }: Props) {
  return (
    <div
      style={{
        margin: 5,
        height: 10,
        width: 10,
        borderRadius: 5,
        backgroundColor: bgcolor,
      }}
    />
  );
}
