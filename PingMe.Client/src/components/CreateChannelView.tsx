import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Switch,
  FormControl,
  Select,
  MenuItem,
  RadioGroup,
  FormControlLabel,
  Radio,
  Autocomplete,
  Chip,
  Alert,
  CircularProgress,
  Divider,
} from "@mui/material";
import TagIcon from "@mui/icons-material/Tag";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import type { FullOrganization, OrgMember } from "../lib/orgStore";
import { Avatar as CustomAvatar } from "./Avatar";
import { RoleBadge } from "./RoleBadge";

const TextFieldAny = TextField as any;
const AutocompleteAny = Autocomplete as any;

interface Props {
  org: FullOrganization;
  myUserId: string;
  onBack: () => void;
  onCreateGroup: (group: {
    name: string;
    description: string;
    visibility: "public" | "private";
    groupManagerId: string;
    memberUserIds: string[];
  }) => Promise<any>;
  onChannelCreated?: (newGroup: any) => void;
}

export function CreateChannelView({
  org,
  myUserId,
  onBack,
  onCreateGroup,
  onChannelCreated,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [memberSelectionType, setMemberSelectionType] = useState<"all" | "custom">("all");
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

  const formattedName = useMemo(() => {
    return name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
  }, [name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formattedName) {
      setError("Please provide a valid channel name.");
      return;
    }

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
      const res = await onCreateGroup({
        name: formattedName,
        description: description.trim(),
        visibility: isPrivate ? "private" : "public",
        groupManagerId,
        memberUserIds: finalMemberIds,
      });

      if (onChannelCreated) {
        onChannelCreated(res);
      } else {
        onBack();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create channel");
      setLoading(false);
    }
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
        {/* Flat Header (Exact Match to Workspace Settings) */}
        <Box sx={{ pb: 3, borderBottom: "1px solid", borderColor: "divider" }}>
          <Button
            variant="text"
            size="small"
            startIcon={<ArrowBackIcon sx={{ fontSize: 15 }} />}
            onClick={onBack}
            sx={{ fontWeight: 700, textTransform: "none", color: "text.secondary", mb: 1, p: 0 }}
          >
            Back to Overview
          </Button>

          <Box sx={{ maxWidth: 640 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em", color: "text.primary", mt: 0.5, fontSize: { xs: "1.6rem", md: "2rem" } }}>
              Create a channel
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.6, fontSize: "13.5px" }}>
              Channels are spaces for team communication around a specific topic, department, or project.
            </Typography>
          </Box>
        </Box>

        {/* Flat Form Content Area */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 760 }}>
          {error && <Alert severity="error" sx={{ borderRadius: "8px" }}>{error}</Alert>}

          <form id="create-channel-form" onSubmit={handleSubmit}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {/* Row 1: Channel Name & Channel Manager (2 Columns) */}
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
                {/* Column 1: Channel Name */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "13.5px", color: "text.primary" }}>
                      Channel Name <Typography component="span" color="error.main">*</Typography>
                    </Typography>
                    {formattedName && (
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main", fontSize: "12px" }}>
                        Preview: #{formattedName}
                      </Typography>
                    )}
                  </Box>
                  <TextFieldAny
                    placeholder="e.g. plan-launch, frontend-team"
                    value={name}
                    onChange={(e: any) => setName(e.target.value)}
                    disabled={loading}
                    autoFocus
                    required
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <TagIcon sx={{ fontSize: 18, color: "text.secondary", mr: 0.75 }} />
                      ),
                      sx: { borderRadius: "8px" },
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Channels are lowercase with hyphens.
                  </Typography>
                </Box>

                {/* Column 2: Channel Manager */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "13.5px", color: "text.primary" }}>
                    Channel Manager
                  </Typography>
                  <FormControl fullWidth>
                    <Select
                      value={groupManagerId}
                      onChange={(e) => setGroupManagerId(e.target.value)}
                      sx={{ borderRadius: "8px" }}
                    >
                      {eligibleMembers.map((m) => (
                        <MenuItem key={m.userId} value={m.userId}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, width: "100%" }}>
                            <CustomAvatar name={m.username} src={m.avatarUrl} size={22} />
                            <Typography variant="body2" sx={{ fontWeight: 600, flexGrow: 1, fontSize: "13.5px" }} noWrap>
                              {m.username} {m.userId === myUserId && "(You)"}
                            </Typography>
                            <RoleBadge role={m.role} />
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Typography variant="caption" color="text.secondary">
                    Assign the moderator for this channel.
                  </Typography>
                </Box>
              </Box>

              {/* Row 2: Description & Visibility (2 Columns) */}
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5, alignItems: "start" }}>
                {/* Column 1: Description */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "13.5px", color: "text.primary" }}>
                    Description <Typography component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>(optional)</Typography>
                  </Typography>
                  <TextFieldAny
                    placeholder="What's this channel about? e.g. Daily standups"
                    value={description}
                    onChange={(e: any) => setDescription(e.target.value)}
                    disabled={loading}
                    fullWidth
                    multiline
                    rows={2.5}
                    InputProps={{
                      sx: { borderRadius: "8px" },
                    }}
                  />
                </Box>

                {/* Column 2: Visibility Toggle Card */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "13.5px", color: "text.primary" }}>
                    Visibility & Privacy
                  </Typography>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: "8px",
                      bgcolor: "action.hover",
                      border: "1px solid",
                      borderColor: isPrivate ? "warning.main" : "divider",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
                      minHeight: 82,
                    }}
                  >
                    <Box sx={{ maxWidth: 280 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.25 }}>
                        {isPrivate ? (
                          <LockOutlinedIcon sx={{ fontSize: 18, color: "warning.main" }} />
                        ) : (
                          <TagIcon sx={{ fontSize: 18, color: "text.primary" }} />
                        )}
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isPrivate ? "warning.dark" : "text.primary", fontSize: "13.5px" }}>
                          {isPrivate ? "Private Channel" : "Public Channel"}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.4 }}>
                        {isPrivate
                          ? "Only invited teammates can access or view this channel."
                          : "Any member of your workspace can view and join."}
                      </Typography>
                    </Box>

                    <Switch
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      color="warning"
                    />
                  </Box>
                </Box>
              </Box>

              {/* Row 3: Channel Access & Membership (2 Columns Side-by-Side) */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "13.5px", color: "text.primary" }}>
                  Channel Access & Membership
                </Typography>
                <RadioGroup
                  value={memberSelectionType}
                  onChange={(e) => setMemberSelectionType(e.target.value as "all" | "custom")}
                  sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}
                >
                  <Box
                    sx={{
                      px: 2,
                      py: 1.5,
                      borderRadius: "8px",
                      border: "1px solid",
                      borderColor: memberSelectionType === "all" ? "primary.main" : "divider",
                      bgcolor: memberSelectionType === "all" ? "action.selected" : "transparent",
                      cursor: "pointer",
                    }}
                    onClick={() => setMemberSelectionType("all")}
                  >
                    <FormControlLabel
                      value="all"
                      control={<Radio size="small" />}
                      label={
                        <Box sx={{ py: 0.25 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "13.5px" }}>
                            All members ({eligibleMembers.length})
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "12px", display: "block", mt: 0.25 }}>
                            Every teammate in {org.name} will be added.
                          </Typography>
                        </Box>
                      }
                      sx={{ width: "100%", m: 0 }}
                    />
                  </Box>

                  <Box
                    sx={{
                      px: 2,
                      py: 1.5,
                      borderRadius: "8px",
                      border: "1px solid",
                      borderColor: memberSelectionType === "custom" ? "primary.main" : "divider",
                      bgcolor: memberSelectionType === "custom" ? "action.selected" : "transparent",
                      cursor: "pointer",
                    }}
                    onClick={() => setMemberSelectionType("custom")}
                  >
                    <FormControlLabel
                      value="custom"
                      control={<Radio size="small" />}
                      label={
                        <Box sx={{ py: 0.25 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "13.5px" }}>
                            Select specific members
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "12px", display: "block", mt: 0.25 }}>
                            Choose teammates to invite upon creation.
                          </Typography>
                        </Box>
                      }
                      sx={{ width: "100%", m: 0 }}
                    />
                  </Box>
                </RadioGroup>
              </Box>

              {/* Custom Member Autocomplete (If selected) */}
              {memberSelectionType === "custom" && (
                <Box>
                  <AutocompleteAny
                    multiple
                    options={eligibleMembers}
                    getOptionLabel={(option: OrgMember) => option.username}
                    value={selectedMembers}
                    onChange={(_: any, newValue: OrgMember[]) => {
                      const hasCreator = newValue.some((m) => m.userId === myUserId);
                      if (!hasCreator && creatorMember) {
                        setSelectedMembers([creatorMember, ...newValue]);
                      } else {
                        setSelectedMembers(newValue);
                      }
                    }}
                    isOptionEqualToValue={(option: OrgMember, val: OrgMember) => option.userId === val.userId}
                    renderTags={(value: OrgMember[], getTagProps: any) =>
                      value.map((option: OrgMember, index: number) => {
                        const isSelf = option.userId === myUserId;
                        return (
                          <Chip
                            {...getTagProps({ index })}
                            key={option.userId}
                            avatar={<CustomAvatar name={option.username} src={option.avatarUrl} size={18} />}
                            label={`${option.username}${isSelf ? " (You)" : ""}`}
                            size="small"
                            onDelete={isSelf ? undefined : getTagProps({ index }).onDelete}
                            sx={{ borderRadius: "6px", height: 26, fontSize: "12.5px" }}
                          />
                        );
                      })
                    }
                    renderOption={(props: any, option: OrgMember) => (
                      <li {...props} key={option.userId}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, width: "100%" }}>
                          <CustomAvatar name={option.username} src={option.avatarUrl} size={22} />
                          <Typography variant="body2" sx={{ fontWeight: 600, flexGrow: 1, fontSize: "13.5px" }}>
                            {option.username} {option.userId === myUserId && "(You)"}
                          </Typography>
                          <RoleBadge role={option.role} />
                        </Box>
                      </li>
                    )}
                    renderInput={(params: any) => (
                      <TextFieldAny
                        {...params}
                        placeholder="Search & add teammates..."
                        InputProps={{
                          ...params.InputProps,
                          sx: { borderRadius: "8px" },
                        }}
                      />
                    )}
                  />
                </Box>
              )}

              <Divider sx={{ my: 0.5 }} />

              {/* Action Buttons */}
              <Box sx={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={loading || !formattedName}
                  startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 18 }} />}
                  sx={{
                    fontWeight: 700,
                    textTransform: "none",
                    borderRadius: "8px",
                    px: 3.5,
                    py: 1,
                    fontSize: "14px",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
                  }}
                >
                  {loading ? "Creating..." : "Create Channel"}
                </Button>

                <Button
                  variant="outlined"
                  onClick={onBack}
                  disabled={loading}
                  sx={{
                    fontWeight: 700,
                    textTransform: "none",
                    borderRadius: "8px",
                    px: 3,
                    py: 1,
                    fontSize: "14px",
                  }}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          </form>
        </Box>
      </Box>
    </Box>
  );
}
