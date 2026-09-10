import { useRef, useEffect, useState, useCallback } from "react";
import type { CallState } from "../lib/useCall";
import { Avatar } from "./Avatar";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Fab,
  Chip,
} from "@mui/material";
import CallIcon from "@mui/icons-material/Call";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import ChatIcon from "@mui/icons-material/Chat";

interface Props {
  callState: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onAccept: () => void;
  onDecline: () => void;
  onHangup: () => void;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onStartScreenShare: () => void;
  onStopScreenShare: () => void;
}

export function CallView({
  callState,
  localStream,
  remoteStream,
  onAccept,
  onDecline,
  onHangup,
  onToggleMic,
  onToggleCamera,
  onStartScreenShare,
  onStopScreenShare,
}: Props) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Fullscreen vs draggable floating box mode (default: floating box so chat is accessible)
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Responsive box dimensions
  const getResponsiveBoxSize = () => {
    if (typeof window === "undefined") return { width: 380, height: 260 };
    const width = Math.min(380, Math.max(280, window.innerWidth - 32));
    const height = Math.min(260, Math.round(width * 0.68));
    return { width, height };
  };

  const [boxSize, setBoxSize] = useState(getResponsiveBoxSize);
  const BOX_WIDTH = boxSize.width;
  const BOX_HEIGHT = boxSize.height;

  // Floating draggable position
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window === "undefined") return { x: 40, y: 40 };
    const initialSize = getResponsiveBoxSize();
    return {
      x: Math.max(16, window.innerWidth - initialSize.width - 24),
      y: Math.max(16, window.innerHeight - initialSize.height - 24),
    };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  });

  // Call duration timer
  const [durationSec, setDurationSec] = useState(0);

  useEffect(() => {
    if (callState.status === "in-call") {
      setDurationSec(0);
      const timer = setInterval(() => setDurationSec((s) => s + 1), 1000);
      return () => clearInterval(timer);
    } else {
      setDurationSec(0);
    }
  }, [callState.status]);

  const fmtDuration = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Attach local stream to preview
  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream
  useEffect(() => {
    if (!remoteStream) return;

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch((err) => console.warn("[CallView] Video play() failed:", err));
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.volume = 1.0;
      remoteAudioRef.current.muted = false;
      remoteAudioRef.current.play().catch((err) => console.warn("[CallView] Audio play() failed:", err));
    }
  }, [remoteStream]);

  // Clamp position on window resize
  useEffect(() => {
    const handleResize = () => {
      const newSize = getResponsiveBoxSize();
      setBoxSize(newSize);
      setPosition((prev) => ({
        x: Math.max(10, Math.min(window.innerWidth - newSize.width - 10, prev.x)),
        y: Math.max(10, Math.min(window.innerHeight - newSize.height - 10, prev.y)),
      }));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Mouse / touch dragging handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isFullScreen) return;
      setIsDragging(true);
      dragStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        posX: position.x,
        posY: position.y,
      };

      const onMouseMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - dragStartRef.current.startX;
        const dy = moveEvent.clientY - dragStartRef.current.startY;
        const newX = Math.max(10, Math.min(window.innerWidth - BOX_WIDTH - 10, dragStartRef.current.posX + dx));
        const newY = Math.max(10, Math.min(window.innerHeight - BOX_HEIGHT - 10, dragStartRef.current.posY + dy));
        setPosition({ x: newX, y: newY });
      };

      const onMouseUp = () => {
        setIsDragging(false);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [isFullScreen, position, BOX_WIDTH, BOX_HEIGHT],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isFullScreen) return;
      const touch = e.touches[0];
      setIsDragging(true);
      dragStartRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        posX: position.x,
        posY: position.y,
      };

      const onTouchMove = (moveEvent: TouchEvent) => {
        const currentTouch = moveEvent.touches[0];
        const dx = currentTouch.clientX - dragStartRef.current.startX;
        const dy = currentTouch.clientY - dragStartRef.current.startY;
        const newX = Math.max(10, Math.min(window.innerWidth - BOX_WIDTH - 10, dragStartRef.current.posX + dx));
        const newY = Math.max(10, Math.min(window.innerHeight - BOX_HEIGHT - 10, dragStartRef.current.posY + dy));
        setPosition({ x: newX, y: newY });
      };

      const onTouchEnd = () => {
        setIsDragging(false);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("touchend", onTouchEnd);
      };

      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("touchend", onTouchEnd);
    },
    [isFullScreen, position, BOX_WIDTH, BOX_HEIGHT],
  );

  const { status, callType, remote, incomingCall, isMicOn, isCameraOn, isScreenSharing } = callState;

  if (status === "idle") return null;

  const remoteName = remote?.username ?? incomingCall?.callerUsername ?? "User";
  const remoteAvatar = remote?.avatarUrl ?? incomingCall?.callerAvatarUrl;
  const isVideo = callType === "video";

  return (
    <>
      {/* Hidden audio element ensuring continuous playback */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{ position: "fixed", top: -9999, left: -9999, width: 1, height: 1, opacity: 0.001, pointerEvents: "none" }}
      />

      {/* ── Incoming ring banner ───────────────────────────────────────────── */}
      {status === "ringing" && incomingCall && (
        <Box
          sx={{
            position: "fixed",
            top: { xs: 12, sm: 24 },
            right: { xs: 12, sm: 24 },
            zIndex: 9999,
            bgcolor: "background.paper",
            borderRadius: 3,
            boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
            border: "1px solid",
            borderColor: "divider",
            p: 3,
            minWidth: { xs: 0, sm: 320 },
            maxWidth: "calc(100vw - 24px)",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            backdropFilter: "blur(20px)",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: -2,
              left: -2,
              right: -2,
              bottom: -2,
              borderRadius: 3.5,
              border: "2px solid",
              borderColor: "primary.main",
              opacity: 0.4,
              animation: "callRing 1.5s ease-in-out infinite",
              "@keyframes callRing": {
                "0%,100%": { transform: "scale(1)", opacity: 0.4 },
                "50%": { transform: "scale(1.015)", opacity: 0.8 },
              },
            }}
          />

          <Chip
            label={isVideo ? "📹 Incoming video call" : "📞 Incoming voice call"}
            size="small"
            sx={{ bgcolor: "primary.main", color: "primary.contrastText", fontWeight: 700, fontSize: "0.7rem", alignSelf: "flex-start" }}
          />

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ position: "relative" }}>
              <Avatar name={remoteName} src={remoteAvatar} size={52} />
              <Box
                sx={{
                  position: "absolute",
                  inset: -4,
                  borderRadius: "50%",
                  border: "2.5px solid",
                  borderColor: "primary.main",
                  opacity: 0.6,
                  animation: "callPulse 1.2s ease-in-out infinite",
                  "@keyframes callPulse": {
                    "0%,100%": { transform: "scale(1)", opacity: 0.6 },
                    "50%": { transform: "scale(1.12)", opacity: 0.2 },
                  },
                }}
              />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {remoteName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isVideo ? "Video call" : "Voice call"} · Ringing…
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end", pt: 0.5 }}>
            <Tooltip title="Decline">
              <Fab
                size="small"
                onClick={onDecline}
                sx={{ bgcolor: "error.main", color: "white", width: 44, height: 44, boxShadow: "none", "&:hover": { bgcolor: "error.dark" } }}
              >
                <CallEndIcon sx={{ fontSize: 20 }} />
              </Fab>
            </Tooltip>
            <Tooltip title="Accept">
              <Fab
                size="small"
                onClick={onAccept}
                sx={{ bgcolor: "success.main", color: "white", width: 44, height: 44, boxShadow: "none", "&:hover": { bgcolor: "success.dark" } }}
              >
                <CallIcon sx={{ fontSize: 20 }} />
              </Fab>
            </Tooltip>
          </Box>
        </Box>
      )}

      {/* ── Outgoing calling card (compact floating card so you can chat while calling) ── */}
      {status === "calling" && (
        <Box
          sx={{
            position: "fixed",
            bottom: { xs: 12, sm: 24 },
            right: { xs: 12, sm: 24 },
            zIndex: 9999,
            width: { xs: "calc(100vw - 24px)", sm: 320 },
            maxWidth: 360,
            bgcolor: "rgba(18, 24, 38, 0.95)",
            backdropFilter: "blur(20px)",
            borderRadius: 3.5,
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
            p: 2.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.75 }}>
            <Box sx={{ position: "relative" }}>
              <Avatar name={remoteName} src={remoteAvatar} size={48} />
              <Box
                sx={{
                  position: "absolute",
                  inset: -4,
                  borderRadius: "50%",
                  border: "2px solid",
                  borderColor: "primary.main",
                  opacity: 0.6,
                  animation: "callPulse 1.2s ease-in-out infinite",
                  "@keyframes callPulse": {
                    "0%,100%": { transform: "scale(1)", opacity: 0.6 },
                    "50%": { transform: "scale(1.18)", opacity: 0.1 },
                  },
                }}
              />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "white" }}>
                {remoteName}
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                {isVideo ? "Calling via video…" : "Calling via voice…"}
              </Typography>
            </Box>
          </Box>

          <Tooltip title="Cancel call">
            <Fab
              size="small"
              onClick={onHangup}
              sx={{ bgcolor: "error.main", color: "white", width: 42, height: 42, boxShadow: "none", "&:hover": { bgcolor: "error.dark" } }}
            >
              <CallEndIcon sx={{ fontSize: 20 }} />
            </Fab>
          </Tooltip>
        </Box>
      )}

      {/* ── Active call view (Floating Draggable Box or Fullscreen) ──────────── */}
      {status === "in-call" && (
        <Box
          sx={
            isFullScreen
              ? {
                  position: "fixed",
                  inset: 0,
                  zIndex: 9998,
                  bgcolor: "#0d1117",
                  display: "flex",
                  flexDirection: "column",
                }
              : {
                  position: "fixed",
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  width: `${BOX_WIDTH}px`,
                  height: `${BOX_HEIGHT}px`,
                  maxWidth: "calc(100vw - 20px)",
                  zIndex: 9999,
                  bgcolor: "#111827",
                  borderRadius: 3,
                  boxShadow: isDragging
                    ? "0 20px 60px rgba(0,0,0,0.8), 0 0 0 2px #6366f1"
                    : "0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.15)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  transition: isDragging ? "none" : "box-shadow 0.2s ease",
                  userSelect: "none",
                }
          }
        >
          {/* Header Bar (Draggable handle when in box mode) */}
          <Box
            onMouseDown={!isFullScreen ? handleMouseDown : undefined}
            onTouchStart={!isFullScreen ? handleTouchStart : undefined}
            sx={{
              height: 42,
              minHeight: 42,
              px: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              bgcolor: isFullScreen ? "rgba(0,0,0,0.5)" : "rgba(17, 24, 39, 0.9)",
              backdropFilter: "blur(12px)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              cursor: isFullScreen ? "default" : isDragging ? "grabbing" : "grab",
              zIndex: 3,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
              {!isFullScreen && (
                <DragIndicatorIcon sx={{ color: "rgba(255,255,255,0.4)", fontSize: 18, cursor: isDragging ? "grabbing" : "grab" }} />
              )}
              <Typography
                variant="caption"
                sx={{
                  color: "white",
                  fontWeight: 700,
                  fontSize: "12px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {isVideo ? "📹 Video" : "📞 Voice"} · {remoteName}
              </Typography>
              <Chip
                label={fmtDuration(durationSec)}
                size="small"
                sx={{
                  height: 18,
                  fontSize: "10px",
                  fontWeight: 700,
                  bgcolor: "rgba(34, 197, 94, 0.2)",
                  color: "#4ade80",
                  border: "1px solid rgba(34, 197, 94, 0.4)",
                  "& .MuiChip-label": { px: 0.75 },
                }}
              />
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Tooltip title={isFullScreen ? "Exit Fullscreen (Switch to Draggable Box)" : "Fullscreen Mode"}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFullScreen((f) => !f);
                  }}
                  sx={{ color: "rgba(255,255,255,0.8)", "&:hover": { color: "white", bgcolor: "rgba(255,255,255,0.1)" } }}
                >
                  {isFullScreen ? <FullscreenExitIcon sx={{ fontSize: 20 }} /> : <FullscreenIcon sx={{ fontSize: 20 }} />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Video / Content Display */}
          <Box sx={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", bgcolor: "#0a0d14" }}>
            {isVideo ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted
                style={{ width: "100%", height: "100%", objectFit: isFullScreen ? "cover" : "cover" }}
              />
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: isFullScreen ? 2 : 1 }}>
                <Box sx={{ position: "relative" }}>
                  <Avatar name={remoteName} src={remoteAvatar} size={isFullScreen ? 108 : 56} />
                  <Box
                    sx={{
                      position: "absolute",
                      inset: -4,
                      borderRadius: "50%",
                      border: "2px solid",
                      borderColor: "success.main",
                      opacity: 0.6,
                      animation: "callPulse 2s ease-in-out infinite",
                      "@keyframes callPulse": { "0%,100%": { opacity: 0.6 }, "50%": { opacity: 0.15 } },
                    }}
                  />
                </Box>
                <Typography variant={isFullScreen ? "h6" : "subtitle2"} sx={{ fontWeight: 700, color: "white" }}>
                  {remoteName}
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                  Connected · Voice Call
                </Typography>
              </Box>
            )}

            {/* Status chip if screen sharing */}
            {isScreenSharing && (
              <Box sx={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 2 }}>
                <Chip
                  label="📺 Screen sharing"
                  size="small"
                  sx={{ bgcolor: "rgba(0,0,0,0.65)", color: "white", fontWeight: 600, fontSize: "11px", backdropFilter: "blur(8px)" }}
                />
              </Box>
            )}

            {/* Local video PiP */}
            {isVideo && (
              <Box
                sx={{
                  position: "absolute",
                  bottom: isFullScreen ? 96 : 8,
                  right: isFullScreen ? 24 : 8,
                  width: isFullScreen ? 180 : 88,
                  height: isFullScreen ? 120 : 58,
                  borderRadius: 2,
                  overflow: "hidden",
                  border: "1.5px solid rgba(255,255,255,0.25)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                  bgcolor: "#1a1a2e",
                  zIndex: 2,
                }}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
                />
                {!isCameraOn && (
                  <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#1a1a2e" }}>
                    <VideocamOffIcon sx={{ color: "rgba(255,255,255,0.5)", fontSize: isFullScreen ? 24 : 16 }} />
                  </Box>
                )}
              </Box>
            )}
          </Box>

          {/* Controls Bar */}
          <Box
            sx={{
              height: isFullScreen ? 80 : 48,
              minHeight: isFullScreen ? 80 : 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: isFullScreen ? 2 : 1,
              bgcolor: isFullScreen ? "rgba(0,0,0,0.75)" : "rgba(15, 23, 42, 0.95)",
              backdropFilter: "blur(20px)",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              zIndex: 3,
            }}
          >
            {/* Mic Toggle */}
            <Tooltip title={isMicOn ? "Mute mic" : "Unmute mic"}>
              <IconButton
                size="small"
                onClick={onToggleMic}
                sx={{
                  width: isFullScreen ? 48 : 34,
                  height: isFullScreen ? 48 : 34,
                  bgcolor: isMicOn ? "rgba(255,255,255,0.12)" : "error.main",
                  color: "white",
                  "&:hover": { bgcolor: isMicOn ? "rgba(255,255,255,0.22)" : "error.dark" },
                }}
              >
                {isMicOn ? <MicIcon sx={{ fontSize: isFullScreen ? 22 : 18 }} /> : <MicOffIcon sx={{ fontSize: isFullScreen ? 22 : 18 }} />}
              </IconButton>
            </Tooltip>

            {/* Camera Toggle (video calls) */}
            {isVideo && (
              <Tooltip title={isCameraOn ? "Turn off camera" : "Turn on camera"}>
                <IconButton
                  size="small"
                  onClick={onToggleCamera}
                  sx={{
                    width: isFullScreen ? 48 : 34,
                    height: isFullScreen ? 48 : 34,
                    bgcolor: isCameraOn ? "rgba(255,255,255,0.12)" : "error.main",
                    color: "white",
                    "&:hover": { bgcolor: isCameraOn ? "rgba(255,255,255,0.22)" : "error.dark" },
                  }}
                >
                  {isCameraOn ? <VideocamIcon sx={{ fontSize: isFullScreen ? 22 : 18 }} /> : <VideocamOffIcon sx={{ fontSize: isFullScreen ? 22 : 18 }} />}
                </IconButton>
              </Tooltip>
            )}

            {/* Screen Share */}
            <Tooltip title={isScreenSharing ? "Stop sharing" : "Share screen"}>
              <IconButton
                size="small"
                onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
                sx={{
                  width: isFullScreen ? 48 : 34,
                  height: isFullScreen ? 48 : 34,
                  bgcolor: isScreenSharing ? "primary.main" : "rgba(255,255,255,0.12)",
                  color: "white",
                  "&:hover": { bgcolor: isScreenSharing ? "primary.dark" : "rgba(255,255,255,0.22)" },
                }}
              >
                {isScreenSharing ? <StopScreenShareIcon sx={{ fontSize: isFullScreen ? 22 : 18 }} /> : <ScreenShareIcon sx={{ fontSize: isFullScreen ? 22 : 18 }} />}
              </IconButton>
            </Tooltip>

            {/* Chat toggle button when in Fullscreen Mode (switches back to box so user can chat) */}
            {isFullScreen && (
              <Tooltip title="Open Chat (Minimize to Draggable Box)">
                <IconButton
                  size="small"
                  onClick={() => setIsFullScreen(false)}
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: "rgba(255,255,255,0.12)",
                    color: "white",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
                  }}
                >
                  <ChatIcon sx={{ fontSize: 22 }} />
                </IconButton>
              </Tooltip>
            )}

            {/* Fullscreen / Box Toggle */}
            <Tooltip title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}>
              <IconButton
                size="small"
                onClick={() => setIsFullScreen((f) => !f)}
                sx={{
                  width: isFullScreen ? 48 : 34,
                  height: isFullScreen ? 48 : 34,
                  bgcolor: "rgba(255,255,255,0.12)",
                  color: "white",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
                }}
              >
                {isFullScreen ? <FullscreenExitIcon sx={{ fontSize: isFullScreen ? 22 : 18 }} /> : <FullscreenIcon sx={{ fontSize: isFullScreen ? 22 : 18 }} />}
              </IconButton>
            </Tooltip>

            {/* End Call */}
            <Tooltip title="End call">
              <Fab
                size="small"
                onClick={onHangup}
                sx={{
                  bgcolor: "error.main",
                  color: "white",
                  width: isFullScreen ? 52 : 36,
                  height: isFullScreen ? 52 : 36,
                  boxShadow: "none",
                  "&:hover": { bgcolor: "error.dark" },
                }}
              >
                <CallEndIcon sx={{ fontSize: isFullScreen ? 24 : 18 }} />
              </Fab>
            </Tooltip>
          </Box>
        </Box>
      )}
    </>
  );
}
