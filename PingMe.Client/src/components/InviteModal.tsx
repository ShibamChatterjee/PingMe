import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  FormControl,
  Select,
  MenuItem,
  Box,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import PersonAddOutlinedIcon from "@mui/icons-material/PersonAddOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import type { BuiltinOrgRole } from "../lib/permissions";
import type { WorkspaceGroup } from "../lib/orgStore";
import { RoleBadge } from "./RoleBadge";

const TextFieldAny = TextField as any;

interface InviteEntry {
  email: string;
  role: BuiltinOrgRole;
  initialGroupIds: string[];
}

interface Props {
  orgId: string;
  orgName: string;
  joinCode: string;
  groups: WorkspaceGroup[];
  onClose: () => void;
  onSendInvites: (
    invites: Array<{
      email: string;
      role: BuiltinOrgRole;
      initialGroupIds: string[];
    }>,
  ) => Promise<void>;
}

export function InviteModal({
  orgName,
  joinCode,
  groups,
  onClose,
  onSendInvites,
}: Props) {
  const [activeTab, setActiveTab] = useState<"bulk" | "link">("bulk");

  // Bulk invite rows
  const [entries, setEntries] = useState<InviteEntry[]>([
    {
      email: "",
      role: "Member",
      initialGroupIds: groups.slice(0, 2).map((g) => g.id),
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const inviteLink = `https://pingme.io/join/${joinCode}`;

  const handleAddRow = () => {
    setEntries([
      ...entries,
      {
        email: "",
        role: "Member",
        initialGroupIds: groups.slice(0, 1).map((g) => g.id),
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (entries.length > 1) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const handleUpdateEntry = (index: number, field: keyof InviteEntry, value: any) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    setEntries(updated);
  };

  const handleToggleGroup = (entryIndex: number, groupId: string) => {
    const current = entries[entryIndex].initialGroupIds;
    const next = current.includes(groupId)
      ? current.filter((id) => id !== groupId)
      : [...current, groupId];
    handleUpdateEntry(entryIndex, "initialGroupIds", next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = entries.filter((e) => e.email.trim() && e.email.includes("@"));
    if (valid.length === 0) {
      setError("Please enter at least one valid email address.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSendInvites(valid);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invitations");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pb: 1, pt: 2.5, px: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <PersonAddOutlinedIcon sx={{ color: "primary.main", fontSize: 26 }} />
          <div>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Invite People to {orgName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Add teammates, group admins, or external guests with custom initial channel access.
            </Typography>
          </div>
        </Box>

        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ mt: 2, minHeight: 36, borderBottom: "1px solid", borderColor: "divider" }}
        >
          <Tab
            value="bulk"
            label="Email Invitations"
            icon={<PersonAddOutlinedIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
            sx={{ minHeight: 36, py: 0.5, fontSize: "12px", textTransform: "none", fontWeight: 700 }}
          />
          <Tab
            value="link"
            label="Shareable Workspace Link"
            icon={<LinkOutlinedIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
            sx={{ minHeight: 36, py: 0.5, fontSize: "12px", textTransform: "none", fontWeight: 700 }}
          />
        </Tabs>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Invitations sent successfully! Invited users will receive their onboarding link with pre-assigned roles and channels.
          </Alert>
        )}

        {activeTab === "bulk" && (
          <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Typography variant="body2" color="text.secondary">
              Configure each invitee's email, workspace role, and initial channels:
            </Typography>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "8px", overflowX: "auto" }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: "action.hover" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: "11.5px", width: "35%" }}>
                      Email Address
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "11.5px", width: "25%" }}>
                      Workspace Role
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "11.5px", width: "35%" }}>
                      Initial Channels / Groups
                    </TableCell>
                    <TableCell sx={{ width: "5%" }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries.map((entry, idx) => (
                    <TableRow key={idx} sx={{ "&:hover": { bgcolor: "action.hover" } }}>
                      {/* Email Cell */}
                      <TableCell sx={{ py: 1.5, verticalAlign: "top" }}>
                        <TextFieldAny
                          placeholder="colleague@company.com"
                          type="email"
                          size="small"
                          fullWidth
                          value={entry.email}
                          onChange={(e: any) => handleUpdateEntry(idx, "email", e.target.value)}
                          required
                          disabled={loading || success}
                        />
                      </TableCell>

                      {/* Role Cell */}
                      <TableCell sx={{ py: 1.5, verticalAlign: "top" }}>
                        <FormControl fullWidth size="small">
                          <Select
                            value={entry.role}
                            onChange={(e) =>
                              handleUpdateEntry(idx, "role", e.target.value as BuiltinOrgRole)
                            }
                            disabled={loading || success}
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
                      </TableCell>

                      {/* Channels Multi-selection Cell */}
                      <TableCell sx={{ py: 1.5, verticalAlign: "top" }}>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                          {groups.map((grp) => {
                            const isSelected = entry.initialGroupIds.includes(grp.id);
                            return (
                              <Chip
                                key={grp.id}
                                label={grp.visibility === "private" ? `🔒 #${grp.name}` : `#${grp.name}`}
                                size="small"
                                clickable
                                color={isSelected ? "primary" : "default"}
                                variant={isSelected ? "filled" : "outlined"}
                                onClick={() => handleToggleGroup(idx, grp.id)}
                                sx={{
                                  fontSize: "11px",
                                  fontWeight: 600,
                                }}
                              />
                            );
                          })}
                        </Box>
                      </TableCell>

                      {/* Remove Row Action */}
                      <TableCell sx={{ py: 1.5, verticalAlign: "top" }}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveRow(idx)}
                          disabled={entries.length <= 1 || loading || success}
                        >
                          <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddRow}
                disabled={loading || success}
                sx={{ fontSize: "11.5px", textTransform: "none", fontWeight: 700 }}
              >
                + Add Another Invitee
              </Button>
            </Box>
          </Box>
        )}

        {activeTab === "link" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, py: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Anyone with this link can join <strong>{orgName}</strong> with default Member access.
            </Typography>

            <Paper
              variant="outlined"
              sx={{
                p: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                bgcolor: "action.hover",
                borderRadius: "8px",
                gap: 2,
              }}
            >
              <Box sx={{ minWidth: 0, overflow: "hidden" }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Active Workspace Invite URL
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: "monospace",
                    fontWeight: 700,
                    color: "primary.main",
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                  }}
                >
                  {inviteLink}
                </Typography>
              </Box>

              <Button
                variant={copiedLink ? "contained" : "outlined"}
                color={copiedLink ? "success" : "primary"}
                size="small"
                onClick={handleCopyLink}
                startIcon={copiedLink ? <CheckIcon /> : <ContentCopyIcon />}
                sx={{ flexShrink: 0, textTransform: "none", fontWeight: 700 }}
              >
                {copiedLink ? "Copied Link!" : "Copy Link"}
              </Button>
            </Paper>

            <Box sx={{ p: 2, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "8px" }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary", display: "block", mb: 0.5 }}>
                Security & Expiry
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Join links expire in 7 days by default. You can revoke or rotate workspace join codes at any time in Workspace Settings &gt; Security.
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid", borderColor: "divider", justifyContent: "space-between" }}>
        <Button onClick={onClose} disabled={loading} variant="text" size="small">
          Close
        </Button>

        {activeTab === "bulk" && (
          <Button
            onClick={handleSubmit}
            disabled={loading || success || !entries.some((e) => e.email.trim())}
            variant="contained"
            color="primary"
            size="small"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ fontWeight: 700, px: 2.5 }}
          >
            Send {entries.filter((e) => e.email.trim()).length || 1} Invitation(s)
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
