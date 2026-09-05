import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type DirectChat, type Group, type MemberResponseDto, type OrganizationResponseDto } from "../lib/api";
import type { ActiveChat } from "../lib/useChat";
import type { ConnStatus } from "../lib/hub";
import { fmtTime } from "../lib/utils";
import { Avatar as CustomAvatar } from "./Avatar";
import {
  Box,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
} from "@mui/material";

const TextFieldAny = TextField as any;
import SettingsIcon from "@mui/icons-material/Settings";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import AddIcon from "@mui/icons-material/Add";
import GroupsIcon from "@mui/icons-material/Groups";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import ClearIcon from "@mui/icons-material/Clear";

interface Props {
  org: OrganizationResponseDto;
  token: string;
  myUserId: string;
  directChats: DirectChat[];
  groups: Group[];
  activeChat: ActiveChat;
  unreadCounts: Record<string, number>;
  onlineUsers: Set<string>;
  connStatus: ConnStatus;
  username: string;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onOpenChat: (chat: ActiveChat) => void;
  onStartDm: (userId: string, username: string) => void;
  onCreateGroup: () => void;
  onLogout: () => void;
  onOpenSettings: () => void;
}

export function OrgSidebar({
  org,
  token,
  myUserId,
  directChats,
  groups,
  activeChat,
  unreadCounts = {},
  onlineUsers,
  connStatus,
  username,
  theme,
  onToggleTheme,
  onOpenChat,
  onStartDm,
  onCreateGroup,
  onLogout,
  onOpenSettings,
}: Props) {
  const [members, setMembers] = useState<MemberResponseDto[]>([]);
  const [query, setQuery] = useState("");
  const [membersOpen, setMembersOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);
  const [groupsOpen, setGroupsOpen] = useState(true);

  const loadMembers = useCallback(async () => {
    try {
      const list = await api.orgs.getMembers(token, org.id);
      setMembers(list);
    } catch {
      // silent
    }
  }, [token, org.id]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const q = query.trim().toLowerCase();

  const filteredMembers = useMemo(
    () => (q ? members.filter((m) => m.username.toLowerCase().includes(q)) : members),
    [members, q],
  );

  const filteredDms = useMemo(
    () =>
      q
        ? directChats.filter((d) => d.otherUsername.toLowerCase().includes(q))
        : directChats,
    [directChats, q],
  );

  const filteredGroups = useMemo(
    () => (q ? groups.filter((g) => g.name.toLowerCase().includes(q)) : groups),
    [groups, q],
  );

  const badgeLabel =
    connStatus === "connected"
      ? "Connected"
      : connStatus === "connecting"
        ? "Connecting…"
        : "Disconnected";

  const isAdminOrOwner = org.myRole === "Owner";
  const activeChatId = activeChat?.chat.id ?? null;

  return (
    <Box sx={{ width: 260, minWidth: 260, height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.paper", borderRight: 1, borderColor: "divider" }}>
      {/* Org header */}
      <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              fontWeight: "black",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              boxShadow: 1,
              flexShrink: 0,
            }}
          >
            {org.name.slice(0, 2).toUpperCase()}
          </Box>
          <Box sx={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 0.25 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: "bold", lineHeight: 1.2 }} noWrap>
              {org.name}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  bgcolor: connStatus === "connected" ? "success.main" : connStatus === "connecting" ? "warning.main" : "error.main",
                }}
              />
              <Typography variant="caption" sx={{ fontSize: "10px", color: "text.secondary", fontWeight: "medium", lineHeight: 1 }}>
                {badgeLabel}
              </Typography>
            </Box>
          </Box>
        </Box>

        <IconButton size="small" onClick={onOpenSettings} sx={{ border: 1, borderColor: "divider", borderRadius: 1.5 }}>
          <SettingsIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      {/* Search box */}
      <Box sx={{ p: 1.5 }}>
        <TextFieldAny
          placeholder="Search members, chats..."
          value={query}
          onChange={(e: any) => setQuery(e.target.value)}
          fullWidth
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 16, color: "text.secondary" }} />
              </InputAdornment>
            ),
            endAdornment: query ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setQuery("")}>
                  <ClearIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </InputAdornment>
            ) : null,
            style: { fontSize: "12px", height: 32, borderRadius: 8 },
          }}
        />
      </Box>

      {/* Scrollable list content */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", px: 1, display: "flex", flexDirection: "column", gap: 3, pb: 2 }}>
        {/* ── MEMBERS section ── */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <ListItemButton
            dense
            onClick={() => setMembersOpen((v) => !v)}
            sx={{
              py: 0.5,
              px: 1,
              borderRadius: 1,
              justifyContent: "flex-start",
              gap: 0.5,
              color: "text.secondary",
            }}
          >
            {membersOpen ? (
              <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
            ) : (
              <KeyboardArrowRightIcon sx={{ fontSize: 16 }} />
            )}
            <Typography variant="caption" sx={{ fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1 }}>
              Members ({filteredMembers.length})
            </Typography>
          </ListItemButton>

          <Collapse in={membersOpen}>
            <List dense disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.25, pl: 1 }}>
              {filteredMembers.map((m) => {
                const isOnline = onlineUsers.has(m.userId);
                const isMe = m.userId === myUserId;
                return (
                  <ListItem key={m.userId} disablePadding>
                    <ListItemButton
                      disabled={isMe}
                      onClick={() => !isMe && onStartDm(m.userId, m.username)}
                      sx={{
                        borderRadius: 1.5,
                        py: 0.5,
                        px: 1,
                        "&.Mui-disabled": { opacity: 1 },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32, position: "relative" }}>
                        <CustomAvatar name={m.username} size={24} />
                        <Box
                          sx={{
                            position: "absolute",
                            bottom: -2,
                            right: 6,
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            border: 1,
                            borderColor: "background.paper",
                            bgcolor: isOnline ? "success.main" : "text.disabled",
                          }}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: "medium", color: "text.primary" }} noWrap>
                            {m.username}
                            {isMe && (
                              <Typography component="span" variant="caption" sx={{ color: "text.secondary", opacity: 0.6 }}>
                                {" "}(you)
                              </Typography>
                            )}
                          </Typography>
                        }
                      />
                      {String(m.role) !== "Member" && String(m.role) !== "2" && (
                        <Box
                          component="span"
                          sx={{
                            fontSize: "9px",
                            fontWeight: "bold",
                            px: 0.5,
                            py: 0.1,
                            borderRadius: 0.5,
                            bgcolor: "action.selected",
                            color: "text.secondary",
                            textTransform: "uppercase",
                          }}
                        >
                          {m.role}
                        </Box>
                      )}
                    </ListItemButton>
                  </ListItem>
                );
              })}

              {isAdminOrOwner && !q && (
                <ListItemButton
                  dense
                  onClick={onOpenSettings}
                  sx={{
                    borderRadius: 1.5,
                    py: 0.5,
                    px: 1,
                    color: "primary.main",
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32, color: "primary.main" }}>
                    <AddIcon sx={{ fontSize: 16 }} />
                  </ListItemIcon>
                  <ListItemText primary={<Typography variant="body2" sx={{ fontWeight: "bold" }}>Invite members</Typography>} />
                </ListItemButton>
              )}
            </List>
          </Collapse>
        </Box>

        {/* ── DIRECT CHATS section ── */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <ListItemButton
            dense
            onClick={() => setDmsOpen((v) => !v)}
            sx={{
              py: 0.5,
              px: 1,
              borderRadius: 1,
              justifyContent: "flex-start",
              gap: 0.5,
              color: "text.secondary",
            }}
          >
            {dmsOpen ? (
              <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
            ) : (
              <KeyboardArrowRightIcon sx={{ fontSize: 16 }} />
            )}
            <Typography variant="caption" sx={{ fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1 }}>
              Direct Messages {filteredDms.length > 0 ? `(${filteredDms.length})` : ""}
            </Typography>
          </ListItemButton>

          <Collapse in={dmsOpen}>
            <List dense disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.25, pl: 1 }}>
              {filteredDms.length === 0 ? (
                <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic", p: 1.5, display: "block" }}>
                  No direct messages yet
                </Typography>
              ) : (
                filteredDms.map((dm) => {
                  const isActive = activeChatId === dm.id;
                  const isOnline = onlineUsers.has(dm.otherUserId);
                  const unread = unreadCounts[dm.id] ?? 0;
                  return (
                    <ListItem key={dm.id} disablePadding>
                      <ListItemButton
                        onClick={() => onOpenChat({ kind: "dm", chat: dm })}
                        selected={isActive}
                        sx={{
                          borderRadius: 1.5,
                          py: 0.5,
                          px: 1,
                          "&.Mui-selected": {
                            bgcolor: "action.selected",
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 32, position: "relative" }}>
                          <CustomAvatar name={dm.otherUsername} size={24} />
                          <Box
                            sx={{
                              position: "absolute",
                              bottom: -2,
                              right: 6,
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              border: 1,
                              borderColor: "background.paper",
                              bgcolor: isOnline ? "success.main" : "text.disabled",
                            }}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ fontWeight: isActive ? "bold" : "medium", color: "text.primary" }} noWrap>
                              {dm.otherUsername}
                            </Typography>
                          }
                        />
                        {dm.updatedAt && !unread && (
                          <Typography variant="caption" sx={{ color: "text.secondary", opacity: 0.6, fontSize: "10px", ml: 1, flexShrink: 0 }}>
                            {fmtTime(dm.updatedAt)}
                          </Typography>
                        )}
                        {unread > 0 && (
                          <Box
                            sx={{
                              bgcolor: "primary.main",
                              color: "primary.contrastText",
                              borderRadius: "10px",
                              px: 0.75,
                              py: 0.1,
                              fontSize: "10px",
                              fontWeight: "bold",
                            }}
                          >
                            {unread > 99 ? "99+" : unread}
                          </Box>
                        )}
                      </ListItemButton>
                    </ListItem>
                  );
                })
              )}
            </List>
          </Collapse>
        </Box>

        {/* ── GROUPS section ── */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <ListItemButton
            dense
            onClick={() => setGroupsOpen((v) => !v)}
            sx={{
              py: 0.5,
              px: 1,
              borderRadius: 1,
              justifyContent: "flex-start",
              gap: 0.5,
              color: "text.secondary",
            }}
          >
            {groupsOpen ? (
              <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
            ) : (
              <KeyboardArrowRightIcon sx={{ fontSize: 16 }} />
            )}
            <Typography variant="caption" sx={{ fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1 }}>
              Groups {filteredGroups.length > 0 ? `(${filteredGroups.length})` : ""}
            </Typography>
          </ListItemButton>

          <Collapse in={groupsOpen}>
            <List dense disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.25, pl: 1 }}>
              {filteredGroups.map((g) => {
                const isActive = activeChatId === g.id;
                const unread = unreadCounts[g.id] ?? 0;
                return (
                  <ListItem key={g.id} disablePadding>
                    <ListItemButton
                      onClick={() => onOpenChat({ kind: "group", chat: g })}
                      selected={isActive}
                      sx={{
                        borderRadius: 1.5,
                        py: 0.5,
                        px: 1,
                        "&.Mui-selected": {
                          bgcolor: "action.selected",
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: 1,
                            bgcolor: isActive ? "primary.main" : "action.selected",
                            color: isActive ? "primary.contrastText" : "text.secondary",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <GroupsIcon sx={{ fontSize: 14 }} />
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: isActive ? "bold" : "medium", color: "text.primary", lineHeight: 1.2 }} noWrap>
                              {g.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary", opacity: 0.8, fontSize: "10px", lineHeight: 1 }} noWrap>
                              {g.members.length} members
                            </Typography>
                          </Box>
                        }
                      />
                      {g.updatedAt && !unread && (
                        <Typography variant="caption" sx={{ color: "text.secondary", opacity: 0.6, fontSize: "10px", ml: 1, flexShrink: 0 }}>
                          {fmtTime(g.updatedAt)}
                        </Typography>
                      )}
                      {unread > 0 && (
                        <Box
                          sx={{
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                            borderRadius: "10px",
                            px: 0.75,
                            py: 0.1,
                            fontSize: "10px",
                            fontWeight: "bold",
                          }}
                        >
                          {unread > 99 ? "99+" : unread}
                        </Box>
                      )}
                    </ListItemButton>
                  </ListItem>
                );
              })}

              {!q && (
                <ListItemButton
                  dense
                  onClick={onCreateGroup}
                  sx={{
                    borderRadius: 1.5,
                    py: 0.5,
                    px: 1,
                    color: "primary.main",
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32, color: "primary.main" }}>
                    <AddIcon sx={{ fontSize: 16 }} />
                  </ListItemIcon>
                  <ListItemText primary={<Typography variant="body2" sx={{ fontWeight: "bold" }}>Create Group</Typography>} />
                </ListItemButton>
              )}
            </List>
          </Collapse>
        </Box>
      </Box>

      {/* User panel footer */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: "divider", bgcolor: "background.default", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
          <CustomAvatar name={username} size={32} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ fontWeight: "bold", color: "text.primary", lineHeight: 1.2, display: "block" }} noWrap>
              {username}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "success.main" }} />
              <Typography variant="caption" sx={{ fontSize: "9px", color: "text.secondary", fontWeight: "bold", textTransform: "uppercase" }}>
                Active
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <IconButton size="small" onClick={onToggleTheme} title={theme === "dark" ? "Light mode" : "Dark mode"}>
            {theme === "dark" ? <LightModeIcon sx={{ fontSize: 18 }} /> : <DarkModeIcon sx={{ fontSize: 18 }} />}
          </IconButton>
          <IconButton size="small" onClick={onLogout} title="Sign out" color="error">
            <ExitToAppIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}
