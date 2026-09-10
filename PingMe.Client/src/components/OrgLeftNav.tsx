import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  List,
  ListItemButton,
  Collapse,
  IconButton,
  Tooltip,
  ButtonBase,
  Chip,
} from "@mui/material";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import AddIcon from "@mui/icons-material/Add";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import TagIcon from "@mui/icons-material/Tag";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import type { FullOrganization } from "../lib/orgStore";
import type { DirectChat } from "../lib/api";
import type { ActiveChat } from "../lib/useChat";
import { canAccessGroup, getCanonicalRole, hasPermission } from "../lib/permissions";
import { Avatar as CustomAvatar } from "./Avatar";

export type NavView =
  | "channels"
  | "overview"
  | "chat"
  | "members"
  | "groups"
  | "files"
  | "activity"
  | "settings"
  | "workspace_hub"
  | "create_channel"
  | "tickets";

interface Props {
  org: FullOrganization;
  activeView: NavView;
  onSelectView: (view: NavView) => void;
  directChats: DirectChat[];
  activeChat: ActiveChat;
  unreadCounts: Record<string, number>;
  onlineUsers: Set<string>;
  myUserId: string;
  myRole: string;
  onOpenChat: (targetChat: ActiveChat) => void;
  onStartDm: (userId: string, username: string) => void;
  onCreateGroup: () => void;
  onOpenSettings?: () => void;
  ticketSystemEnabled?: boolean;
}

