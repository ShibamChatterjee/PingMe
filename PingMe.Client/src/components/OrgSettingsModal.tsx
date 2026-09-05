import { useState } from "react";
import {
  Dialog,
  DialogContent,
  Button,
  Alert,
  Typography,
  Box,
  Tabs,
  Tab,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Switch,
  FormControlLabel,
} from "@mui/material";
import CorporateFareIcon from "@mui/icons-material/CorporateFare";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import MailIcon from "@mui/icons-material/Mail";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import BlockIcon from "@mui/icons-material/Block";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";

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
  onClose: () => void;
  onUpdateOrg: (updates: Partial<FullOrganization>) => void;
  onUpdateMemberRole: (userId: string, newRole: BuiltinOrgRole | string) => void;
  onToggleSuspendMember: (userId: string) => void;
  onRemoveMember: (userId: string) => void;
  onTransferOwnership: (newOwnerId: string) => void;
  onCreateCustomRole?: any;
  onUpdatePermissionMatrix?: any;
  onUpdatePolicies: (policies: Partial<FullOrganization["policies"]>) => void;
  onResendInvite: (inviteId: string) => void;
  onRevokeInvite: (inviteId: string) => void;
  onUpdateInviteRole?: (inviteId: string, newRole: BuiltinOrgRole | string) => void;
  onDeleteOrg: () => void;
  onOpenInviteModal: () => void;
  onCreateGroupModal: () => void;
}

type TabKey = "general" | "members" | "groups" | "invitations" | "security";

