import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  InputAdornment,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import TagIcon from "@mui/icons-material/Tag";

const TextFieldAny = TextField as any;

interface Props {
  initialMode?: "create" | "join";
  hasActiveOrg?: boolean;
  onBackToWorkspace?: () => void;
  onCreateWorkspace: (
    name: string,
    description: string,
    logoUrl?: string,
    industry?: string,
    slug?: string,
    starterChannels?: string[]
  ) => Promise<void>;
  onJoinWorkspace: (code: string) => Promise<void>;
}

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function WorkspaceHubView({
  initialMode = "create",
  hasActiveOrg = false,
  onBackToWorkspace,
  onCreateWorkspace,
  onJoinWorkspace,
}: Props) {
  const [mode, setMode] = useState<"create" | "join">(initialMode);

  // Create Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [starterChannels, setStarterChannels] = useState<string[]>([
    "general",
    "announcements",
    "random",
  ]);
  const [newChannelInput, setNewChannelInput] = useState("");

  // Join Form state
  const [joinCode, setJoinCode] = useState("");

  // Submission state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displaySlug = slugEdited ? customSlug : generateSlug(name) || "my-team";

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugEdited) {
      setCustomSlug(generateSlug(val));
    }
  };

  const handleAddChannel = () => {
    const clean = newChannelInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (clean && !starterChannels.includes(clean)) {
      setStarterChannels([...starterChannels, clean]);
      setNewChannelInput("");
    }
  };

  const handleRemoveChannel = (ch: string) => {
    if (starterChannels.length > 1) {
      setStarterChannels(starterChannels.filter((c) => c !== ch));
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onCreateWorkspace(
        name.trim(),
        description.trim(),
        undefined,
        "General",
        displaySlug,
        starterChannels
      );
    } catch (err: any) {
      setError(err?.message || "Failed to create workspace. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) return;
    setLoading(true);
    setError(null);
    try {
      await onJoinWorkspace(cleanCode);
    } catch (err: any) {
      setError(err?.message || "Invalid or expired workspace invite code.");
    } finally {
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
      <Box sx={{ maxWidth: 760, width: "100%", display: "flex", flexDirection: "column", gap: 3.5 }}>
        {/* Flat Top Header & Mode Navigation (No box) */}
        <Box sx={{ pb: 3, borderBottom: "1px solid", borderColor: "divider" }}>
          {/* Back link if active org exists */}
          {hasActiveOrg && onBackToWorkspace && (
            <Button
              variant="text"
              size="small"
              startIcon={<ArrowBackIcon sx={{ fontSize: 15 }} />}
              onClick={onBackToWorkspace}
              sx={{ fontWeight: 700, textTransform: "none", color: "text.secondary", mb: 1, p: 0 }}
            >
              Back to Workspace
            </Button>
          )}

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
            <Box sx={{ maxWidth: 520 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em", color: "text.primary", mt: 0.5, fontSize: { xs: "1.6rem", md: "2rem" } }}>
                {mode === "create" ? "Create a New Workspace" : "Join a Workspace"}
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.6, fontSize: "13.5px" }}>
                {mode === "create"
                  ? "Set up a private, end-to-end encrypted space for your company or team projects."
                  : "Enter an invite code provided by your organization administrator to access shared channels."}
              </Typography>
            </Box>

            {/* Mode Switch Pills */}
            <Box sx={{ display: "flex", gap: 1, bgcolor: "action.hover", p: 0.5, borderRadius: "24px" }}>
              <Chip
                label="Create Workspace"
                size="small"
                onClick={() => setMode("create")}
                variant={mode === "create" ? "filled" : "outlined"}
                color={mode === "create" ? "primary" : "default"}
                sx={{
                  fontWeight: 700,
                  fontSize: "12px",
                  height: 30,
                  cursor: "pointer",
                  border: mode === "create" ? "none" : "1px solid transparent",
                }}
              />
              <Chip
                label="Join with Code"
                size="small"
                onClick={() => setMode("join")}
                variant={mode === "join" ? "filled" : "outlined"}
                color={mode === "join" ? "primary" : "default"}
                sx={{
                  fontWeight: 700,
                  fontSize: "12px",
                  height: 30,
                  cursor: "pointer",
                  border: mode === "join" ? "none" : "1px solid transparent",
                }}
              />
            </Box>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ borderRadius: "8px" }}>
            {error}
          </Alert>
        )}

        {/* FLAT CREATE WORKSPACE FORM (No enclosing paper box) */}
        {mode === "create" && (
          <Box
            component="form"
            onSubmit={handleCreateSubmit}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            {/* Workspace Name */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "13.5px", color: "text.primary" }}>
                Workspace Name
              </Typography>
              <TextFieldAny
                placeholder="e.g. Acme Technologies"
                value={name}
                onChange={(e: any) => handleNameChange(e.target.value)}
                disabled={loading}
                autoFocus
                required
                fullWidth
                size="small"
                InputProps={{
                  style: { fontSize: "13.5px", borderRadius: 8 },
                }}
                helperText="The display name for your company or team workspace."
              />
            </Box>

            {/* Slug / URL */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "13.5px", color: "text.primary" }}>
                Workspace Web Address
              </Typography>
              <TextFieldAny
                value={displaySlug}
                onChange={(e: any) => {
                  setSlugEdited(true);
                  setCustomSlug(generateSlug(e.target.value));
                }}
                disabled={loading}
                required
                fullWidth
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                        pingme.io/
                      </Typography>
                    </InputAdornment>
                  ),
                  style: { fontSize: "13.5px", borderRadius: 8 },
                }}
                helperText="Custom slug identifier for direct workspace access."
              />
            </Box>

            {/* Description */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "13.5px", color: "text.primary" }}>
                Description (Optional)
              </Typography>
              <TextFieldAny
                placeholder="What does your team or department collaborate on?"
                value={description}
                onChange={(e: any) => setDescription(e.target.value)}
                disabled={loading}
                multiline
                rows={2}
                fullWidth
                size="small"
                InputProps={{
                  style: { fontSize: "13.5px", borderRadius: 8 },
                }}
              />
            </Box>

            {/* Starter Channels */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "13.5px", color: "text.primary" }}>
                Initial Channels
              </Typography>

              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, my: 0.5 }}>
                {starterChannels.map((ch) => (
                  <Chip
                    key={ch}
                    icon={<TagIcon sx={{ fontSize: "14px !important" }} />}
                    label={ch}
                    onDelete={starterChannels.length > 1 ? () => handleRemoveChannel(ch) : undefined}
                    size="small"
                    sx={{ fontWeight: 700, fontSize: "12px", height: 28 }}
                  />
                ))}
              </Box>

              <Box sx={{ display: "flex", gap: 1, maxWidth: 380 }}>
                <TextFieldAny
                  placeholder="Add channel (e.g. engineering, design)"
                  value={newChannelInput}
                  onChange={(e: any) => setNewChannelInput(e.target.value)}
                  onKeyDown={(e: any) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddChannel();
                    }
                  }}
                  size="small"
                  fullWidth
                  InputProps={{
                    style: { fontSize: "13px", borderRadius: 8, height: 34 },
                  }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleAddChannel}
                  disabled={!newChannelInput.trim()}
                  sx={{ fontWeight: 700, textTransform: "none", px: 2, borderRadius: "8px", height: 34 }}
                >
                  Add
                </Button>
              </Box>
            </Box>

            {/* Submit Action */}
            <Box sx={{ pt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={!name.trim() || loading}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon sx={{ fontSize: 18 }} />}
                sx={{
                  fontWeight: 700,
                  textTransform: "none",
                  py: 1.1,
                  px: 3.5,
                  borderRadius: "8px",
                  fontSize: "14px",
                }}
              >
                {loading ? "Creating Workspace…" : "Create Workspace & Launch"}
              </Button>
            </Box>
          </Box>
        )}

        {/* FLAT JOIN WORKSPACE FORM (No enclosing paper box) */}
        {mode === "join" && (
          <Box
            component="form"
            onSubmit={handleJoinSubmit}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, maxWidth: 440 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "13.5px", color: "text.primary" }}>
                Workspace Join / Invite Code
              </Typography>
              <TextFieldAny
                placeholder="e.g. ACME-XYZ7"
                value={joinCode}
                onChange={(e: any) => setJoinCode(e.target.value)}
                disabled={loading}
                autoFocus
                required
                fullWidth
                size="small"
                inputProps={{ maxLength: 40, style: { textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em", fontSize: "14px" } }}
                InputProps={{
                  style: { borderRadius: 8 },
                }}
                helperText="Ask your workspace administrator or team lead for the 8-character code."
              />
            </Box>

            <Box sx={{ pt: 1 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={!joinCode.trim() || loading}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon sx={{ fontSize: 18 }} />}
                sx={{
                  fontWeight: 700,
                  textTransform: "none",
                  py: 1.1,
                  px: 3.5,
                  borderRadius: "8px",
                  fontSize: "14px",
                }}
              >
                {loading ? "Joining Workspace…" : "Join Workspace"}
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
