import { useState, useMemo, useRef } from "react";
import {
  Box,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  MenuList,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  ButtonBase,
  Paper,
  Popper,
  ClickAwayListener,
  Badge,
  Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CorporateFareIcon from "@mui/icons-material/CorporateFare";
import CheckIcon from "@mui/icons-material/Check";
import AddIcon from "@mui/icons-material/Add";
import TagIcon from "@mui/icons-material/Tag";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import MenuIcon from "@mui/icons-material/Menu";
import { ThemeSwitcher } from "./ThemeSwitcher";
import type { ThemeKey } from "../theme";
import type { FullOrganization } from "../lib/orgStore";
import type { ConnStatus } from "../lib/hub";
import { Avatar as CustomAvatar } from "./Avatar";

const TextFieldAny = TextField as any;

interface Props {
  org: FullOrganization;
  allOrgs: FullOrganization[];
  myUserId: string;
  myRole: string;
  activeView: string;
  memberCount: number;
  username: string;
  connStatus: ConnStatus;
  themeKey: ThemeKey;
  unreadCounts?: Record<string, number>;
  onSelectTheme: (key: ThemeKey) => void;
  onSwitchOrg: (org: FullOrganization) => void;
  onCreateOrg: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onStartDm?: (userId: string, username: string) => void;
  onOpenGroup?: (group: any) => void;
  onOpenMyProfile?: () => void;
  onMarkAllRead?: () => void;
  onBackToChannels?: () => void;
}

export function OrgHeader({
  org,
  allOrgs,
  myUserId,
  myRole,
  activeView,
  username,
  themeKey,
  unreadCounts = {},
  onSelectTheme,
  onSwitchOrg,
  onCreateOrg,
  onOpenSettings,
  onLogout,
  searchQuery,
  onSearchChange,
  onStartDm,
  onOpenGroup,
  onOpenMyProfile,
  onMarkAllRead,
  onBackToChannels,
}: Props) {
  const [profileAnchor, setProfileAnchor] = useState<HTMLElement | null>(null);
  const [orgSwitchAnchor, setOrgSwitchAnchor] = useState<HTMLElement | null>(null);
  const [notifAnchor, setNotifAnchor] = useState<HTMLElement | null>(null);
  const searchInputRef = useRef<HTMLDivElement | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const isOwner = myRole.toLowerCase() === "owner";

  // Current user's avatar from members list
  const myMember = org.members.find((m) => m.userId === myUserId);
  const myAvatarUrl = myMember?.avatarUrl;

  // Calculate unread items
  const unreadItems = useMemo(() => {
    const items: Array<{ id: string; name: string; count: number; type: "channel" | "dm"; data?: any }> = [];

    // Check channels
    for (const g of org.groups) {
      const count = unreadCounts[g.id] || 0;
      if (count > 0) {
        items.push({ id: g.id, name: `#${g.name}`, count, type: "channel", data: g });
      }
    }

    // Check DMs
    for (const m of org.members) {
      if (m.userId === myUserId) continue;
      const count = unreadCounts[m.userId] || 0;
      if (count > 0) {
        items.push({ id: m.userId, name: m.username, count, type: "dm", data: m });
      }
    }

    return items;
  }, [unreadCounts, org.groups, org.members, myUserId]);

  const totalUnreadCount = useMemo(() => {
    return Object.values(unreadCounts).reduce((acc, count) => acc + (count || 0), 0);
  }, [unreadCounts]);

  // Search Results
  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return { channels: [], members: [] };

    const channels = org.groups.filter(
      (g) => g.name.toLowerCase().includes(q) || (g.description && g.description.toLowerCase().includes(q)),
    );

    const members = org.members.filter(
      (m) =>
        m.username.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.title && m.title.toLowerCase().includes(q)),
    );

    return { channels, members };
  }, [searchQuery, org.groups, org.members]);

  const showSearchResults = searchFocused && searchQuery.trim().length > 0;

  return (
    <Box
      component="header"
      sx={{
        height: 56,
        minHeight: 56,
        px: { xs: 1.25, sm: 2.5 },
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        zIndex: 10,
      }}
    >
      {/* Left: Prominent Current Organization Title with Switcher */}
      <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.75, sm: 1.5 }, minWidth: 0 }}>
        {onBackToChannels && activeView !== "channels" && (
          <Tooltip title="View Channels & DMs">
            <IconButton
              size="small"
              onClick={onBackToChannels}
              sx={{
                display: { xs: "inline-flex", md: "none" },
                color: "text.secondary",
                p: 0.75,
                mr: 0.25,
                "&:hover": { color: "primary.main" },
              }}
              aria-label="View channels"
            >
              <MenuIcon sx={{ fontSize: 22 }} />
            </IconButton>
          </Tooltip>
        )}

        <ButtonBase
          onClick={(e) => setOrgSwitchAnchor(e.currentTarget)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            px: 1.25,
            py: 0.5,
            borderRadius: "8px",
            maxWidth: { xs: 180, sm: 260 },
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          {org.logoUrl ? (
            <Box
              component="img"
              src={org.logoUrl}
              sx={{ width: 28, height: 28, borderRadius: "6px", objectFit: "cover" }}
            />
          ) : (
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: "6px",
                bgcolor: "primary.main",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: "13px",
              }}
            >
              {org.name.slice(0, 1).toUpperCase()}
            </Box>
          )}

          <Box sx={{ textAlign: "left", minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2 }} noWrap>
                {org.name}
              </Typography>
              <KeyboardArrowDownIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "10.5px", display: "block" }} noWrap>
              pingme.io/{org.slug || org.name.toLowerCase().replace(/\s+/g, "-")}
            </Typography>
          </Box>
        </ButtonBase>

        {/* <Divider orientation="vertical" flexItem sx={{ height: 24, my: "auto" }} /> */}

        {/* Current User Active Role in this Org */}
        {/* <RoleBadge role={myRole} size="small" /> */}
      </Box>

      {/* Organization Switcher Menu */}
      <Menu
        anchorEl={orgSwitchAnchor}
        open={Boolean(orgSwitchAnchor)}
        onClose={() => setOrgSwitchAnchor(null)}
        slotProps={{ paper: { sx: { width: 280, p: 1, borderRadius: "10px" } } }}
      >
        <Box sx={{ px: 1.5, py: 1, borderBottom: "1px solid", borderColor: "divider", mb: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, textTransform: "uppercase", color: "text.secondary" }}>
            Switch Workspace
          </Typography>
        </Box>

        {allOrgs.map((o) => {
          const isSelected = o.id === org.id;
          return (
            <MenuItem
              key={o.id}
              selected={isSelected}
              onClick={() => {
                onSwitchOrg(o);
                setOrgSwitchAnchor(null);
              }}
              sx={{ borderRadius: "6px", my: 0.25, display: "flex", justifyContent: "space-between" }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                {o.logoUrl ? (
                  <Box component="img" src={o.logoUrl} sx={{ width: 22, height: 22, borderRadius: "4px", objectFit: "cover" }} />
                ) : (
                  <CorporateFareIcon sx={{ fontSize: 20, color: "primary.main" }} />
                )}
                <div>
                  <Typography variant="body2" sx={{ fontWeight: isSelected ? 800 : 600 }}>
                    {o.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {o.members.length} members
                  </Typography>
                </div>
              </Box>
              {isSelected && <CheckIcon sx={{ fontSize: 16, color: "primary.main" }} />}
            </MenuItem>
          );
        })}

        <Divider sx={{ my: 1 }} />

        <MenuItem
          onClick={() => {
            onCreateOrg();
            setOrgSwitchAnchor(null);
          }}
          sx={{ borderRadius: "6px" }}
        >
          <ListItemIcon>
            <AddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={<Typography sx={{ fontSize: "12.5px", fontWeight: 700 }}>Create New Organization</Typography>} />
        </MenuItem>
      </Menu>

      {/* Center Search Bar with Instant Member & Channel Dropdown (Expanded Big Width) */}
      <Box sx={{ display: { xs: "none", md: "flex" }, width: { md: 460, lg: 580 }, maxWidth: 640, position: "relative" }} ref={searchInputRef}>
        <TextFieldAny
          placeholder="Search members, channels, files, or messages..."
          value={searchQuery}
          onChange={(e: any) => onSearchChange(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          size="small"
          fullWidth
          sx={{
            "& .MuiOutlinedInput-root": {
              height: 36,
              fontSize: "13px",
              bgcolor: "action.hover",
              borderRadius: "8px",
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              </InputAdornment>
            ),
          }}
        />

        {showSearchResults && (
          <ClickAwayListener onClickAway={() => setSearchFocused(false)}>
            <Popper
              open={showSearchResults}
              anchorEl={searchInputRef.current}
              placement="bottom-start"
              style={{ width: searchInputRef.current?.clientWidth || 460, zIndex: 1300 }}
            >
              <Paper
                variant="outlined"
                sx={{
                  mt: 0.75,
                  maxHeight: 360,
                  overflowY: "auto",
                  borderRadius: "10px",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                  bgcolor: "background.paper",
                  p: 1,
                }}
              >
                <MenuList dense disablePadding>
                  {/* Channels Results */}
                  {searchResults.channels.length > 0 && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" sx={{ px: 1, py: 0.5, fontWeight: 800, color: "text.secondary", textTransform: "uppercase" }}>
                        Channels
                      </Typography>
                      {searchResults.channels.map((g) => (
                        <MenuItem
                          key={g.id}
                          onClick={() => {
                            onOpenGroup?.(g);
                            setSearchFocused(false);
                          }}
                          sx={{ borderRadius: "6px", py: 0.75, gap: 1 }}
                        >
                          {g.visibility === "private" ? (
                            <LockOutlinedIcon sx={{ fontSize: 16, color: "warning.main" }} />
                          ) : (
                            <TagIcon sx={{ fontSize: 16, color: "primary.main" }} />
                          )}
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {g.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {g.description || "Channel discussion"}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Box>
                  )}

                  {/* Members Results */}
                  {searchResults.members.length > 0 && (
                    <Box>
                      <Typography variant="caption" sx={{ px: 1, py: 0.5, fontWeight: 800, color: "text.secondary", textTransform: "uppercase" }}>
                        Members
                      </Typography>
                      {searchResults.members.map((m) => (
                        <MenuItem
                          key={m.userId}
                          onClick={() => {
                            onStartDm?.(m.userId, m.username);
                            setSearchFocused(false);
                          }}
                          sx={{ borderRadius: "6px", py: 0.75, gap: 1 }}
                        >
                          <CustomAvatar name={m.username} src={m.avatarUrl} size={26} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {m.username}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {m.email}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Box>
                  )}

                  {searchResults.channels.length === 0 && searchResults.members.length === 0 && (
                    <Box sx={{ p: 2, textAlign: "center" }}>
                      <Typography variant="caption" color="text.secondary">
                        No matching channels or members found for "{searchQuery}"
                      </Typography>
                    </Box>
                  )}
                </MenuList>
              </Paper>
            </Popper>
          </ClickAwayListener>
        )}
      </Box>

      {/* Right Controls: Notifications, Theme Switcher, Settings (Owner only) & User Profile */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
        {/* Notification Bell with Dropdown Menu */}
        <Tooltip title="Notifications & Unread messages">
          <IconButton
            size="small"
            onClick={(e) => setNotifAnchor(e.currentTarget)}
            sx={{
              color: totalUnreadCount > 0 ? "primary.main" : "text.secondary",
              "&:hover": { color: "text.primary" },
            }}
          >
            <Badge badgeContent={totalUnreadCount} color="error" max={99}>
              {totalUnreadCount > 0 ? (
                <NotificationsActiveIcon sx={{ fontSize: 20 }} />
              ) : (
                <NotificationsNoneOutlinedIcon sx={{ fontSize: 20 }} />
              )}
            </Badge>
          </IconButton>
        </Tooltip>

        {/* Notifications Popover Menu */}
        <Menu
          anchorEl={notifAnchor}
          open={Boolean(notifAnchor)}
          onClose={() => setNotifAnchor(null)}
          slotProps={{ paper: { sx: { width: 320, borderRadius: "10px", p: 1 } } }}
        >
          <Box sx={{ px: 1.5, py: 1, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid", borderColor: "divider", mb: 0.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Notifications
            </Typography>
            {totalUnreadCount > 0 && (
              <Button
                size="small"
                onClick={() => {
                  onMarkAllRead?.();
                  setNotifAnchor(null);
                }}
                startIcon={<DoneAllIcon sx={{ fontSize: 14 }} />}
                sx={{ fontSize: "11px", fontWeight: 700, textTransform: "none", py: 0.25 }}
              >
                Mark all read
              </Button>
            )}
          </Box>

          {unreadItems.length > 0 ? (
            <Box sx={{ maxHeight: 280, overflowY: "auto" }}>
              {unreadItems.map((item) => (
                <MenuItem
                  key={item.id}
                  onClick={() => {
                    if (item.type === "channel") {
                      onOpenGroup?.(item.data);
                    } else {
                      onStartDm?.(item.id, item.name);
                    }
                    setNotifAnchor(null);
                  }}
                  sx={{ borderRadius: "6px", py: 1, my: 0.25, display: "flex", justifyContent: "space-between" }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                    {item.type === "channel" ? (
                      <TagIcon sx={{ fontSize: 18, color: "primary.main" }} />
                    ) : (
                      <CustomAvatar name={item.name} src={item.data?.avatarUrl} size={24} />
                    )}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                        {item.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.count} unread message{item.count > 1 ? "s" : ""}
                      </Typography>
                    </Box>
                  </Box>

                  <Badge badgeContent={item.count} color="error" />
                </MenuItem>
              ))}
            </Box>
          ) : (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: "13px" }}>
                All caught up! No unread notifications.
              </Typography>
            </Box>
          )}
        </Menu>

        <ThemeSwitcher currentTheme={themeKey} onSelectTheme={onSelectTheme} />

        {/* Organization Settings: strictly shown ONLY to Owner */}
        {isOwner && (
          <Tooltip title="Organization Settings (Owner)">
            <IconButton size="small" onClick={onOpenSettings} sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}>
              <SettingsOutlinedIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        )}

        {/* User Account Avatar Menu */}
        <ButtonBase
          onClick={(e) => setProfileAnchor(e.currentTarget)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            p: 0.5,
            borderRadius: "8px",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <CustomAvatar name={username} src={myAvatarUrl} size={32} />
          {/* <Box sx={{ textAlign: "left", display: { xs: "none", sm: "block" } }}>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "12.5px", lineHeight: 1.2 }}>
              {username}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "10.5px" }}>
              {myRole}
            </Typography>
          </Box> */}
        </ButtonBase>

        {/* User Profile Menu */}
        <Menu
          anchorEl={profileAnchor}
          open={Boolean(profileAnchor)}
          onClose={() => setProfileAnchor(null)}
          slotProps={{ paper: { sx: { width: 220, borderRadius: "10px", p: 0.5 } } }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {username}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Workspace {myRole}
            </Typography>
          </Box>

          <MenuItem
            onClick={() => {
              onOpenMyProfile?.();
              setProfileAnchor(null);
            }}
            sx={{ borderRadius: "6px", my: 0.25 }}
          >
            <ListItemIcon>
              <PersonOutlineOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={<Typography sx={{ fontSize: "12.5px", fontWeight: 600 }}>My Profile & Photo</Typography>} />
          </MenuItem>

          <Divider sx={{ my: 0.5 }} />

          <MenuItem onClick={onLogout} sx={{ borderRadius: "6px", color: "error.main" }}>
            <ListItemIcon>
              <ExitToAppIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText primary={<Typography sx={{ fontSize: "12.5px", fontWeight: 700 }}>Log Out</Typography>} />
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
}
