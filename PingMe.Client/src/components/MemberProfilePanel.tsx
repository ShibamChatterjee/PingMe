import { useState, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Divider,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Select,
  FormControl,
  Alert,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import CallOutlinedIcon from "@mui/icons-material/CallOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SecurityIcon from "@mui/icons-material/Security";
import PersonRemoveOutlinedIcon from "@mui/icons-material/PersonRemoveOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import TagIcon from "@mui/icons-material/Tag";

import type { OrgMember, WorkspaceGroup } from "../lib/orgStore";
import type { BuiltinOrgRole } from "../lib/permissions";
import { canManageTargetUser, getCanonicalRole } from "../lib/permissions";
import { RoleBadge } from "./RoleBadge";
import { Avatar as CustomAvatar } from "./Avatar";
import { api } from "../lib/api";

interface Props {
  member: OrgMember;
  myUserId: string;
  myRole: string;
  orgOwnerId: string;
  groups: WorkspaceGroup[];
  authToken?: string | null;
  onClose: () => void;
  onStartDm: (userId: string, username: string) => void;
  onRoleChange: (userId: string, newRole: BuiltinOrgRole | string) => void;
  onToggleSuspend: (userId: string) => void;
  onRemoveMember: (userId: string) => void;
  onTransferOwnership: (userId: string) => void;
  onUpdateAvatar?: (newAvatarUrl: string) => void;
}

export function MemberProfilePanel({
  member,
  myUserId,
  myRole,
  groups,
  authToken,
  onClose,
  onStartDm,
  onRoleChange,
  onToggleSuspend,
  onRemoveMember,
  onTransferOwnership,
  onUpdateAvatar,
}: Props) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [editingRole, setEditingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>(member.role);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(member.avatarUrl);
  const [avatarErr, setAvatarErr] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMe = member.userId === myUserId;
  const isOwner = getCanonicalRole(myRole) === "Owner";
  const canManage = canManageTargetUser(myRole, member.role, myUserId, member.userId);

  const memberGroups = groups.filter((g) => g.memberUserIds.includes(member.userId));
  const managedGroups = groups.filter((g) => g.groupManagerId === member.userId);

  const handleSaveRole = () => {
    onRoleChange(member.userId, selectedRole);
    setEditingRole(false);
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authToken) return;

    setUploadingAvatar(true);
    setAvatarErr(null);
    try {
      const res = await api.uploadAvatar(authToken, file);
      setAvatarUrl(res.avatarUrl);
      onUpdateAvatar?.(res.avatarUrl);
    } catch (err: any) {
      setAvatarErr(err?.message || "Failed to upload photo.");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  return (
    <Box
      sx={{
        width: { xs: "100%", sm: 340, md: 360 },
        height: "100%",
        borderLeft: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        zIndex: 5,
        overflow: "hidden",
        boxShadow: "-4px 0 16px rgba(0,0,0,0.04)",
      }}
    >
      {/* Hidden File Input for Avatar */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleAvatarFileChange}
      />

      {/* Top Header Bar */}
      <Box
        sx={{
          height: 60,
          minHeight: 60,
          px: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "14px" }}>
          Profile Details
        </Typography>

        <IconButton size="small" onClick={onClose} sx={{ color: "text.secondary" }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* Scrollable Body */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2.5, display: "flex", flexDirection: "column", gap: 2.5 }}>
        {/* Profile Avatar Card */}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", pt: 1 }}>
          <Box sx={{ position: "relative", mb: 1.5 }}>
            <CustomAvatar name={member.username} src={avatarUrl} size={80} />

            {/* Online status indicator */}
            <Box
              sx={{
                position: "absolute",
                bottom: 2,
                right: 2,
                width: 15,
                height: 15,
                borderRadius: "50%",
                bgcolor: member.status === "online" ? "#22c55e" : member.status === "away" ? "#eab308" : "#94a3b8",
                border: "2.5px solid var(--theme-card, #fff)",
              }}
            />

            {/* Change Profile Photo Button for current user */}
            {isMe && (
              <Tooltip title="Upload profile picture">
                <IconButton
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  sx={{
                    position: "absolute",
                    top: -4,
                    right: -6,
                    bgcolor: "background.paper",
                    border: "1px solid",
                    borderColor: "divider",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                    p: 0.5,
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  {uploadingAvatar ? (
                    <CircularProgress size={14} />
                  ) : (
                    <CameraAltOutlinedIcon sx={{ fontSize: 15, color: "primary.main" }} />
                  )}
                </IconButton>
              </Tooltip>
            )}
          </Box>

          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "17px", lineHeight: 1.2 }}>
            {member.username} {isMe && <span style={{ fontSize: "12px", opacity: 0.6 }}>(You)</span>}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary", mt: 0.5, mb: 1.5 }}>
            <EmailOutlinedIcon sx={{ fontSize: 14 }} />
            <Typography variant="caption" sx={{ fontSize: "12px" }}>
              {member.email}
            </Typography>
          </Box>

          {avatarErr && (
            <Alert severity="error" sx={{ my: 1, py: 0.25, width: "100%", fontSize: "12px" }}>
              {avatarErr}
            </Alert>
          )}

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", justifyContent: "center" }}>
            <RoleBadge role={member.role} isSuspended={member.isSuspended} size="medium" />
            {managedGroups.length > 0 && (
              <Chip
                icon={<ManageAccountsIcon sx={{ fontSize: "14px !important" }} />}
                label={`Group Manager (${managedGroups.length})`}
                size="small"
                sx={{
                  fontSize: "10.5px",
                  fontWeight: 700,
                  bgcolor: "rgba(6, 182, 212, 0.12)",
                  color: "#0891b2",
                  borderColor: "rgba(6, 182, 212, 0.3)",
                }}
              />
            )}
          </Box>
        </Box>

        {member.isSuspended && (
          <Alert severity="warning" sx={{ py: 0.5, fontSize: "12px" }}>
            This account is currently suspended from the workspace.
          </Alert>
        )}

        {/* Primary Action Buttons */}
        {!isMe ? (
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              size="small"
              startIcon={<ChatBubbleOutlineOutlinedIcon sx={{ fontSize: 16 }} />}
              onClick={() => {
                onStartDm(member.userId, member.username);
              }}
              sx={{ fontWeight: 700, textTransform: "none", borderRadius: "8px", py: 0.75 }}
            >
              Direct Message
            </Button>

            <Button
              variant="outlined"
              size="small"
              startIcon={<CallOutlinedIcon sx={{ fontSize: 16 }} />}
              onClick={() => alert(`Calling ${member.username}...`)}
              sx={{ fontWeight: 600, textTransform: "none", borderRadius: "8px", py: 0.75 }}
            >
              Call
            </Button>

            {canManage && (
              <>
                <IconButton
                  size="small"
                  onClick={(e) => setAnchorEl(e.currentTarget)}
                  sx={{ border: "1px solid", borderColor: "divider", borderRadius: "8px", p: 0.75 }}
                >
                  <MoreVertIcon sx={{ fontSize: 18 }} />
                </IconButton>

                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={() => setAnchorEl(null)}
                  slotProps={{ paper: { sx: { width: 220, borderRadius: "10px", mt: 0.5 } } }}
                >
                  <MenuItem
                    onClick={() => {
                      setEditingRole(true);
                      setAnchorEl(null);
                    }}
                  >
                    <ListItemIcon>
                      <SecurityIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={<Typography sx={{ fontSize: "12.5px", fontWeight: 600 }}>Change Role</Typography>} />
                  </MenuItem>

                  <MenuItem
                    onClick={() => {
                      onToggleSuspend(member.userId);
                      setAnchorEl(null);
                    }}
                  >
                    <ListItemIcon>
                      <BlockOutlinedIcon fontSize="small" color={member.isSuspended ? "success" : "warning"} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography sx={{ fontSize: "12.5px", fontWeight: 600 }}>
                          {member.isSuspended ? "Unsuspend Member" : "Suspend Member"}
                        </Typography>
                      }
                    />
                  </MenuItem>

                  {isOwner && (
                    <MenuItem
                      onClick={() => {
                        setConfirmTransfer(true);
                        setAnchorEl(null);
                      }}
                      sx={{ color: "warning.main" }}
                    >
                      <ListItemIcon>
                        <WorkspacePremiumIcon fontSize="small" color="warning" />
                      </ListItemIcon>
                      <ListItemText primary={<Typography sx={{ fontSize: "12.5px", fontWeight: 700 }}>Transfer Workspace</Typography>} />
                    </MenuItem>
                  )}

                  <Divider sx={{ my: 0.5 }} />

                  <MenuItem
                    onClick={() => {
                      setConfirmDelete(true);
                      setAnchorEl(null);
                    }}
                    sx={{ color: "error.main" }}
                  >
                    <ListItemIcon>
                      <PersonRemoveOutlinedIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText primary={<Typography sx={{ fontSize: "12.5px", fontWeight: 700 }}>Remove from Workspace</Typography>} />
                  </MenuItem>
                </Menu>
              </>
            )}
          </Box>
        ) : (
          <Button
            variant="outlined"
            size="small"
            startIcon={<CameraAltOutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            sx={{ fontWeight: 700, textTransform: "none", borderRadius: "8px" }}
          >
            {uploadingAvatar ? "Uploading photo…" : "Change Profile Photo"}
          </Button>
        )}

        {/* Role Editor Inline */}
        {editingRole && (
          <Box sx={{ p: 2, border: "1px solid", borderColor: "primary.main", borderRadius: "10px", bgcolor: "action.hover" }}>
            <Typography variant="caption" sx={{ fontWeight: 800, textTransform: "uppercase", color: "primary.main", display: "block", mb: 1 }}>
              Select New Workspace Role
            </Typography>
            <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
              <Select
                value={getCanonicalRole(selectedRole) === "Manager" ? "Manager" : "Member"}
                onChange={(e) => setSelectedRole(e.target.value)}
                sx={{ fontSize: "13px", borderRadius: "8px" }}
              >
                <MenuItem value="Member">Member (Standard collaborator)</MenuItem>
                <MenuItem value="Manager">Group Manager (Manages assigned channels)</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button size="small" onClick={() => setEditingRole(false)} sx={{ textTransform: "none" }}>
                Cancel
              </Button>
              <Button size="small" variant="contained" onClick={handleSaveRole} sx={{ textTransform: "none", fontWeight: 700, borderRadius: "6px" }}>
                Save Role
              </Button>
            </Box>
          </Box>
        )}

        <Divider />

        {/* Channels & Groups membership */}
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.25 }}>
            <TagIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="caption" sx={{ fontWeight: 800, textTransform: "uppercase", color: "text.secondary", letterSpacing: "0.04em" }}>
              Channels & Groups ({memberGroups.length})
            </Typography>
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {memberGroups.length === 0 ? (
              <Typography variant="caption" color="text.secondary">
                No assigned public or private channels.
              </Typography>
            ) : (
              memberGroups.map((g) => {
                const isManager = g.groupManagerId === member.userId;
                return (
                  <Chip
                    key={g.id}
                    label={`#${g.name}${isManager ? " (Manager)" : ""}`}
                    size="small"
                    variant={isManager ? "filled" : "outlined"}
                    color={isManager ? "primary" : "default"}
                    sx={{ fontSize: "11px", fontWeight: isManager ? 700 : 500 }}
                  />
                );
              })
            )}
          </Box>
        </Box>

        {/* Confirmation alerts */}
        {confirmDelete && (
          <Alert
            severity="error"
            action={
              <Box sx={{ display: "flex", gap: 0.5 }}>
                <Button size="small" color="inherit" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
                <Button
                  size="small"
                  color="error"
                  variant="contained"
                  onClick={() => {
                    onRemoveMember(member.userId);
                    onClose();
                  }}
                >
                  Remove
                </Button>
              </Box>
            }
            sx={{ fontSize: "12px" }}
          >
            Remove <strong>{member.username}</strong> from workspace?
          </Alert>
        )}

        {confirmTransfer && (
          <Alert
            severity="warning"
            action={
              <Box sx={{ display: "flex", gap: 0.5 }}>
                <Button size="small" color="inherit" onClick={() => setConfirmTransfer(false)}>
                  Cancel
                </Button>
                <Button
                  size="small"
                  color="warning"
                  variant="contained"
                  onClick={() => {
                    onTransferOwnership(member.userId);
                    onClose();
                  }}
                >
                  Transfer
                </Button>
              </Box>
            }
            sx={{ fontSize: "12px" }}
          >
            Transfer ownership to <strong>{member.username}</strong>?
          </Alert>
        )}
      </Box>
    </Box>
  );
}
