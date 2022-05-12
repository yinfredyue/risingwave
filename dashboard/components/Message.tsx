import React from "react";
import Stack from "@mui/material/Stack";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert, { AlertColor, AlertProps } from "@mui/material/Alert";

interface Message {
  severity: AlertColor;
  content: string;
  vertical?: "top" | "bottom";
  horizontal?: "left" | "center" | "right";
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export default function SnackBar({
  severity = "warning",
  content,
  vertical = "top",
  horizontal = "center",
}: Message) {
  const [open, setOpen] = React.useState(true);

  const handleClose = (_event?: React.SyntheticEvent | Event, _reason?: string) => {
    setOpen(false);
  };

  return (
    <Stack spacing={2} sx={{ width: "100%" }}>
      <Snackbar
        open={open}
        anchorOrigin={{ vertical, horizontal }}
        autoHideDuration={6000}
        onClose={handleClose}
      >
        <Alert onClose={handleClose} severity={severity}>
          {content}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
