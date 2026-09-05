import { useState, useCallback, useEffect, useRef } from "react";
import "@excalidraw/excalidraw/index.css";
import {
  Dialog,
  DialogTitle,
  DialogActions,
  Button,
  Box,
  CircularProgress,
  Typography,
  TextField,
} from "@mui/material";
import BrushIcon from "@mui/icons-material/Brush";
import SendIcon from "@mui/icons-material/Send";

const TextFieldAny = TextField as any;

interface Props {
  open: boolean;
  onClose: () => void;
  onSend: (file: File, caption: string) => void;
}

export function ExcalidrawModal({ open, onClose, onSend }: Props) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [caption, setCaption] = useState("");
  const [exporting, setExporting] = useState(false);
  const [ExcalidrawComp, setExcalidrawComp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamically import Excalidraw when the modal opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    import("@excalidraw/excalidraw").then((mod) => {
      setExcalidrawComp(() => mod.Excalidraw);
      setLoading(false);
    });
  }, [open]);

  // Reset API when dialog closes
  useEffect(() => {
    if (!open) {
      setExcalidrawAPI(null);
    }
  }, [open]);

  const handleExport = useCallback(async () => {
    if (!excalidrawAPI) return;

    setExporting(true);
    try {
      const elements = excalidrawAPI.getSceneElements();
      if (!elements || elements.length === 0) {
        setExporting(false);
        return;
      }

      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const blob = await exportToBlob({
        elements,
        appState: {
          ...excalidrawAPI.getAppState(),
          exportWithDarkMode: false,
          exportBackground: true,
        },
        files: excalidrawAPI.getFiles(),
      });

      const file = new File(
        [blob],
        `drawing-${Date.now()}.png`,
        { type: "image/png" }
      );

      onSend(file, caption.trim());
      setCaption("");
      onClose();
    } catch (err) {
      console.error("Failed to export drawing:", err);
    } finally {
      setExporting(false);
    }
  }, [excalidrawAPI, caption, onSend, onClose]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      slotProps={{
        paper: {
          sx: {
            width: "90vw",
            height: "85vh",
            maxWidth: "none",
            borderRadius: 3,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          fontWeight: 700,
          py: 1.5,
          px: 2.5,
          borderBottom: 1,
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        <BrushIcon color="primary" sx={{ fontSize: 22 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "16px" }}>
          Canvas — Draw & Send
        </Typography>
      </DialogTitle>

      {/* Canvas area — uses absolute pixel height via calc */}
      <Box
        ref={containerRef}
        sx={{
          flex: "1 1 0",
          position: "relative",
          overflow: "hidden",
          // Excalidraw needs its container to have a definite height
          height: "calc(85vh - 130px)",
          minHeight: 300,
        }}
      >
        {loading ? (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              Loading drawing canvas…
            </Typography>
          </Box>
        ) : ExcalidrawComp ? (
          <div style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}>
            <ExcalidrawComp
              excalidrawAPI={(api: any) => setExcalidrawAPI(api)}
              theme="light"
              UIOptions={{
                canvasActions: {
                  export: false,
                  saveAsImage: false,
                  loadScene: false,
                },
              }}
            />
          </div>
        ) : null}
      </Box>

      <DialogActions
        sx={{
          px: 2.5,
          py: 1.5,
          gap: 1.5,
          borderTop: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          flexShrink: 0,
        }}
      >
        <TextFieldAny
          placeholder="Add a caption (optional)…"
          value={caption}
          onChange={(e: any) => setCaption(e.target.value)}
          size="small"
          sx={{ flexGrow: 1 }}
          disabled={exporting}
        />
        <Button variant="outlined" onClick={onClose} disabled={exporting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleExport}
          disabled={exporting || !excalidrawAPI}
          startIcon={
            exporting ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <SendIcon sx={{ fontSize: 16 }} />
            )
          }
        >
          {exporting ? "Sending…" : "Send Drawing"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