export function OrgLeftNav({
  org,
  activeView,
  onSelectView,
  directChats,
  activeChat,
  unreadCounts,
  onlineUsers,
  myUserId,
  myRole,
  onOpenChat,
  onStartDm,
  onCreateGroup,
  ticketSystemEnabled = false,
}: Props) {
  const [publicChannelsExpanded, setPublicChannelsExpanded] = useState(true);
  const [privateChannelsExpanded, setPrivateChannelsExpanded] = useState(true);
  const [dmsExpanded, setDmsExpanded] = useState(true);

  const canCreateGroup = hasPermission("create_public_groups", {
    userRole: myRole,
    workspacePolicies: org.policies,
  });
  const canOpenSettings = getCanonicalRole(myRole) === "Owner";

  // Filter accessible groups based on role and membership
  const accessibleGroups = useMemo(() => {
    return org.groups.filter((g) => {
      const isMember = g.memberUserIds.includes(myUserId);
      return canAccessGroup(myRole, isMember, g.visibility);
    });
  }, [org.groups, myRole, myUserId]);

  const publicGroups = accessibleGroups.filter((g) => g.visibility === "public");
  const privateGroups = accessibleGroups.filter((g) => g.visibility === "private");

  type MainNavItem = {
    id: NavView;
    label: string;
    icon: React.ReactNode;
    count?: number;
    unread?: number;
  };

  const mainNavItems: MainNavItem[] = [
    { id: "overview", label: "Overview", icon: <DashboardOutlinedIcon sx={{ fontSize: 18 }} /> },
    { id: "groups" as NavView, label: "All Channels", icon: <GroupsOutlinedIcon sx={{ fontSize: 18 }} />, count: accessibleGroups.length },
    { id: "members" as NavView, label: "Members Directory", icon: <PeopleAltOutlinedIcon sx={{ fontSize: 18 }} />, count: org.members.length },
    { id: "files", label: "Files & Media", icon: <FolderOutlinedIcon sx={{ fontSize: 18 }} /> },
    ...(ticketSystemEnabled ? [{ id: "tickets" as NavView, label: "Tickets", icon: <ConfirmationNumberOutlinedIcon sx={{ fontSize: 18 }} /> }] : []),
    ...(canOpenSettings ? [{ id: "activity" as NavView, label: "Audit Trail", icon: <TimelineOutlinedIcon sx={{ fontSize: 18 }} /> }] : []),
  ];

  return (
    <Box
      component="nav"
      sx={{
        width: { xs: "100%", md: 250 },
        minWidth: { xs: "100%", md: 250 },
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "var(--theme-surface)",
        borderRight: { xs: "none", md: "1px solid" },
        borderColor: "divider",
        userSelect: "none",
      }}
    >
      {/* Primary Section Links */}
      <Box sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
        {mainNavItems.map((item) => {
          const isSelected = activeView === item.id;
          return (
            <ButtonBase
              key={item.id}
              onClick={() => onSelectView(item.id as NavView)}
              sx={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 1.5,
                py: 0.75,
                borderRadius: "8px",
                color: isSelected ? "text.primary" : "text.secondary",
                bgcolor: isSelected ? "background.paper" : "transparent",
                border: "1px solid",
                borderColor: isSelected ? "divider" : "transparent",
                fontWeight: isSelected ? 700 : 500,
                fontSize: "12.5px",
                transition: "all 0.1s ease",
                "&:hover": {
                  bgcolor: isSelected ? "background.paper" : "action.hover",
                  color: "text.primary",
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                {item.icon}
                <span>{item.label}</span>
              </Box>

              {item.unread && item.unread > 0 ? (
                <Chip
                  label={item.unread}
                  size="small"
                  sx={{
                    height: 18,
                    minWidth: 18,
                    fontSize: "10.5px",
                    fontWeight: 800,
                    bgcolor: "error.main",
                    color: "#fff",
                    px: 0.5,
                    borderRadius: "10px",
                  }}
                />
              ) : item.count !== undefined ? (
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "11px", fontWeight: 600 }}>
                  {item.count}
                </Typography>
              ) : null}
            </ButtonBase>
          );
        })}
      </Box>

      {/* Workspace Hierarchical Sections (Channels & DMs) */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", px: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
        {/* PUBLIC CHANNELS */}
        <Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              py: 0.5,
              px: 0.5,
              cursor: "pointer",
            }}
            onClick={() => setPublicChannelsExpanded(!publicChannelsExpanded)}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              {publicChannelsExpanded ? (
                <KeyboardArrowDownIcon sx={{ fontSize: 16, color: "text.secondary" }} />
              ) : (
                <KeyboardArrowRightIcon sx={{ fontSize: 16, color: "text.secondary" }} />
              )}
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  fontSize: "10.5px",
                  letterSpacing: "0.06em",
                  color: "text.secondary",
                  textTransform: "uppercase",
                }}
              >
                Channels ({publicGroups.length})
              </Typography>
            </Box>

            {canCreateGroup && (
              <Tooltip title="Create Channel">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateGroup();
                  }}
                  sx={{ p: 0.25, color: "text.secondary", "&:hover": { color: "primary.main" } }}
                >
                  <AddIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          <Collapse in={publicChannelsExpanded}>
            <List dense disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.25, mt: 0.25 }}>
              {publicGroups.map((g) => {
                const isSelected = activeView === "chat" && activeChat?.kind === "group" && activeChat.chat.id === g.id;
                const isManager = g.groupManagerId === myUserId;
                const unread = unreadCounts[g.id] || 0;

                return (
                  <ListItemButton
                    key={g.id}
                    onClick={() => {
                      onOpenChat({
                        kind: "group",
                        chat: {
                          id: g.id,
                          organizationId: g.organizationId,
                          name: g.name,
                          description: g.description,
                          visibility: "public",
                          createdBy: g.createdBy,
                          members: g.memberUserIds.map((uid) => ({
                            userId: uid,
                            username: org.members.find((m) => m.userId === uid)?.username || uid,
                            joinedAt: g.createdAt,
                          })),
                          createdAt: g.createdAt,
                          updatedAt: g.createdAt,
                        },
                      });
                      onSelectView("chat");
                    }}
                    sx={{
                      py: 0.5,
                      px: 1,
                      borderRadius: "6px",
                      bgcolor: isSelected ? "background.paper" : "transparent",
                      color: isSelected ? "primary.main" : "text.primary",
                      fontWeight: isSelected ? 700 : 500,
                      border: "1px solid",
                      borderColor: isSelected ? "divider" : "transparent",
                      display: "flex",
                      justifyContent: "space-between",
                      "&:hover": { bgcolor: isSelected ? "background.paper" : "action.hover" },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                      <TagIcon sx={{ fontSize: 15, color: isSelected ? "primary.main" : "text.secondary" }} />
                      <Typography variant="body2" sx={{ fontSize: "12.5px", fontWeight: isSelected ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {g.name}
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      {unread > 0 && (
                        <Chip
                          label={unread}
                          size="small"
                          sx={{
                            height: 17,
                            minWidth: 17,
                            fontSize: "10px",
                            fontWeight: 800,
                            bgcolor: "error.main",
                            color: "#fff",
                            px: 0.4,
                            borderRadius: "10px",
                          }}
                        />
                      )}
                      {isManager && (
                        <Tooltip title="You are the Group Manager for this channel">
                          <ManageAccountsIcon sx={{ fontSize: 14, color: "#0891b2", flexShrink: 0 }} />
                        </Tooltip>
                      )}
                    </Box>
                  </ListItemButton>
                );
              })}
            </List>
          </Collapse>
        </Box>

        {/* PRIVATE CHANNELS */}
        {privateGroups.length > 0 && (
          <Box sx={{ mt: 0.5 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                py: 0.5,
                px: 0.5,
                cursor: "pointer",
              }}
              onClick={() => setPrivateChannelsExpanded(!privateChannelsExpanded)}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                {privateChannelsExpanded ? (
                  <KeyboardArrowDownIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                ) : (
                  <KeyboardArrowRightIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                )}
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 800,
                    fontSize: "10.5px",
                    letterSpacing: "0.06em",
                    color: "#d97706",
                    textTransform: "uppercase",
                  }}
                >
                  Private ({privateGroups.length})
                </Typography>
              </Box>
            </Box>

            <Collapse in={privateChannelsExpanded}>
              <List dense disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.25, mt: 0.25 }}>
                {privateGroups.map((g) => {
                  const isSelected = activeView === "chat" && activeChat?.kind === "group" && activeChat.chat.id === g.id;
                  const isManager = g.groupManagerId === myUserId;
                  const unread = unreadCounts[g.id] || 0;

                  return (
                    <ListItemButton
                      key={g.id}
                      onClick={() => {
                        onOpenChat({
                          kind: "group",
                          chat: {
                            id: g.id,
                            organizationId: g.organizationId,
                            name: g.name,
                            description: g.description,
                            visibility: "private",
                            createdBy: g.createdBy,
                            members: g.memberUserIds.map((uid) => ({
                              userId: uid,
                              username: org.members.find((m) => m.userId === uid)?.username || uid,
                              joinedAt: g.createdAt,
                            })),
                            createdAt: g.createdAt,
                            updatedAt: g.createdAt,
                          },
                        });
                        onSelectView("chat");
                      }}
                      sx={{
                        py: 0.5,
                        px: 1,
                        borderRadius: "6px",
                        bgcolor: isSelected ? "background.paper" : "transparent",
                        color: isSelected ? "#d97706" : "text.primary",
                        fontWeight: isSelected ? 700 : 500,
                        border: "1px solid",
                        borderColor: isSelected ? "rgba(217, 119, 6, 0.4)" : "transparent",
                        display: "flex",
                        justifyContent: "space-between",
                        "&:hover": { bgcolor: isSelected ? "background.paper" : "action.hover" },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                        <LockOutlinedIcon sx={{ fontSize: 14, color: "#d97706" }} />
                        <Typography variant="body2" sx={{ fontSize: "12.5px", fontWeight: isSelected ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {g.name}
                        </Typography>
                      </Box>

                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        {unread > 0 && (
                          <Chip
                            label={unread}
                            size="small"
                            sx={{
                              height: 17,
                              minWidth: 17,
                              fontSize: "10px",
                              fontWeight: 800,
                              bgcolor: "error.main",
                              color: "#fff",
                              px: 0.4,
                              borderRadius: "10px",
                            }}
                          />
                        )}
                        {isManager && (
                          <Tooltip title="You are the Group Manager for this private channel">
                            <ManageAccountsIcon sx={{ fontSize: 14, color: "#0891b2", flexShrink: 0 }} />
                          </Tooltip>
                        )}
                      </Box>
                    </ListItemButton>
                  );
                })}
              </List>
            </Collapse>
          </Box>
        )}

        {/* DIRECT MESSAGES */}
        <Box sx={{ mt: 0.5 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              py: 0.5,
              px: 0.5,
              cursor: "pointer",
            }}
            onClick={() => setDmsExpanded(!dmsExpanded)}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              {dmsExpanded ? (
                <KeyboardArrowDownIcon sx={{ fontSize: 16, color: "text.secondary" }} />
              ) : (
                <KeyboardArrowRightIcon sx={{ fontSize: 16, color: "text.secondary" }} />
              )}
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  fontSize: "10.5px",
                  letterSpacing: "0.06em",
                  color: "text.secondary",
                  textTransform: "uppercase",
                }}
              >
                Direct Messages
              </Typography>
            </Box>
          </Box>

          <Collapse in={dmsExpanded}>
            <List dense disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.25, mt: 0.25 }}>
              {org.members
                .filter((m) => m.userId !== myUserId && !m.isSuspended)
                .map((m) => {
                  const matchingDm = directChats.find((d) => d.otherUserId === m.userId);
                  const isSelected = activeView === "chat" && activeChat?.kind === "dm" && (activeChat.chat.otherUserId === m.userId || activeChat.chat.otherUsername === m.username);
                  const isOnline = m.status === "online" || onlineUsers.has(m.userId);
                  const unread = (matchingDm ? unreadCounts[matchingDm.id] : 0) || unreadCounts[m.userId] || 0;

                  return (
                    <ListItemButton
                      key={m.userId}
                      onClick={() => onStartDm(m.userId, m.username)}
                      sx={{
                        py: 0.5,
                        px: 1,
                        borderRadius: "6px",
                        bgcolor: isSelected ? "background.paper" : "transparent",
                        color: isSelected ? "primary.main" : "text.primary",
                        fontWeight: isSelected ? 700 : 500,
                        border: "1px solid",
                        borderColor: isSelected ? "divider" : "transparent",
                        display: "flex",
                        justifyContent: "space-between",
                        "&:hover": { bgcolor: isSelected ? "background.paper" : "action.hover" },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                        <Box sx={{ position: "relative" }}>
                          <CustomAvatar name={m.username} src={m.avatarUrl} size={24} />
                          <Box
                            sx={{
                              position: "absolute",
                              bottom: -1,
                              right: -1,
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              bgcolor: isOnline ? "#22c55e" : "#94a3b8",
                              border: "1px solid #fff",
                            }}
                          />
                        </Box>
                        <Typography variant="body2" sx={{ fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {m.username}
                        </Typography>
                      </Box>

                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        {unread > 0 && (
                          <Chip
                            label={unread}
                            size="small"
                            sx={{
                              height: 17,
                              minWidth: 17,
                              fontSize: "10px",
                              fontWeight: 800,
                              bgcolor: "error.main",
                              color: "#fff",
                              px: 0.4,
                              borderRadius: "10px",
                            }}
                          />
                        )}
                        {/* <RoleBadge role={m.role} size="small" showIcon={false} /> */}
                      </Box>
                    </ListItemButton>
                  );
                })}
            </List>
          </Collapse>
        </Box>
      </Box>

      {/* Footer with Settings & User Status
      <Box sx={{ p: 1.5, borderTop: "1px solid", borderColor: "divider" }}>

        {isGuest && (
          <Box sx={{ px: 1.5, py: 0.5, display: "flex", alignItems: "center", gap: 1 }}>
            <LockPersonOutlinedIcon sx={{ fontSize: 16, color: "#ea580c" }} />
            <Typography variant="caption" sx={{ color: "#ea580c", fontWeight: 700, fontSize: "11px" }}>
              Guest Mode Active
            </Typography>
          </Box>
        )}
      </Box> */}
    </Box>
  );
}
