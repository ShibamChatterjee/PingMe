import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  Tooltip,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import type { MemberResponseDto } from "../lib/api";
import { Avatar as CustomAvatar } from "./Avatar";

const TextFieldAny = TextField as any;

interface Props {
  members: MemberResponseDto[];
  onlineUsers: Set<string>;
  myUserId: string;
  onClose: () => void;
  onStartDm: (userId: string, username: string) => void;
  onCreateGroup: () => void;
}

export function MemberPanel({
  members,
  onlineUsers,
  myUserId,
  onClose,
  onStartDm,
  onCreateGroup,
}: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.username.toLowerCase().includes(q) ||
        (m.role && String(m.role).toLowerCase().includes(q)),
    );
  }, [members, search]);

  // Group members into Online vs Offline
  const { online, offline } = useMemo(() => {
    const on: MemberResponseDto[] = [];
    const off: MemberResponseDto[] = [];
    for (const m of filtered) {
      if (onlineUsers.has(m.userId) || m.userId === myUserId) {
        on.push(m);
      } else {
        off.push(m);
      }
    }
    return { online: on, offline: off };
  }, [filtered, onlineUsers, myUserId]);

  const getRoleLabel = (role: any) => {
    if (!role) return "Member";
    const str = String(role);
    if (str === "0" || str === "Owner") return "Owner";
    if (str === "1" || str === "Admin") return "Admin";
    return "Member";
  };

  const renderMemberRow = (m: MemberResponseDto, isOnline: boolean) => {
    const isMe = m.userId === myUserId;
    const roleLabel = getRoleLabel(m.role);

    return (
      <ListItem
        key={m.userId}
        disablePadding
        secondaryAction={
          !isMe ? (
            <Tooltip title={`Message ${m.username}`}>
              <IconButton
                size="small"
                onClick={() => onStartDm(m.userId, m.username)}
                sx={{
                  p: 0.5,
                  color: "text.secondary",
                  "&:hover": { color: "primary.main", bgcolor: "action.hover" },
                }}
              >
                <ChatBubbleOutlineOutlinedIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          ) : null
        }
        sx={{
          borderRadius: 1.5,
          "&:hover": { bgcolor: "action.hover" },
          px: 1,
          py: 0.5,
        }}
      >
        <ListItemButton
          onClick={() => !isMe && onStartDm(m.userId, m.username)}
          sx={{ p: 0, gap: 1.25, borderRadius: 1.25 }}
        >
          <Box sx={{ position: "relative", flexShrink: 0 }}>
            <CustomAvatar name={m.username} size={28} />
            <Box
              sx={{
                position: "absolute",
                bottom: -1,
                right: -1,
                width: 7,
                height: 7,
                borderRadius: "50%",
                bgcolor: isOnline ? "success.main" : "text.disabled",
                border: "1.5px solid var(--theme-card)",
              }}
            />
          </Box>

          <ListItemText
            primary={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    color: "text.primary",
                  }}
                  noWrap
                >
                  {m.username}
                </Typography>
                {isMe && (
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem" }}>
                    (you)
                  </Typography>
                )}
              </Box>
            }
            secondary={
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.68rem",
                  color: roleLabel === "Owner" ? "primary.main" : "text.secondary",
                  fontWeight: roleLabel === "Owner" ? 700 : 500,
                }}
              >
                {roleLabel}
              </Typography>
            }
          />
        </ListItemButton>
      </ListItem>
    );
  };

  return (
    <Box
      sx={{
        width: 260,
        minWidth: 260,
        height: "100%",
        borderLeft: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.88rem" }}>
            Members
          </Typography>
          <Chip
            label={members.length}
            size="small"
            sx={{ height: 18, fontSize: "0.68rem", fontWeight: 700 }}
          />
        </Box>

        <IconButton size="small" onClick={onClose} sx={{ p: 0.5 }}>
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      {/* Search Input */}
      <Box sx={{ px: 2, py: 1.5 }}>
        <TextFieldAny
          placeholder="Filter members…"
          value={search}
          onChange={(e: any) => setSearch(e.target.value)}
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 15, color: "text.secondary" }} />
              </InputAdornment>
            ),
            style: {
              fontSize: "0.78rem",
              height: 30,
              borderRadius: 6,
            },
          }}
        />
      </Box>

      {/* Member Lists */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", px: 1.5, pb: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        {/* Online Members */}
        {online.length > 0 && (
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                fontSize: "0.68rem",
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                px: 1,
                mb: 0.5,
                display: "block",
              }}
            >
              Online — {online.length}
            </Typography>
            <List dense disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
              {online.map((m) => renderMemberRow(m, true))}
            </List>
          </Box>
        )}

        {/* Offline Members */}
        {offline.length > 0 && (
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                fontSize: "0.68rem",
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                px: 1,
                mb: 0.5,
                display: "block",
              }}
            >
              Offline — {offline.length}
            </Typography>
            <List dense disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
              {offline.map((m) => renderMemberRow(m, false))}
            </List>
          </Box>
        )}
      </Box>

      {/* Footer Quick Action */}
      <Box sx={{ p: 1.5, borderTop: 1, borderColor: "divider" }}>
        <Button
          fullWidth
          variant="outlined"
          size="small"
          onClick={onCreateGroup}
          sx={{ fontWeight: 600, fontSize: "0.78rem" }}
        >
          + Create Group
        </Button>
      </Box>
    </Box>
  );
}
