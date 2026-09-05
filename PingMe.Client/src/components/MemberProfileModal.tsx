import { useState, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Typography,
  Box,
  Divider,
  Chip,
  IconButton,
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

export function MemberProfileModal({
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
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pb: 1, pt: 2, px: 2.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Member Profile
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 1.5, display: "flex", flexDirection: "column", gap: 2.5 }}>
        {/* Hidden File Input for Avatar */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleAvatarFileChange}
        />

        {/* Header with Avatar & Identity */}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", pt: 1 }}>
          <Box sx={{ position: "relative", mb: 1.5 }}>
            <CustomAvatar name={member.username} src={avatarUrl} size={72} />

            {/* Online status indicator */}
            <Box
              sx={{
                position: "absolute",
                bottom: 2,
                right: 2,
                width: 14,
                height: 14,
                borderRadius: "50%",
                bgcolor: member.status === "online" ? "#22c55e" : member.status === "away" ? "#eab308" : "#94a3b8",
                border: "2px solid #fff",
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

          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {member.username} {isMe && <span style={{ fontSize: "12px", opacity: 0.6 }}>(You)</span>}
          </Typography>

          <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
            {member.email}
          </Typography>

          {avatarErr && (
            <Alert severity="error" sx={{ my: 1, py: 0.25, width: "100%" }}>
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
          <Alert severity="warning" sx={{ py: 0.5 }}>
            This account is currently suspended. The user cannot access channels or send messages.
          </Alert>
        )}

        {/* Primary Action Buttons */}
        {!isMe ? (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              size="small"
              startIcon={<ChatBubbleOutlineOutlinedIcon sx={{ fontSize: 16 }} />}
              onClick={() => {
                onStartDm(member.userId, member.username);
                onClose();
              }}
              sx={{ fontWeight: 700, textTransform: "none" }}
            >
              Direct Message
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<CallOutlinedIcon sx={{ fontSize: 16 }} />}
              onClick={() => alert(`Calling ${member.username}...`)}
              sx={{ fontWeight: 600, textTransform: "none" }}
            >
              Call
            </Button>

            {canManage && (
              <>
                <IconButton
                  size="small"
                  onClick={(e) => setAnchorEl(e.currentTarget)}
                  sx={{ border: "1px solid", borderColor: "divider" }}
                >
                  <MoreVertIcon sx={{ fontSize: 18 }} />
                </IconButton>

                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={() => setAnchorEl(null)}
                  slotProps={{ paper: { sx: { width: 220, borderRadius: "8px" } } }}
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
                    <ListItemText primary={<Typography sx={{ fontSize: "12.5px", fontWeight: 700 }}>Remove from Org</Typography>} />
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
            sx={{ fontWeight: 700, textTransform: "none" }}
          >
            {uploadingAvatar ? "Uploading photo…" : "Change Profile Photo"}
          </Button>
        )}

        {/* Role Editor Inline */}
        {editingRole && (
          <Box sx={{ p: 2, border: "1px solid", borderColor: "primary.main", borderRadius: "8px", bgcolor: "action.hover" }}>
            <Typography variant="caption" sx={{ fontWeight: 800, textTransform: "uppercase", color: "primary.main", display: "block", mb: 1 }}>
              Select New Workspace Role
            </Typography>
            <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
              <Select
                value={getCanonicalRole(selectedRole) === "Manager" ? "Manager" : "Member"}
                onChange={(e) => setSelectedRole(e.target.value)}
                sx={{ fontSize: "13px" }}
              >
                <MenuItem value="Member">Member (Standard collaborator with chat & calls)</MenuItem>
                <MenuItem value="Manager">Group Manager (Manages assigned groups & moderation)</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button size="small" onClick={() => setEditingRole(false)} sx={{ textTransform: "none" }}>
                Cancel
              </Button>
              <Button size="small" variant="contained" onClick={handleSaveRole} sx={{ textTransform: "none", fontWeight: 700 }}>
                Save Role
              </Button>
            </Box>
          </Box>
        )}

        <Divider />

        {/* Workspace Groups membership */}
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 800, textTransform: "uppercase", color: "text.secondary", letterSpacing: "0.04em", display: "block", mb: 1 }}>
            Channels & Groups ({memberGroups.length})
          </Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {memberGroups.map((g) => {
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
            })}
          </Box>
        </Box>

        {/* Confirmation dialogs for dangerous actions */}
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
                  Confirm Remove
                </Button>
              </Box>
            }
          >
            Are you sure you want to remove <strong>{member.username}</strong> from this workspace?
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
                  Confirm Transfer
                </Button>
              </Box>
            }
          >
            Transfer workspace ownership to <strong>{member.username}</strong>? You will be demoted to Admin.
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}
