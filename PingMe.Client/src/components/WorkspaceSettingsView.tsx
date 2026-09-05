import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Alert,
  TextField,
  Chip,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Pagination,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import BlockIcon from "@mui/icons-material/Block";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import TagIcon from "@mui/icons-material/Tag";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import type { FullOrganization } from "../lib/orgStore";
import type { BuiltinOrgRole } from "../lib/permissions";
import { getCanonicalRole } from "../lib/permissions";
import { RoleBadge } from "./RoleBadge";
import { Avatar as CustomAvatar } from "./Avatar";

const TextFieldAny = TextField as any;

interface Props {
  org: FullOrganization;
  myUserId: string;
  myRole: string;
  onBackToOverview?: () => void;
  onUpdateOrg: (updates: Partial<FullOrganization>) => void;
  onUpdateMemberRole: (userId: string, newRole: BuiltinOrgRole | string) => void;
  onToggleSuspendMember: (userId: string) => void;
  onRemoveMember: (userId: string) => void;
  onTransferOwnership: (newOwnerId: string) => void;
  onUpdatePolicies: (policies: Partial<FullOrganization["policies"]>) => void;
  onResendInvite: (inviteId: string) => void;
  onRevokeInvite: (inviteId: string) => void;
  onDeleteOrg: () => void;
  onOpenInviteModal: () => void;
  onCreateGroupModal: () => void;
  ticketSystemEnabled?: boolean;
  onToggleTicketSystem?: (enabled: boolean) => void;
}

type TabKey = "general" | "members" | "groups" | "invitations" | "security" | "tickets";