export function OrgSettingsModal({
  org,
  myUserId,
  myRole,
  onClose,
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
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("general");

  // General tab state
  const [name, setName] = useState(org.name);
  const [description, setDescription] = useState(org.description || "");
  const [logoUrl] = useState(org.logoUrl || "");
  const [slug, setSlug] = useState(org.slug);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
      logoUrl,
      slug,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="lg">
      <DialogContent sx={{ p: 0, height: "82vh", display: "flex", overflow: "hidden" }}>
        {/* Left Navigation */}
        <Box
          sx={{
            width: 240,
            minWidth: 240,
            borderRight: "1px solid",
            borderColor: "divider",
            bgcolor: "action.hover",
            p: 2,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5, px: 1 }}>
              <CorporateFareIcon sx={{ color: "primary.main", fontSize: 24 }} />
              <div>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                  Workspace Settings
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {org.name}
                </Typography>
              </div>
            </Box>

            <Tabs
              orientation="vertical"
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{
                "& .MuiTab-root": {
                  alignItems: "center",
                  justifyContent: "flex-start",
                  minHeight: 40,
                  py: 1,
                  px: 1.5,
                  borderRadius: "8px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  textTransform: "none",
                  my: 0.25,
                  gap: 1.25,
                  "&.Mui-selected": {
                    bgcolor: "background.paper",
                    color: "primary.main",
                    fontWeight: 800,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  },
                },
                "& .MuiTabs-indicator": { display: "none" },
              }}
            >
              <Tab
                value="general"
                label="General"
                icon={<CorporateFareIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
              />
              <Tab
                value="members"
                label={`Members & Roles (${org.members.length})`}
                icon={<PeopleAltOutlinedIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
              />
              <Tab
                value="groups"
                label={`Channels (${org.groups.length})`}
                icon={<GroupsOutlinedIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
              />
              <Tab
                value="invitations"
                label={`Invitations (${org.invites.length})`}
                icon={<MailIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
              />
              <Tab
                value="security"
                label="Security & Policies"
                icon={<SecurityOutlinedIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
              />
            </Tabs>
          </div>

          <Button
            variant="outlined"
            size="small"
            onClick={onClose}
            sx={{ fontWeight: 700, borderRadius: "8px" }}
          >
            Done
          </Button>
        </Box>

        {/* Right Main Content Pane */}
        <Box sx={{ flexGrow: 1, p: 4, overflowY: "auto", bgcolor: "background.default" }}>
          {/* TAB 1: GENERAL SETTINGS */}
          {activeTab === "general" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 640 }}>
              <div>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  General Workspace Settings
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage your organization profile, unique link slug, and public identity.
                </Typography>
              </div>

              {saveSuccess && (
                <Alert severity="success">Organization profile updated successfully!</Alert>
              )}

              <Box sx={{ display: "flex", gap: 2 }}>
                <TextFieldAny
                  label="Organization Name"
                  fullWidth
                  value={name}
                  onChange={(e: any) => setName(e.target.value)}
                  disabled={!isOwner}
                />
                <TextFieldAny
                  label="Workspace URL Slug"
                  fullWidth
                  value={slug}
                  onChange={(e: any) => setSlug(e.target.value)}
                  helperText={`pingme.io/${slug || "workspace"}`}
                  disabled={!isOwner}
                />
              </Box>

              <TextFieldAny
                label="Description & Mission"
                multiline
                rows={3}
                fullWidth
                value={description}
                onChange={(e: any) => setDescription(e.target.value)}
                placeholder="What is the purpose of this workspace?"
                disabled={!isOwner}
              />

              {isOwner && (
                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5 }}>
                  <Button variant="contained" color="primary" onClick={handleSaveGeneral} sx={{ fontWeight: 700 }}>
                    Save Changes
                  </Button>
                </Box>
              )}
            </Box>
          )}

          {/* TAB 2: MEMBERS & ROLES */}
          {activeTab === "members" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    Members & Roles
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manage workspace members, assign Group Managers, and handle account statuses.
                  </Typography>
                </div>

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={onOpenInviteModal}
                  sx={{ fontWeight: 700 }}
                >
                  Invite Members
                </Button>
              </Box>

              {/* 3 Clean Roles Info Cards */}
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: "10px", borderColor: "rgba(245, 158, 11, 0.3)", bgcolor: "rgba(245, 158, 11, 0.04)" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
                    <WorkspacePremiumOutlinedIcon sx={{ color: "#d97706", fontSize: 18 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#d97706" }}>
                      Owner
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.4 }}>
                    Full administrative control, workspace settings, role assignments, ownership transfer, and workspace deletion.
                  </Typography>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2, borderRadius: "10px", borderColor: "rgba(2, 132, 199, 0.3)", bgcolor: "rgba(2, 132, 199, 0.04)" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
                    <ManageAccountsIcon sx={{ color: "#0284c7", fontSize: 18 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0284c7" }}>
                      Group Manager
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.4 }}>
                    Creates and manages assigned channels, adds/removes channel members, and moderates group conversations.
                  </Typography>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2, borderRadius: "10px", borderColor: "divider", bgcolor: "action.hover" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
                    <PersonOutlineOutlinedIcon sx={{ color: "#64748b", fontSize: 18 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary" }}>
                      Member
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.4 }}>
                    Standard organization member with access to chat, file sharing, direct messages, and voice/video calls.
                  </Typography>
                </Paper>
              </Box>

              {/* Members Table */}
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "10px" }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: "action.hover" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Member</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Managed Channels</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Joined</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {org.members.map((m) => {
                      const canonical = getCanonicalRole(m.role);
                      const isTargetOwner = canonical === "Owner";
                      const isMe = m.userId === myUserId;
                      const userManaged = org.groups.filter((g) => g.groupManagerId === m.userId);

                      return (
                        <TableRow key={m.userId} sx={{ "&:hover": { bgcolor: "action.hover" } }}>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                              <CustomAvatar name={m.username} src={m.avatarUrl} size={32} />
                              <div>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                  {m.username} {isMe && "(You)"}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {m.email}
                                </Typography>
                              </div>
                            </Box>
                          </TableCell>

                          <TableCell>
                            {isOwner && !isTargetOwner && !isMe ? (
                              <FormControl size="small" sx={{ minWidth: 150 }}>
                                <Select
                                  value={canonical === "Manager" ? "Manager" : "Member"}
                                  onChange={(e) => onUpdateMemberRole(m.userId, e.target.value as BuiltinOrgRole)}
                                  size="small"
                                  sx={{ fontSize: "12px", fontWeight: 700, borderRadius: "6px" }}
                                >
                                  <MenuItem value="Member">
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                      <RoleBadge role="Member" size="small" />
                                    </Box>
                                  </MenuItem>
                                  <MenuItem value="Manager">
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                      <RoleBadge role="Manager" size="small" />
                                    </Box>
                                  </MenuItem>
                                </Select>
                              </FormControl>
                            ) : (
                              <RoleBadge role={m.role} size="small" />
                            )}
                          </TableCell>

                          <TableCell>
                            {userManaged.length > 0 ? (
                              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                                {userManaged.map((g) => (
                                  <Chip key={g.id} label={`#${g.name}`} size="small" color="info" sx={{ fontSize: "10px", fontWeight: 700 }} />
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="caption" color="text.secondary">—</Typography>
                            )}
                          </TableCell>

                          <TableCell>
                            <Typography variant="caption">
                              {new Date(m.joinedAt).toLocaleDateString()}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            {m.isSuspended ? (
                              <Chip label="Suspended" size="small" color="error" sx={{ fontSize: "10px", fontWeight: 800 }} />
                            ) : (
                              <Chip label="Active" size="small" color="success" variant="outlined" sx={{ fontSize: "10px", fontWeight: 700 }} />
                            )}
                          </TableCell>

                          <TableCell align="right">
                            {isOwner && !isTargetOwner && !isMe && (
                              <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
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
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* TAB 3: GROUPS & CHANNELS */}
          {activeTab === "groups" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    Channels & Group Managers
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    View all channels, their visibility, and assigned Group Managers.
                  </Typography>
                </div>

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={onCreateGroupModal}
                  sx={{ fontWeight: 700 }}
                >
                  + Create Channel
                </Button>
              </Box>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "10px" }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: "action.hover" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Channel</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Visibility</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Group Manager</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Members</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {org.groups.map((g) => (
                      <TableRow key={g.id} sx={{ "&:hover": { bgcolor: "action.hover" } }}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>
                            #{g.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {g.visibility === "private" ? (
                            <Chip
                              icon={<LockOutlinedIcon sx={{ fontSize: "12px !important" }} />}
                              label="Private"
                              size="small"
                              color="warning"
                              variant="outlined"
                              sx={{ fontSize: "10px", fontWeight: 700 }}
                            />
                          ) : (
                            <Chip
                              icon={<PublicOutlinedIcon sx={{ fontSize: "12px !important" }} />}
                              label="Public"
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{ fontSize: "10px", fontWeight: 700 }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <ManageAccountsIcon sx={{ fontSize: 16, color: "#0284c7" }} />
                            <Typography variant="body2" sx={{ fontWeight: 700, color: "#0284c7" }}>
                              {g.groupManagerName || "Unassigned"}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{g.memberUserIds.length} members</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {g.description || "—"}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* TAB 4: INVITATIONS */}
          {activeTab === "invitations" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    Invitations
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Track pending and accepted invitations to join the workspace.
                  </Typography>
                </div>

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={onOpenInviteModal}
                  sx={{ fontWeight: 700 }}
                >
                  Send Invitations
                </Button>
              </Box>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "10px" }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: "action.hover" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Invitee Email</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Assigned Role</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Invited By</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Expires</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {org.invites.map((inv) => {
                      const isPending = inv.status === "Pending";
                      const statusColor =
                        inv.status === "Accepted"
                          ? "success"
                          : inv.status === "Pending"
                            ? "primary"
                            : inv.status === "Declined"
                              ? "warning"
                              : "error";

                      return (
                        <TableRow key={inv.id} sx={{ "&:hover": { bgcolor: "action.hover" } }}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {inv.email}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <RoleBadge role={inv.role} size="small" />
                          </TableCell>

                          <TableCell>
                            <Chip label={inv.status} size="small" color={statusColor} sx={{ fontSize: "10px", fontWeight: 800 }} />
                          </TableCell>

                          <TableCell>
                            <Typography variant="caption">{inv.invitedByUsername}</Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="caption">
                              {new Date(inv.expiresAt).toLocaleDateString()}
                            </Typography>
                          </TableCell>

                          <TableCell align="right">
                            {isOwner && isPending && (
                              <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
                                <Tooltip title="Resend invitation email">
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
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* TAB 5: SECURITY & DANGER ZONE */}
          {activeTab === "security" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 640 }}>
              <div>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  Security & Access Policies
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage channel creation policies, invite privileges, and ownership.
                </Typography>
              </div>

              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: "10px", display: "flex", flexDirection: "column", gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={org.policies.allowMemberGroupCreation}
                      onChange={(e) =>
                        onUpdatePolicies({ allowMemberGroupCreation: e.target.checked })
                      }
                      disabled={!isOwner}
                    />
                  }
                  label={
                    <div>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Allow Regular Members to Create Public Channels
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        When enabled, any member can create open channels for the team.
                      </Typography>
                    </div>
                  }
                />

                <Divider />

                <FormControlLabel
                  control={
                    <Switch
                      checked={org.policies.allowMemberInvites}
                      onChange={(e) =>
                        onUpdatePolicies({ allowMemberInvites: e.target.checked })
                      }
                      disabled={!isOwner}
                    />
                  }
                  label={
                    <div>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Allow Regular Members to Send Invitations
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        When disabled, only the workspace owner can invite new teammates.
                      </Typography>
                    </div>
                  }
                />
              </Paper>

              {/* DANGER ZONE (Owner Only) */}
              {isOwner && (
                <Paper variant="outlined" sx={{ p: 3, borderColor: "error.main", borderRadius: "10px", bgcolor: "rgba(239, 68, 68, 0.03)" }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "error.main", mb: 0.5 }}>
                    Danger Zone (Owner Operations)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                    Only the Organization Owner can transfer primary ownership or permanently delete this organization.
                  </Typography>

                  {/* Transfer Ownership */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      Transfer Organization Ownership
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                      <FormControl size="small" sx={{ width: 280 }}>
                        <InputLabel>Select New Owner</InputLabel>
                        <Select
                          label="Select New Owner"
                          value={transferTargetId}
                          onChange={(e) => setTransferTargetId(e.target.value)}
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
                        disabled={!transferTargetId}
                        onClick={() => setConfirmTransfer(true)}
                        sx={{ fontWeight: 700 }}
                      >
                        Transfer Ownership
                      </Button>
                    </Box>

                    {confirmTransfer && (
                      <Alert
                        severity="warning"
                        sx={{ mt: 1.5 }}
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
                              Confirm Transfer
                            </Button>
                          </Box>
                        }
                      >
                        Are you sure you want to transfer workspace ownership to this member?
                      </Alert>
                    )}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Delete Org */}
                  <div>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "error.main", mb: 0.5 }}>
                      Permanently Delete Organization
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                      This action will permanently delete all channels, encrypted messages, files, and memberships. This cannot be undone.
                    </Typography>

                    {!showDeleteConfirm ? (
                      <Button
                        variant="contained"
                        color="error"
                        onClick={() => setShowDeleteConfirm(true)}
                        sx={{ fontWeight: 700 }}
                      >
                        Delete Workspace
                      </Button>
                    ) : (
                      <Box sx={{ p: 2, bgcolor: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", display: "flex", flexDirection: "column", gap: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "error.dark" }}>
                          Type "{org.name}" to confirm permanent deletion:
                        </Typography>
                        <TextFieldAny
                          size="small"
                          placeholder={org.name}
                          value={deleteConfirmText}
                          onChange={(e: any) => setDeleteConfirmText(e.target.value)}
                        />
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Button size="small" variant="text" onClick={() => setShowDeleteConfirm(false)}>
                            Cancel
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="error"
                            disabled={deleteConfirmText !== org.name}
                            onClick={() => {
                              onDeleteOrg();
                              onClose();
                            }}
                          >
                            Permanently Delete Workspace
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </div>
                </Paper>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
