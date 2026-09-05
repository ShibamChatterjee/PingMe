import type { ActiveChat } from "../lib/useChat";
import type { ConnStatus } from "../lib/hub";
import { Avatar } from "./Avatar";
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  AvatarGroup,
  Avatar as MuiAvatar,
} from "@mui/material";
import CallOutlinedIcon from "@mui/icons-material/CallOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import TagIcon from "@mui/icons-material/Tag";

interface Props {
  activeChat: ActiveChat;
  typingUserIds: string[];
  onlineUsers: Set<string>;
  connStatus: ConnStatus;
  members?: import("../lib/api").MemberResponseDto[];
  onOpenProfile?: (userId: string) => void;
  onStartCall?: (type: "audio" | "video") => void;
  callActive?: boolean;
  // kept for API compatibility — not rendered in header, screen share is in-call only
  onToggleMemberPanel?: () => void;
  onStartScreenShare?: () => void;
}

export function ChatHeader({
  activeChat,
  typingUserIds,
  onlineUsers,
  connStatus,
  members = [],
  onOpenProfile,
  onStartCall,
  callActive = false,
}: Props) {
  if (!activeChat) return null;

  const isGroup = activeChat.kind === "group";
  const chat = activeChat.chat;

  const displayName = isGroup
    ? (chat as import("../lib/api").Group).name
    : (chat as import("../lib/api").DirectChat).otherUsername;

  const otherUserId = !isGroup ? (chat as import("../lib/api").DirectChat).otherUserId : "";
  const otherMember = members.find((m) => m.userId?.toLowerCase() === otherUserId?.toLowerCase());
  const otherAvatarUrl = otherMember?.avatarUrl || (!isGroup ? (chat as import("../lib/api").DirectChat).otherAvatarUrl : undefined);

  const description = isGroup
    ? (chat as import("../lib/api").Group).description || "Workspace team group"
    : "Direct message";

  const groupMembers = isGroup
    ? (chat as import("../lib/api").Group).members || []
    : [];

  const hasOnline = isGroup
    ? groupMembers.some((m) => onlineUsers.has(m.userId))
    : onlineUsers.has(otherUserId);

  const isTyping = typingUserIds.length > 0;
  const isConnecting = connStatus !== "connected";

  const subtitle = isTyping
    ? "Someone is typing…"
    : isConnecting
      ? "Connecting to secure network…"
      : description;

  return (
    <Box
      component="header"
      sx={{
        height: 60,
        minHeight: 60,
        px: 3,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      {/* Left side info */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
        {isGroup ? (
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.25,
              bgcolor: "action.selected",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "primary.main",
              flexShrink: 0,
            }}
          >
            <TagIcon sx={{ fontSize: 18 }} />
          </Box>
        ) : (
          <Tooltip title={otherUserId ? `View ${displayName}'s profile` : ""}>
            <Box
              onClick={() => otherUserId && onOpenProfile?.(otherUserId)}
              sx={{ position: "relative", flexShrink: 0, cursor: otherUserId ? "pointer" : "default" }}
            >
              <Avatar name={displayName} src={otherAvatarUrl} size={32} />
              <Box
                sx={{
                  position: "absolute",
                  bottom: -1,
                  right: -1,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  border: "1.5px solid var(--theme-card)",
                  bgcolor: hasOnline ? "success.main" : "text.disabled",
                }}
              />
            </Box>
          </Tooltip>
        )}

        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, fontSize: "0.92rem", letterSpacing: "-0.01em" }}
              noWrap
            >
              {displayName}
            </Typography>

            {isGroup && (
              <Chip
                label={`${groupMembers.length} members`}
                size="small"
                variant="outlined"
                sx={{
                  height: 18,
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  borderColor: "divider",
                  color: "text.secondary",
                }}
              />
            )}
          </Box>

          <Typography
            variant="caption"
            sx={{
              color: isTyping ? "primary.main" : "text.secondary",
              fontWeight: isTyping ? 700 : 400,
              fontSize: "0.72rem",
              display: "block",
            }}
            noWrap
          >
            {subtitle}
          </Typography>
        </Box>
      </Box>

      {/* Right side Communication Tools */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        {/* Avatars preview if group */}
        {isGroup && groupMembers.length > 0 && (
          <AvatarGroup
            max={4}
            sx={{
              mr: 1,
              display: { xs: "none", md: "flex" },
              "& .MuiAvatar-root": { width: 22, height: 22, fontSize: "0.65rem" },
            }}
          >
            {groupMembers.map((m) => (
              <MuiAvatar key={m.userId} alt={m.username}>
                {m.username.slice(0, 1).toUpperCase()}
              </MuiAvatar>
            ))}
          </AvatarGroup>
        )}

        <Tooltip title={callActive ? "In call" : "Start Voice Call"}>
          <IconButton
            size="small"
            onClick={() => !callActive && onStartCall?.("audio")}
            sx={{
              border: 1,
              borderColor: callActive ? "primary.main" : "divider",
              borderRadius: 1.25,
              p: 0.75,
              color: callActive ? "primary.main" : "text.secondary",
              "&:hover": { color: "primary.main", bgcolor: "action.hover" },
            }}
          >
            <CallOutlinedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>

        <Tooltip title={callActive ? "In call" : "Start Video Call"}>
          <IconButton
            size="small"
            onClick={() => !callActive && onStartCall?.("video")}
            sx={{
              border: 1,
              borderColor: callActive ? "primary.main" : "divider",
              borderRadius: 1.25,
              p: 0.75,
              color: callActive ? "primary.main" : "text.secondary",
              "&:hover": { color: "primary.main", bgcolor: "action.hover" },
            }}
          >
            <VideocamOutlinedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
