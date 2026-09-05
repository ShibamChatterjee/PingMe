import { useState, useMemo } from "react";
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
  Box,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Switch,
  Autocomplete,
  Divider,
} from "@mui/material";
import TagIcon from "@mui/icons-material/Tag";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CloseIcon from "@mui/icons-material/Close";
import type { FullOrganization, OrgMember } from "../lib/orgStore";
import { Avatar as CustomAvatar } from "./Avatar";
import { RoleBadge } from "./RoleBadge";

const TextFieldAny = TextField as any;
const AutocompleteAny = Autocomplete as any;

interface Props {
  org: FullOrganization;
  myUserId: string;
  onClose: () => void;
  onCreateGroup: (group: {
    name: string;
    description: string;
    visibility: "public" | "private";
    groupManagerId: string;
    memberUserIds: string[];
  }) => Promise<void>;
}

export function CreateGroupModal({
  org,
  myUserId,
  onClose,
  onCreateGroup,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [memberSelectionType, setMemberSelectionType] = useState<"all" | "custom">("custom");
  const [groupManagerId, setGroupManagerId] = useState<string>(myUserId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligibleMembers = useMemo(() => {
    return org.members.filter((m) => !m.isSuspended);
  }, [org.members]);

  const creatorMember = useMemo(() => {
    return eligibleMembers.find((m) => m.userId === myUserId) || eligibleMembers[0];
  }, [eligibleMembers, myUserId]);

  const [selectedMembers, setSelectedMembers] = useState<OrgMember[]>(() => {
    return creatorMember ? [creatorMember] : [];
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedName = name.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "");
    if (!formattedName) return;

    setLoading(true);
    setError(null);

    let finalMemberIds: string[];
    if (memberSelectionType === "all") {
      finalMemberIds = eligibleMembers.map((m) => m.userId);
    } else {
      const ids = new Set(selectedMembers.map((m) => m.userId));
      ids.add(myUserId);
      if (groupManagerId) ids.add(groupManagerId);
      finalMemberIds = Array.from(ids);
    }

    try {
      await onCreateGroup({
        name: formattedName,
        description: description.trim(),
        visibility: isPrivate ? "private" : "public",
        groupManagerId,
        memberUserIds: finalMemberIds,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create channel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 20px 48px rgba(0,0,0,0.18)",
          },
        },
      }}
    >
      {/* Slack-style Clean Header */}
      <DialogTitle
        sx={{
          px: 3,
          pt: 3,
          pb: 1.5,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.02em", color: "text.primary" }}>
            Create a channel
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Channels are spaces for team communication around a specific topic or project.
          </Typography>
        </div>

        <IconButton size="small" onClick={onClose} disabled={loading} sx={{ mt: -0.5, mr: -1 }}>
          <CloseIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2, display: "flex", flexDirection: "column", gap: 3 }}>
        {error && <Alert severity="error">{error}</Alert>}

        <form id="create-group-form" onSubmit={handleSubmit}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            {/* Channel Name */}
            <div>
              <TextFieldAny
                label="Name"
                placeholder="e.g. plan-launch, team-updates"
                value={name}
                onChange={(e: any) => setName(e.target.value)}
                disabled={loading}
                autoFocus
                required
                fullWidth
                size="small"
                InputProps={{
                  startAdornment: (
                    <TagIcon sx={{ fontSize: 18, color: "text.secondary", mr: 0.75 }} />
                  ),
                  sx: { borderRadius: "8px" },
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                Use lowercase letters, numbers, and hyphens without spaces.
              </Typography>
            </div>

            {/* Description */}
            <div>
              <TextFieldAny
                label="Description (optional)"
                placeholder="What's this channel about?"
                value={description}
                onChange={(e: any) => setDescription(e.target.value)}
                disabled={loading}
                fullWidth
                size="small"
                multiline
                rows={2}
                InputProps={{
                  sx: { borderRadius: "8px" },
                }}
              />
            </div>

            {/* Slack-style Make Private Switch */}
            <Box
              sx={{
                p: 2,
                borderRadius: "10px",
                border: "1px solid",
                borderColor: isPrivate ? "warning.main" : "divider",
                bgcolor: isPrivate ? "rgba(245, 158, 11, 0.04)" : "action.hover",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <div>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.25 }}>
                  {isPrivate ? (
                    <LockOutlinedIcon sx={{ fontSize: 18, color: "#d97706" }} />
                  ) : (
                    <TagIcon sx={{ fontSize: 18, color: "text.primary" }} />
                  )}
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isPrivate ? "warning.dark" : "text.primary" }}>
                    Make private
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.35 }}>
                  {isPrivate
                    ? "When a channel is private, it can only be viewed or joined by invitation."
                    : "When a channel is public, anyone in your workspace can view and join it."}
                </Typography>
              </div>

              <Switch
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                color="warning"
              />
            </Box>

            {/* Group Manager Selector */}
            <FormControl fullWidth size="small">
              <InputLabel id="grp-mgr-select-label">Channel Manager</InputLabel>
              <Select
                labelId="grp-mgr-select-label"
                label="Channel Manager"
                value={groupManagerId}
                onChange={(e) => setGroupManagerId(e.target.value)}
                sx={{ borderRadius: "8px" }}
              >
                {eligibleMembers.map((m) => (
                  <MenuItem key={m.userId} value={m.userId}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, width: "100%" }}>
                      <CustomAvatar name={m.username} src={m.avatarUrl} size={22} />
                      <Typography variant="body2" sx={{ fontWeight: 600, flexGrow: 1 }} noWrap>
                        {m.username} {m.userId === myUserId && "(You)"}
                      </Typography>
                      <RoleBadge role={m.role} size="small" />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Divider sx={{ my: 0.5 }} />

            {/* Slack-style Member Membership Selection */}
            <div>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                Who should be added to this channel?
              </Typography>

              <RadioGroup
                value={memberSelectionType}
                onChange={(e) => setMemberSelectionType(e.target.value as "all" | "custom")}
                sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 1.5 }}
              >
                <FormControlLabel
                  value="all"
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        Add all members of {org.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Automatically adds all {eligibleMembers.length} active workspace members.
                      </Typography>
                    </Box>
                  }
                />

                <FormControlLabel
                  value="custom"
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        Add specific people
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Search and select specific teammates to invite to this channel.
                      </Typography>
                    </Box>
                  }
                />
              </RadioGroup>

              {/* Slack-style Autocomplete Member Search */}
              {memberSelectionType === "custom" && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <AutocompleteAny
                    multiple
                    options={eligibleMembers}
                    getOptionLabel={(option: OrgMember) => option.username}
                    value={selectedMembers}
                    isOptionEqualToValue={(option: OrgMember, value: OrgMember) => option.userId === value.userId}
                    onChange={(_: any, newValue: OrgMember[]) => {
                      // Always keep creator in selection
                      const hasCreator = newValue.some((m) => m.userId === myUserId);
                      if (!hasCreator && creatorMember) {
                        setSelectedMembers([creatorMember, ...newValue]);
                      } else {
                        setSelectedMembers(newValue);
                      }
                    }}
                    renderTags={(value: OrgMember[], getTagProps: any) =>
                      value.map((option: OrgMember, index: number) => {
                        const isCreator = option.userId === myUserId;
                        const isManager = option.userId === groupManagerId;
                        const { key, ...tagProps } = getTagProps({ index });

                        return (
                          <Chip
                            key={option.userId}
                            avatar={<CustomAvatar name={option.username} src={option.avatarUrl} size={18} />}
                            label={`${option.username}${isCreator ? " (You)" : isManager ? " (Manager)" : ""}`}
                            size="small"
                            {...tagProps}
                            onDelete={isCreator ? undefined : tagProps.onDelete}
                            sx={{
                              borderRadius: "6px",
                              fontWeight: 600,
                              fontSize: "12px",
                              bgcolor: isCreator ? "action.selected" : undefined,
                            }}
                          />
                        );
                      })
                    }
                    renderOption={(props: any, option: OrgMember) => {
                      const { key, ...optionProps } = props;
                      const isCreator = option.userId === myUserId;
                      const isManager = option.userId === groupManagerId;

                      return (
                        <Box
                          key={option.userId}
                          component="li"
                          {...optionProps}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                            py: 1,
                            px: 1.5,
                          }}
                        >
                          <CustomAvatar name={option.username} src={option.avatarUrl} size={28} />
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                              {option.username} {isCreator && "(You)"} {isManager && "(Manager)"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "11px", display: "block" }} noWrap>
                              {option.email}
                            </Typography>
                          </Box>
                          <RoleBadge role={option.role} size="small" />
                        </Box>
                      );
                    }}
                    renderInput={(params: any) => (
                      <TextFieldAny
                        {...params}
                        placeholder={selectedMembers.length === 0 ? "Search by name or email..." : "Add more people…"}
                        label="Invite teammates"
                        size="small"
                        InputProps={{
                          ...params.InputProps,
                          sx: { borderRadius: "8px" },
                        }}
                      />
                    )}
                  />
                </Box>
              )}
            </div>
          </Box>
        </form>
      </DialogContent>

      {/* Slack-style Footer */}
      <DialogActions
        sx={{
          px: 3,
          py: 2.5,
          borderTop: "1px solid",
          borderColor: "divider",
          justifyContent: "flex-end",
          gap: 1.5,
        }}
      >
        <Button
          onClick={onClose}
          disabled={loading}
          variant="outlined"
          size="medium"
          sx={{ fontWeight: 700, textTransform: "none", borderRadius: "8px", px: 2.5 }}
        >
          Cancel
        </Button>
        <Button
          form="create-group-form"
          type="submit"
          disabled={!name.trim() || loading}
          variant="contained"
          color="primary"
          size="medium"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{
            fontWeight: 800,
            px: 3,
            borderRadius: "8px",
            textTransform: "none",
            boxShadow: "none",
            "&:hover": { boxShadow: "none" },
          }}
        >
          {loading ? "Creating…" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
