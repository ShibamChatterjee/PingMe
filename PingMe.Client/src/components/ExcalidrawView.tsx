import { useState, useCallback, useEffect, useRef } from "react";
import "@excalidraw/excalidraw/index.css";
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  TextField,
  IconButton,
  Tooltip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BrushIcon from "@mui/icons-material/Brush";
import SendIcon from "@mui/icons-material/Send";

const TextFieldAny = TextField as any;

interface Props {
  chatDisplayName: string;
  onClose: () => void;
  onSend: (file: File, caption: string) => void;
}

export function ExcalidrawView({ chatDisplayName, onClose, onSend }: Props) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [caption, setCaption] = useState("");
  const [exporting, setExporting] = useState(false);
  const [ExcalidrawComp, setExcalidrawComp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamically import Excalidraw
  useEffect(() => {
    setLoading(true);
    import("@excalidraw/excalidraw").then((mod) => {
      setExcalidrawComp(() => mod.Excalidraw);
      setLoading(false);
    });
  }, []);

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
        `whiteboard-${Date.now()}.png`,
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
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        bgcolor: "background.default",
      }}
    >
      {/* Sleek Top Action Bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          px: 2.5,
          py: 1.25,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        {/* Left: Back to Chat Button & Title */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
          <Tooltip title="Back to chat">
            <IconButton onClick={onClose} size="small" sx={{ border: "1px solid", borderColor: "divider" }}>
              <ArrowBackIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "8px",
              bgcolor: "primary.main",
              color: "primary.contrastText",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BrushIcon sx={{ fontSize: 18 }} />
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "14px", lineHeight: 1.2 }} noWrap>
              Whiteboard Canvas
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "11px" }} noWrap>
              Drawing to {chatDisplayName}
            </Typography>
          </Box>
        </Box>

        {/* Center: Caption input */}
        <Box sx={{ flexGrow: 1, maxWidth: 450, mx: 1 }}>
          <TextFieldAny
            placeholder="Add an optional caption for this drawing…"
            value={caption}
            onChange={(e: any) => setCaption(e.target.value)}
            disabled={exporting}
            size="small"
            fullWidth
            InputProps={{
              sx: { borderRadius: "8px", fontSize: "13px", height: 36 },
            }}
          />
        </Box>

        {/* Right: Actions */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
          <Button
            variant="text"
            onClick={onClose}
            disabled={exporting}
            size="small"
            sx={{ fontWeight: 600, textTransform: "none", color: "text.secondary" }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            color="primary"
            onClick={handleExport}
            disabled={exporting || !excalidrawAPI}
            size="small"
            startIcon={
              exporting ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SendIcon sx={{ fontSize: 15 }} />
              )
            }
            sx={{
              fontWeight: 700,
              textTransform: "none",
              borderRadius: "8px",
              px: 2,
              height: 36,
            }}
          >
            {exporting ? "Sending…" : "Send to Chat"}
          </Button>
        </Box>
      </Box>

      {/* Full-Height In-Place Excalidraw Canvas Area */}
      <Box
        ref={containerRef}
        sx={{
          flex: "1 1 0",
          position: "relative",
          width: "100%",
          height: "100%",
          minHeight: 0,
          overflow: "hidden",
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
              bgcolor: "background.default",
            }}
          >
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              Initializing drawing whiteboard…
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
    </Box>
  );
}