export function WorkspaceSettingsView({
  org,
  myUserId,
  myRole,
  onBackToOverview,
  onUpdateOrg,
  onUpdateMemberRole,
  onToggleSuspendMember,
  onRemoveMember,
  onTransferOwnership,
  onUpdatePolicies,
  onResendInvite,
  onRevokeInvite,
  onDeleteOrg,
  onOpenInviteModal,
  onCreateGroupModal,
  ticketSystemEnabled = false,
  onToggleTicketSystem,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("general");

  // General tab state
  const [name, setName] = useState(org.name);
  const [description, setDescription] = useState(org.description || "");
  const [slug, setSlug] = useState(org.slug);
  const [logoUrl, setLogoUrl] = useState(org.logoUrl || "");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Members Pagination state
  const [memberPage, setMemberPage] = useState(1);
  const memberPageSize = 8;
  const totalMemberPages = Math.ceil(org.members.length / memberPageSize) || 1;
  const paginatedMembers = org.members.slice(
    (memberPage - 1) * memberPageSize,
    memberPage * memberPageSize
  );

  // Ownership transfer & Delete state
  const [transferTargetId, setTransferTargetId] = useState("");
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isOwner = getCanonicalRole(myRole) === "Owner";

  const handleSaveGeneral = () => {
    onUpdateOrg({
      name,
      description,
      slug,
      logoUrl: logoUrl.trim() || undefined,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <Box
      sx={{
        flexGrow: 1,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
        overflowY: "auto",
        p: { xs: 3, md: 5 },
      }}
    >
      <Box sx={{ maxWidth: 880, width: "100%", display: "flex", flexDirection: "column", gap: 3.5 }}>
        {/* Flat Header (No outer box) */}
        <Box sx={{ pb: 3, borderBottom: "1px solid", borderColor: "divider" }}>
          {onBackToOverview && (
            <Button
              variant="text"
              size="small"
              startIcon={<ArrowBackIcon sx={{ fontSize: 15 }} />}
              onClick={onBackToOverview}
              sx={{ fontWeight: 700, textTransform: "none", color: "text.secondary", mb: 1, p: 0 }}
            >
              Back to Overview
            </Button>
          )}

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
            <Box sx={{ maxWidth: 600 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em", color: "text.primary", mt: 0.5, fontSize: { xs: "1.6rem", md: "2rem" } }}>
                Workspace Settings
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.6, fontSize: "13.5px" }}>
                Configure organization preferences, member roles, channels, and security policies.
              </Typography>
            </Box>

            {/* Category Navigation Pills */}
            <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
              {[
                { id: "general", label: "General" },
                { id: "members", label: `Members (${org.members.length})` },
                { id: "groups", label: `Channels (${org.groups.length})` },
                { id: "invitations", label: `Invites (${org.invites.length})` },
                { id: "security", label: "Security & Policies" },
                { id: "tickets", label: "Ticket System" },
              ].map((tab) => (
                <Chip
                  key={tab.id}
                  label={tab.label}
                  size="small"
                  onClick={() => setActiveTab(tab.id as TabKey)}
                  variant={activeTab === tab.id ? "filled" : "outlined"}
                  color={activeTab === tab.id ? "primary" : "default"}
                  sx={{
                    fontWeight: 700,
                    fontSize: "12px",
                    height: 30,
                    cursor: "pointer",
                    border: activeTab === tab.id ? "none" : "1px solid transparent",
                    bgcolor: activeTab === tab.id ? undefined : "action.hover",
                  }}
                />
              ))}
            </Box>
          </Box>
        </Box>

        {/* TAB 1: GENERAL SETTINGS */}
        {activeTab === "general" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 640 }}>
            {saveSuccess && (
              <Alert severity="success" sx={{ borderRadius: "8px" }}>
                Organization profile updated successfully!
              </Alert>
            )}

            {/* Logo URL & Live Preview */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "13.5px", color: "text.primary" }}>
                Organization Logo
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: "12px",
                    bgcolor: "action.hover",
                    border: "1px solid",
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  {logoUrl.trim() ? (
                    <img
                      src={logoUrl}
                      alt={name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        (e.target as any).style.display = "none";
                      }}
                    />
                  ) : (
                    <Typography variant="h6" sx={{ fontWeight: 800, color: "primary.main" }}>
                      {name ? name.substring(0, 2).toUpperCase() : "PM"}
                    </Typography>
                  )}
                </Box>

                <TextFieldAny
                  placeholder="https://example.com/logo.png"
                  value={logoUrl}
                  onChange={(e: any) => setLogoUrl(e.target.value)}
                  disabled={!isOwner}
                  size="small"
                  fullWidth
                  helperText="Direct image URL for your workspace logo"
                  InputProps={{ style: { fontSize: "13.5px", borderRadius: 8 } }}
                />
              </Box>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "13.5px", color: "text.primary" }}>
                Organization Name
              </Typography>
              <TextFieldAny
                value={name}
                onChange={(e: any) => setName(e.target.value)}
                disabled={!isOwner}
                size="small"
                fullWidth
                InputProps={{ style: { fontSize: "13.5px", borderRadius: 8 } }}
              />
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "13.5px", color: "text.primary" }}>
                Workspace Slug URL
              </Typography>
              <TextFieldAny
                value={slug}
                onChange={(e: any) => setSlug(e.target.value)}
                disabled={!isOwner}
                size="small"
                fullWidth
                helperText={`pingme.io/${slug || "workspace"}`}
                InputProps={{ style: { fontSize: "13.5px", borderRadius: 8 } }}
              />
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "13.5px", color: "text.primary" }}>
                Description & Mission
              </Typography>
              <TextFieldAny
                multiline
                rows={3}
                value={description}
                onChange={(e: any) => setDescription(e.target.value)}
                disabled={!isOwner}
                size="small"
                fullWidth
                placeholder="What is the purpose of this workspace?"
                InputProps={{ style: { fontSize: "13.5px", borderRadius: 8 } }}
              />
            </Box>

            {isOwner && (
              <Box sx={{ pt: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveGeneral}
                  startIcon={<CheckCircleIcon sx={{ fontSize: 17 }} />}
                  sx={{ fontWeight: 700, textTransform: "none", py: 1, px: 3, borderRadius: "8px", fontSize: "13.5px" }}
                >
                  Save Changes
                </Button>
              </Box>
            )}
          </Box>
        )}

        {/* TAB 2: MEMBERS & ROLES */}
        {activeTab === "members" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: "15px" }}>
                  Workspace Members ({org.members.length})
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Manage member roles, permissions, and status
                </Typography>
              </div>

              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                onClick={onOpenInviteModal}
                sx={{ fontWeight: 700, textTransform: "none", borderRadius: "8px" }}
              >
                Invite Members
              </Button>
            </Box>

            {/* Flat Member Rows (Paginated) */}
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              {paginatedMembers.map((m, idx) => {
                const canonical = getCanonicalRole(m.role);
                const isTargetOwner = canonical === "Owner";
                const isMe = m.userId === myUserId;

                return (
                  <Box
                    key={m.userId}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      py: 1.5,
                      px: 2,
                      borderBottom: idx === paginatedMembers.length - 1 ? "none" : "1px solid",
                      borderColor: "divider",
                      borderRadius: "8px",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    {/* Member Info */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                      <CustomAvatar name={m.username} src={m.avatarUrl} size={34} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "13.5px" }} noWrap>
                          {m.username} {isMe && <span style={{ opacity: 0.6, fontSize: "11px" }}>(You)</span>}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "11.5px" }} noWrap>
                          {m.email}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Role & Actions */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      {isOwner && !isTargetOwner && !isMe ? (
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <Select
                            value={canonical === "Manager" ? "Manager" : "Member"}
                            onChange={(e) => onUpdateMemberRole(m.userId, e.target.value as BuiltinOrgRole)}
                            size="small"
                            sx={{ height: 30, fontSize: "11.5px", fontWeight: 700, borderRadius: "6px" }}
                          >
                            <MenuItem value="Member">Member</MenuItem>
                            <MenuItem value="Manager">Manager</MenuItem>
                          </Select>
                        </FormControl>
                      ) : (
                        <RoleBadge role={m.role} size="small" />
                      )}

                      {m.isSuspended && (
                        <Chip label="Suspended" size="small" color="error" sx={{ height: 20, fontSize: "10px", fontWeight: 800 }} />
                      )}

                      {isOwner && !isTargetOwner && !isMe && (
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <Tooltip title={m.isSuspended ? "Reactivate member" : "Suspend account"}>
                            <IconButton
                              size="small"
                              color={m.isSuspended ? "success" : "warning"}
                              onClick={() => onToggleSuspendMember(m.userId)}
                            >
                              <BlockIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Remove from workspace">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => onRemoveMember(m.userId)}
                            >
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>

            {/* Pagination Controls */}
            {totalMemberPages > 1 && (
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pt: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Showing {(memberPage - 1) * memberPageSize + 1}–{Math.min(memberPage * memberPageSize, org.members.length)} of {org.members.length} members
                </Typography>
                <Pagination
                  count={totalMemberPages}
                  page={memberPage}
                  onChange={(_, p) => setMemberPage(p)}
                  size="small"
                  shape="rounded"
                  color="primary"
                />
              </Box>
            )}
          </Box>
        )}

        {/* TAB 3: CHANNELS */}
        {activeTab === "groups" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: "15px" }}>
                  Workspace Channels ({org.groups.length})
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Review public & private channels and assigned managers
                </Typography>
              </div>

              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                onClick={onCreateGroupModal}
                sx={{ fontWeight: 700, textTransform: "none", borderRadius: "8px" }}
              >
                Create Channel
              </Button>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column" }}>
              {org.groups.map((g, idx) => {
                const isPrivate = g.visibility === "private";
                return (
                  <Box
                    key={g.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      py: 1.5,
                      px: 2,
                      borderBottom: idx === org.groups.length - 1 ? "none" : "1px solid",
                      borderColor: "divider",
                      borderRadius: "8px",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
                      {isPrivate ? (
                        <LockOutlinedIcon sx={{ fontSize: 16, color: "#d97706" }} />
                      ) : (
                        <TagIcon sx={{ fontSize: 17, color: "text.secondary" }} />
                      )}
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "13.5px" }}>
                          {g.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "11.5px" }}>
                          {g.description || g.topic || "Channel discussion"}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      {g.groupManagerName && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <ManageAccountsIcon sx={{ fontSize: 15, color: "primary.main" }} />
                          <Typography variant="caption" sx={{ fontWeight: 600, color: "primary.main", fontSize: "11.5px" }}>
                            {g.groupManagerName}
                          </Typography>
                        </Box>
                      )}

                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "11.5px", fontWeight: 600 }}>
                        {g.memberUserIds.length} members
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        {/* TAB 4: INVITATIONS */}
        {activeTab === "invitations" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: "15px" }}>
                  Workspace Invitations ({org.invites.length})
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Track pending and accepted invitations
                </Typography>
              </div>

              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                onClick={onOpenInviteModal}
                sx={{ fontWeight: 700, textTransform: "none", borderRadius: "8px" }}
              >
                Send Invitations
              </Button>
            </Box>

            {org.invites.length === 0 ? (
              <Box sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
                <Typography variant="body2">No pending or previous invitations.</Typography>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                {org.invites.map((inv, idx) => {
                  const isPending = inv.status === "Pending";
                  const statusColor =
                    inv.status === "Accepted"
                      ? "success"
                      : inv.status === "Pending"
                        ? "primary"
                        : "warning";

                  return (
                    <Box
                      key={inv.id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        py: 1.5,
                        px: 2,
                        borderBottom: idx === org.invites.length - 1 ? "none" : "1px solid",
                        borderColor: "divider",
                        borderRadius: "8px",
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                    >
                      <div>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "13.5px" }}>
                          {inv.email}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "11.5px" }}>
                          Invited by {inv.invitedByUsername} · Expires {new Date(inv.expiresAt).toLocaleDateString()}
                        </Typography>
                      </div>

                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Chip label={inv.status} size="small" color={statusColor} sx={{ height: 20, fontSize: "10px", fontWeight: 800 }} />

                        {isOwner && isPending && (
                          <Box sx={{ display: "flex", gap: 0.5 }}>
                            <Tooltip title="Resend invitation">
                              <IconButton size="small" color="primary" onClick={() => onResendInvite(inv.id)}>
                                <RefreshIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Revoke invitation">
                              <IconButton size="small" color="error" onClick={() => onRevokeInvite(inv.id)}>
                                <CloseIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        )}

        {/* TAB 5: SECURITY & POLICIES */}
        {activeTab === "security" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 640 }}>
            <div>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: "15px" }}>
                Security & Policies
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Configure workspace channel creation and invite permissions
              </Typography>
            </div>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, py: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={org.policies.allowMemberGroupCreation}
                    onChange={(e) => onUpdatePolicies({ allowMemberGroupCreation: e.target.checked })}
                    disabled={!isOwner}
                  />
                }
                label={
                  <div>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "13.5px" }}>
                      Allow Members to Create Public Channels
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      When enabled, regular members can create open workspace channels.
                    </Typography>
                  </div>
                }
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={org.policies.allowMemberInvites}
                    onChange={(e) => onUpdatePolicies({ allowMemberInvites: e.target.checked })}
                    disabled={!isOwner}
                  />
                }
                label={
                  <div>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "13.5px" }}>
                      Allow Members to Send Invitations
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      When disabled, only the workspace owner can invite new teammates.
                    </Typography>
                  </div>
                }
              />
            </Box>

            {/* DANGER ZONE (Owner Only) */}
            {isOwner && (
              <Box sx={{ pt: 3, mt: 1, borderTop: "1px solid", borderColor: "divider", display: "flex", flexDirection: "column", gap: 3 }}>
                <div>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "error.main", fontSize: "14px" }}>
                    Danger Zone
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Irreversible workspace management operations
                  </Typography>
                </div>

                {/* Transfer Ownership */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "13px" }}>
                    Transfer Ownership
                  </Typography>

                  <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                    <FormControl size="small" sx={{ width: 260 }}>
                      <InputLabel>Select New Owner</InputLabel>
                      <Select
                        label="Select New Owner"
                        value={transferTargetId}
                        onChange={(e) => setTransferTargetId(e.target.value)}
                        sx={{ height: 36, fontSize: "13px", borderRadius: "8px" }}
                      >
                        {org.members
                          .filter((m) => m.userId !== myUserId)
                          .map((m) => (
                            <MenuItem key={m.userId} value={m.userId}>
                              {m.username} ({m.role})
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>

                    <Button
                      variant="outlined"
                      color="warning"
                      size="small"
                      disabled={!transferTargetId}
                      onClick={() => setConfirmTransfer(true)}
                      sx={{ fontWeight: 700, textTransform: "none", height: 36, borderRadius: "8px" }}
                    >
                      Transfer Ownership
                    </Button>
                  </Box>

                  {confirmTransfer && (
                    <Alert
                      severity="warning"
                      sx={{ mt: 1, borderRadius: "8px" }}
                      action={
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Button size="small" color="inherit" onClick={() => setConfirmTransfer(false)}>
                            Cancel
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="warning"
                            onClick={() => {
                              onTransferOwnership(transferTargetId);
                              setConfirmTransfer(false);
                            }}
                          >
                            Confirm
                          </Button>
                        </Box>
                      }
                    >
                      Transfer primary workspace ownership to this member?
                    </Alert>
                  )}
                </Box>

                {/* Delete Org */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "error.main", fontSize: "13px" }}>
                    Permanently Delete Organization
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Permanently deletes all channels, messages, and shared files in {org.name}. This cannot be undone.
                  </Typography>

                  {!showDeleteConfirm ? (
                    <Box sx={{ pt: 0.5 }}>
                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        onClick={() => setShowDeleteConfirm(true)}
                        sx={{ fontWeight: 700, textTransform: "none", borderRadius: "8px" }}
                      >
                        Delete Workspace
                      </Button>
                    </Box>
                  ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, p: 2, bgcolor: "rgba(239, 68, 68, 0.05)", borderRadius: "8px", mt: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "error.main" }}>
                        Type "{org.name}" to confirm workspace deletion:
                      </Typography>
                      <TextFieldAny
                        size="small"
                        placeholder={org.name}
                        value={deleteConfirmText}
                        onChange={(e: any) => setDeleteConfirmText(e.target.value)}
                        InputProps={{ style: { fontSize: "13px", borderRadius: 6 } }}
                      />
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteConfirmText("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          disabled={deleteConfirmText !== org.name}
                          onClick={onDeleteOrg}
                          sx={{ fontWeight: 700, textTransform: "none" }}
                        >
                          Permanently Delete
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* TAB: TICKET SYSTEM */}
      {activeTab === "tickets" && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 640 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Ticket System</Typography>
            <Typography variant="body2" color="text.secondary">
              Enable a workspace-wide ticket and issue management system. Members can create, assign, and track tickets.
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              p: 2.5, border: "1px solid", borderColor: "divider", borderRadius: 2,
              bgcolor: "background.paper",
            }}
          >
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Enable Ticket System</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {ticketSystemEnabled
                  ? "Tickets are enabled — members can create and manage tickets."
                  : "Tickets are disabled — no one can create or view tickets."}
              </Typography>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={ticketSystemEnabled}
                  onChange={(e) => onToggleTicketSystem?.(e.target.checked)}
                  disabled={!isOwner && getCanonicalRole(myRole) !== "Manager"}
                  color="primary"
                />
              }
              label=""
              sx={{ m: 0 }}
            />
          </Box>

          {!isOwner && getCanonicalRole(myRole) !== "Manager" && (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Only workspace Owners and Managers can enable or disable the ticket system.
            </Alert>
          )}
        </Box>
      )}
    </Box>
  );
}
