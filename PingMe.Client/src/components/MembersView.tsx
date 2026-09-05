import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Paper,
  Chip,
  Tabs,
  Tab,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PersonAddOutlinedIcon from "@mui/icons-material/PersonAddOutlined";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import type { FullOrganization, OrgMember } from "../lib/orgStore";
import { hasPermission, getCanonicalRole } from "../lib/permissions";
import { RoleBadge } from "./RoleBadge";
import { Avatar as CustomAvatar } from "./Avatar";

const TextFieldAny = TextField as any;

interface Props {
  org: FullOrganization;
  currentUserId: string;
  currentUserRole: string;
  onlineUsers: Set<string>;
  onOpenInvite: () => void;
  onSelectMember?: (member: OrgMember) => void;
}

export function MembersView({
  org,
  currentUserId,
  currentUserRole,
  onlineUsers,
  onOpenInvite,
  onSelectMember,
}: Props) {
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const canInvite = hasPermission("invite_members", {
    userRole: currentUserRole,
    workspacePolicies: org.policies,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return org.members.filter((m) => {
      const matchQuery =
        !q ||
        m.username.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.title && m.title.toLowerCase().includes(q)) ||
        (m.department && m.department.toLowerCase().includes(q)) ||
        m.role.toLowerCase().includes(q);

      const canonical = getCanonicalRole(m.role);
      const isOnline = m.userId === currentUserId || onlineUsers.has(m.userId);

      let matchFilter = true;
      if (selectedFilter === "online") matchFilter = isOnline;
      else if (selectedFilter === "owners") matchFilter = canonical === "Owner";
      else if (selectedFilter === "managers") matchFilter = canonical === "Manager";
      else if (selectedFilter === "members") matchFilter = canonical === "Member";

      return matchQuery && matchFilter;
    });
  }, [org.members, search, selectedFilter, currentUserId, onlineUsers]);

  const counts = useMemo(() => {
    return {
      all: org.members.length,
      online: org.members.filter((m) => m.userId === currentUserId || onlineUsers.has(m.userId)).length,
      owners: org.members.filter((m) => getCanonicalRole(m.role) === "Owner").length,
      managers: org.members.filter((m) => getCanonicalRole(m.role) === "Manager").length,
      members: org.members.filter((m) => getCanonicalRole(m.role) === "Member").length,
    };
  }, [org.members, currentUserId, onlineUsers]);

  return (
    <Box
      sx={{
        flexGrow: 1,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
        overflowY: "auto",
        p: { xs: 2, md: 3.5 },
      }}
    >
      {/* Header Banner */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
          mb: 3,
          pb: 2.5,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <div>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.015em" }}>
            Organization Directory
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            All active members, group managers, and workspace owners in {org.name}.
          </Typography>
        </div>

        {canInvite && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<PersonAddOutlinedIcon />}
            onClick={onOpenInvite}
            sx={{ fontWeight: 700, textTransform: "none", px: 2, py: 0.8, borderRadius: "8px" }}
          >
            + Invite Members
          </Button>
        )}
      </Box>

      {/* Filter Tabs & Search Bar */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", md: "center" },
          gap: 2,
          mb: 3,
        }}
      >
        <Tabs
          value={selectedFilter}
          onChange={(_, v) => setSelectedFilter(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 36,
            "& .MuiTab-root": {
              minHeight: 36,
              py: 0.5,
              px: 1.5,
              fontSize: "12.5px",
              fontWeight: 700,
              textTransform: "none",
            },
          }}
        >
          <Tab value="all" label={`All (${counts.all})`} />
          <Tab
            value="online"
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#22c55e" }} />
                <span>Online ({counts.online})</span>
              </Box>
            }
          />
          <Tab value="owners" label={`Owners (${counts.owners})`} />
          <Tab value="managers" label={`Group Managers (${counts.managers})`} />
        </Tabs>

        <Box sx={{ minWidth: 260 }}>
          <TextFieldAny
            size="small"
            placeholder="Search members by name, email, department..."
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Box>

      {/* Member Cards Grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(auto-fill, minmax(320px, 1fr))",
          },
          gap: 2,
        }}
      >
        {filtered.map((m) => {
          const isMe = m.userId === currentUserId;
          const isOnline = isMe || onlineUsers.has(m.userId);
          const userManagedGroups = org.groups.filter((g) => g.groupManagerId === m.userId);
          const managedGroupIds = new Set(userManagedGroups.map((g) => g.id));
          const userAssignedGroups = org.groups.filter(
            (g) => g.memberUserIds.includes(m.userId) && !managedGroupIds.has(g.id),
          );

          const subtitleText =
            m.title ||
            m.department ||
            (m.role === "Owner" ? "Workspace Owner" : `${m.role} in ${org.name}`);

          return (
            <Paper
              key={m.userId}
              variant="outlined"
              onClick={() => onSelectMember && onSelectMember(m)}
              sx={{
                p: 2.5,
                borderRadius: "12px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                bgcolor: "background.paper",
                height: 160,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                "&:hover": {
                  boxShadow: "0 8px 24px -4px rgba(0,0,0,0.09)",
                  borderColor: "primary.main",
                  transform: "translateY(-2px)",
                },
              }}
            >
              {/* Top Section: Avatar, Info & Role */}
              <Box>
                <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                    <Box sx={{ position: "relative", flexShrink: 0 }}>
                      <CustomAvatar name={m.username} src={m.avatarUrl} size={42} />
                      <Box
                        sx={{
                          position: "absolute",
                          bottom: 0,
                          right: 0,
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          bgcolor: isOnline ? "#22c55e" : "#94a3b8",
                          border: "2px solid #fff",
                        }}
                      />
                    </Box>

                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 800,
                          fontSize: "13.5px",
                          lineHeight: 1.25,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {m.username} {isMe && <span style={{ opacity: 0.6, fontSize: "11px", fontWeight: 600 }}>(You)</span>}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: "block",
                          fontSize: "11.5px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          mt: 0.25,
                        }}
                      >
                        {m.email}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ flexShrink: 0 }}>
                    <RoleBadge role={m.role} isSuspended={m.isSuspended} size="small" />
                  </Box>
                </Box>

                {/* Subtitle / Role Designation */}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: "block",
                    fontWeight: 600,
                    fontSize: "11.5px",
                    mt: 1.25,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {subtitleText}
                </Typography>

                {/* Channel & Manager Tags */}
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "nowrap",
                    gap: 0.5,
                    alignItems: "center",
                    mt: 1,
                    overflow: "hidden",
                    height: 24,
                  }}
                >
                  {userManagedGroups.length > 0 && (
                    <Tooltip title={`Group Manager for #${userManagedGroups.map((g) => g.name).join(", #")}`}>
                      <Chip
                        icon={<ManageAccountsIcon sx={{ fontSize: "12px !important" }} />}
                        label={`Manager of #${userManagedGroups[0].name}${userManagedGroups.length > 1 ? ` +${userManagedGroups.length - 1}` : ""}`}
                        size="small"
                        sx={{
                          fontSize: "10.5px",
                          fontWeight: 700,
                          height: 22,
                          bgcolor: "rgba(6, 182, 212, 0.1)",
                          color: "#0891b2",
                          borderColor: "rgba(6, 182, 212, 0.25)",
                          maxWidth: 160,
                        }}
                      />
                    </Tooltip>
                  )}

                  {userAssignedGroups.slice(0, userManagedGroups.length > 0 ? 2 : 3).map((g) => (
                    <Chip
                      key={g.id}
                      label={`#${g.name}`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: "10.5px", height: 22, color: "text.secondary", maxWidth: 100 }}
                    />
                  ))}

                  {userAssignedGroups.length > (userManagedGroups.length > 0 ? 2 : 3) && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "10.5px", fontWeight: 700, flexShrink: 0 }}>
                      +{userAssignedGroups.length - (userManagedGroups.length > 0 ? 2 : 3)}
                    </Typography>
                  )}

                  {userManagedGroups.length === 0 && userAssignedGroups.length === 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "10.5px", fontStyle: "italic" }}>
                      No channels assigned
                    </Typography>
                  )}
                </Box>
              </Box>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}
