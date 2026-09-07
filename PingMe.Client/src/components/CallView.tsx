import { useRef, useEffect } from "react";
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
  // Always-present hidden audio element — plays remote audio even in audio-only calls
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Attach local stream to local <video> preview
  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to <video> and to the always-present <audio> fallback
  useEffect(() => {
    if (!remoteStream) return;
    console.log("[CallView] Attaching remote stream, tracks:", remoteStream.getTracks().map(t => `${t.kind}:${t.readyState}:enabled=${t.enabled}`));

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(err => console.warn("[CallView] Video play() failed:", err));
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(err => console.warn("[CallView] Audio play() failed:", err));
    }
  }, [remoteStream]);

  const { status, callType, remote, incomingCall, isMicOn, isCameraOn, isScreenSharing } = callState;

  if (status === "idle") return null;

  const remoteName = remote?.username ?? incomingCall?.callerUsername ?? "User";
  const remoteAvatar = remote?.avatarUrl ?? incomingCall?.callerAvatarUrl;
  const isVideo = callType === "video";

  return (
    <>
      {/* Always-present hidden audio element — plays remote audio for ALL call types.
          For video calls the <video> already plays audio, but this ensures audio-only calls work. */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{ display: "none" }}
      />

      {/* ── Incoming ring banner ───────────────────────────────────────────── */}
      {status === "ringing" && incomingCall && (
        <Box
          sx={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 9999,
            bgcolor: "background.paper",
            borderRadius: 3,
            boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
            border: "1px solid",
            borderColor: "divider",
            p: 3,
            minWidth: 320,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Animated ring indicator */}
          <Box sx={{
            position: "absolute", top: -2, left: -2, right: -2, bottom: -2, borderRadius: 3.5,
            border: "2px solid", borderColor: "primary.main", opacity: 0.4,
            animation: "callRing 1.5s ease-in-out infinite",
            "@keyframes callRing": { "0%,100%": { transform: "scale(1)", opacity: 0.4 }, "50%": { transform: "scale(1.015)", opacity: 0.8 } },
          }} />

          <Chip
            label={isVideo ? "📹 Incoming video call" : "📞 Incoming voice call"}
            size="small"
            sx={{ bgcolor: "primary.main", color: "primary.contrastText", fontWeight: 700, fontSize: "0.7rem", alignSelf: "flex-start" }}
          />

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ position: "relative" }}>
              <Avatar name={remoteName} src={remoteAvatar} size={52} />
              <Box sx={{
                position: "absolute", inset: -4, borderRadius: "50%", border: "2.5px solid",
                borderColor: "primary.main", opacity: 0.6,
                animation: "callPulse 1.2s ease-in-out infinite",
                "@keyframes callPulse": { "0%,100%": { transform: "scale(1)", opacity: 0.6 }, "50%": { transform: "scale(1.12)", opacity: 0.2 } },
              }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{remoteName}</Typography>
              <Typography variant="caption" color="text.secondary">
                {isVideo ? "Video call" : "Voice call"} · Ringing…
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end", pt: 0.5 }}>
            <Tooltip title="Decline">
              <Fab size="small" onClick={onDecline}
                sx={{ bgcolor: "error.main", color: "white", width: 44, height: 44, boxShadow: "none", "&:hover": { bgcolor: "error.dark" } }}>
                <CallEndIcon sx={{ fontSize: 20 }} />
              </Fab>
            </Tooltip>
            <Tooltip title="Accept">
              <Fab size="small" onClick={onAccept}
                sx={{ bgcolor: "success.main", color: "white", width: 44, height: 44, boxShadow: "none", "&:hover": { bgcolor: "success.dark" } }}>
                <CallIcon sx={{ fontSize: 20 }} />
              </Fab>
            </Tooltip>
          </Box>
        </Box>
      )}

      {/* ── Outgoing calling overlay ───────────────────────────────────────── */}
      {status === "calling" && (
        <Box sx={{
          position: "fixed", inset: 0, zIndex: 9998,
          bgcolor: "rgba(0,0,0,0.92)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
        }}>
          <Box sx={{ position: "relative" }}>
            <Avatar name={remoteName} src={remoteAvatar} size={96} />
            <Box sx={{
              position: "absolute", inset: -8, borderRadius: "50%", border: "3px solid", borderColor: "primary.main", opacity: 0.5,
              animation: "callPulse 1.5s ease-in-out infinite",
              "@keyframes callPulse": { "0%,100%": { transform: "scale(1)", opacity: 0.5 }, "50%": { transform: "scale(1.15)", opacity: 0.15 } },
            }} />
            <Box sx={{
              position: "absolute", inset: -18, borderRadius: "50%", border: "2px solid", borderColor: "primary.light", opacity: 0.2,
              animation: "callPulse 1.5s ease-in-out 0.4s infinite",
            }} />
          </Box>
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "white" }}>{remoteName}</Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.55)", mt: 0.5 }}>
              {isVideo ? "Calling via video…" : "Calling via voice…"}
            </Typography>
          </Box>
          <Tooltip title="Cancel call">
            <Fab onClick={onHangup}
              sx={{ bgcolor: "error.main", color: "white", width: 64, height: 64, mt: 2, "&:hover": { bgcolor: "error.dark" } }}>
              <CallEndIcon sx={{ fontSize: 28 }} />
            </Fab>
          </Tooltip>
        </Box>
      )}

      {/* ── Active call view ──────────────────────────────────────────────── */}
      {status === "in-call" && (
        <Box sx={{ position: "fixed", inset: 0, zIndex: 9998, bgcolor: "#0d1117", display: "flex", flexDirection: "column" }}>
          {/* Remote video / avatar area */}
          <Box sx={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {isVideo ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <Box sx={{ position: "relative" }}>
                  <Avatar name={remoteName} src={remoteAvatar} size={112} />
                  {/* Pulsing online indicator */}
                  <Box sx={{
                    position: "absolute", inset: -6, borderRadius: "50%", border: "2px solid", borderColor: "success.main", opacity: 0.5,
                    animation: "callPulse 2s ease-in-out infinite",
                    "@keyframes callPulse": { "0%,100%": { opacity: 0.5 }, "50%": { opacity: 0.1 } },
                  }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: "white" }}>{remoteName}</Typography>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.5)" }}>Connected · Voice call</Typography>
              </Box>
            )}

            {/* Status chip */}
            <Box sx={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)" }}>
              <Chip
                label={isScreenSharing ? "📺 Screen sharing" : isVideo ? `📹 ${remoteName}` : `🔊 ${remoteName}`}
                sx={{ bgcolor: "rgba(0,0,0,0.6)", color: "white", fontWeight: 600, backdropFilter: "blur(10px)" }}
              />
            </Box>

            {/* Local video PiP — only shown during video calls */}
            {isVideo && (
              <Box sx={{
                position: "absolute", bottom: 100, right: 20,
                width: 180, height: 120, borderRadius: 2, overflow: "hidden",
                border: "2px solid rgba(255,255,255,0.2)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                bgcolor: "#1a1a2e",
              }}>
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
                />
                {!isCameraOn && (
                  <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#1a1a2e" }}>
                    <VideocamOffIcon sx={{ color: "rgba(255,255,255,0.4)", fontSize: 28 }} />
                  </Box>
                )}
              </Box>
            )}
          </Box>

          {/* Control bar */}
          <Box sx={{
            height: 88,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 2,
            bgcolor: "rgba(0,0,0,0.7)", backdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}>
            <Tooltip title={isMicOn ? "Mute mic" : "Unmute mic"}>
              <IconButton onClick={onToggleMic} sx={{
                width: 52, height: 52,
                bgcolor: isMicOn ? "rgba(255,255,255,0.12)" : "error.main", color: "white",
                "&:hover": { bgcolor: isMicOn ? "rgba(255,255,255,0.2)" : "error.dark" },
              }}>
                {isMicOn ? <MicIcon /> : <MicOffIcon />}
              </IconButton>
            </Tooltip>

            {isVideo && (
              <Tooltip title={isCameraOn ? "Turn off camera" : "Turn on camera"}>
                <IconButton onClick={onToggleCamera} sx={{
                  width: 52, height: 52,
                  bgcolor: isCameraOn ? "rgba(255,255,255,0.12)" : "error.main", color: "white",
                  "&:hover": { bgcolor: isCameraOn ? "rgba(255,255,255,0.2)" : "error.dark" },
                }}>
                  {isCameraOn ? <VideocamIcon /> : <VideocamOffIcon />}
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title={isScreenSharing ? "Stop sharing" : "Share screen"}>
              <IconButton
                onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
                sx={{
                  width: 52, height: 52,
                  bgcolor: isScreenSharing ? "primary.main" : "rgba(255,255,255,0.12)", color: "white",
                  "&:hover": { bgcolor: isScreenSharing ? "primary.dark" : "rgba(255,255,255,0.2)" },
                }}>
                {isScreenSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title="End call">
              <Fab onClick={onHangup}
                sx={{ bgcolor: "error.main", color: "white", width: 56, height: 56, "&:hover": { bgcolor: "error.dark" } }}>
                <CallEndIcon sx={{ fontSize: 24 }} />
              </Fab>
            </Tooltip>
          </Box>
        </Box>
      )}
    </>
  );
}
