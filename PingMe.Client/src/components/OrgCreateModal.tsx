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
  Box,
  Stepper,
  Step,
  StepLabel,
  InputAdornment,
  Chip,
} from "@mui/material";
import CorporateFareOutlinedIcon from "@mui/icons-material/CorporateFareOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";

const TextFieldAny = TextField as any;

interface Props {
  onClose: () => void;
  onCreate: (
    name: string,
    description: string,
    logoUrl?: string,
    industry?: string,
    slug?: string,
    starterChannels?: string[],
  ) => Promise<void>;
}

const PRESET_LOGOS = [
  { id: "tech-1", label: "Aurora", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80" },
  { id: "tech-2", label: "Nexus", url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=128&auto=format&fit=crop&q=80" },
  { id: "tech-3", label: "Pulse", url: "https://images.unsplash.com/photo-1557683316-973673baf926?w=128&auto=format&fit=crop&q=80" },
  { id: "tech-4", label: "Vector", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80" },
];

const INDUSTRIES = ["Software & Tech", "Design & Creative", "Finance & Fintech", "Healthcare", "Consulting", "Media & Production"];

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function OrgCreateModal({ onClose, onCreate }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("Software & Tech");
  const [logoUrl, setLogoUrl] = useState<string>(PRESET_LOGOS[0].url);
  const [customLogoInput, setCustomLogoInput] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [starterChannels, setStarterChannels] = useState<string[]>([
    "general",
    "announcements",
    "engineering",
    "random",
  ]);
  const [newChannelName, setNewChannelName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displaySlug = slugEdited ? customSlug : generateSlug(name) || "workspace-id";

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugEdited) {
      setCustomSlug(generateSlug(val));
    }
  };

  const handleAddChannel = () => {
    const clean = newChannelName.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (clean && !starterChannels.includes(clean)) {
      setStarterChannels([...starterChannels, clean]);
      setNewChannelName("");
    }
  };

  const handleRemoveChannel = (ch: string) => {
    if (starterChannels.length > 1) {
      setStarterChannels(starterChannels.filter((c) => c !== ch));
    }
  };

  const handleFinalSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onCreate(
        name.trim(),
        description.trim(),
        logoUrl,
        industry,
        displaySlug,
        starterChannels,
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization");
    } finally {
      setLoading(false);
    }
  };

  const steps = ["Details & URL", "Logo & Branding", "Channels & Launch"];

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1, pt: 2.5, px: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <CorporateFareOutlinedIcon sx={{ color: "primary.main", fontSize: 28 }} />
          <div>
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: "-0.01em" }}>
              Create Organization
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Set up your team workspace. You will become the Organization Owner.
            </Typography>
          </div>
        </Box>

        <Stepper activeStep={step} sx={{ mt: 2.5, mb: 1 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel sx={{ "& .MuiStepLabel-label": { fontSize: "11.5px", fontWeight: 600 } }}>
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2, display: "flex", flexDirection: "column", gap: 2.5 }}>
        {error && <Alert severity="error">{error}</Alert>}

        {/* STEP 0: DETAILS & WORKSPACE ID / URL */}
        {step === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextFieldAny
              id="org-create-name"
              label="Organization Name"
              placeholder="e.g. Acme Technologies"
              value={name}
              onChange={(e: any) => handleNameChange(e.target.value)}
              disabled={loading}
              autoFocus
              required
              fullWidth
              size="small"
              helperText="The public display name for your company or team workspace"
            />

            <div>
              <TextFieldAny
                id="org-create-slug"
                label="Workspace URL & Unique Identifier"
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
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                This is your unique workspace slug used for direct team access.
              </Typography>
            </div>

            <TextFieldAny
              id="org-create-desc"
              label="Organization Description (Optional)"
              placeholder="e.g. Enterprise software engineering, core infrastructure, and client applications."
              value={description}
              onChange={(e: any) => setDescription(e.target.value)}
              disabled={loading}
              multiline
              rows={2}
              fullWidth
              size="small"
            />

            <div>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", mb: 1, display: "block" }}>
                Industry / Category
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                {INDUSTRIES.map((ind) => (
                  <Chip
                    key={ind}
                    label={ind}
                    size="small"
                    variant={industry === ind ? "filled" : "outlined"}
                    color={industry === ind ? "primary" : "default"}
                    onClick={() => setIndustry(ind)}
                    sx={{ fontWeight: 600, fontSize: "11.5px" }}
                  />
                ))}
              </Box>
            </div>
          </Box>
        )}

        {/* STEP 1: LOGO & BRANDING */}
        {step === 1 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 3, p: 2, bgcolor: "action.hover", borderRadius: 2 }}>
              <Box
                component="img"
                src={logoUrl}
                alt="Logo preview"
                sx={{
                  width: 68,
                  height: 68,
                  borderRadius: "12px",
                  objectFit: "cover",
                  border: "2px solid",
                  borderColor: "primary.main",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
              <div>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Workspace Logo Preview
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Displayed on the workspace rail, headers, and team invitations.
                </Typography>
              </div>
            </Box>

            <div>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", mb: 1, display: "block" }}>
                Choose a Curated Emblem Preset:
              </Typography>
              <Box sx={{ display: "flex", gap: 1.5 }}>
                {PRESET_LOGOS.map((item) => (
                  <Box
                    key={item.id}
                    onClick={() => setLogoUrl(item.url)}
                    sx={{
                      cursor: "pointer",
                      p: 0.5,
                      borderRadius: "10px",
                      border: "2px solid",
                      borderColor: logoUrl === item.url ? "primary.main" : "divider",
                      "&:hover": { borderColor: "primary.light" },
                    }}
                  >
                    <Box
                      component="img"
                      src={item.url}
                      alt={item.label}
                      sx={{ width: 44, height: 44, borderRadius: "6px", objectFit: "cover" }}
                    />
                  </Box>
                ))}
              </Box>
            </div>

            <TextFieldAny
              label="Or Paste Custom Image URL"
              placeholder="https://..."
              value={customLogoInput}
              onChange={(e: any) => {
                setCustomLogoInput(e.target.value);
                if (e.target.value.startsWith("http")) {
                  setLogoUrl(e.target.value);
                }
              }}
              fullWidth
              size="small"
            />
          </Box>
        )}

        {/* STEP 2: STARTER CHANNELS & ROLE CONFIRMATION */}
        {step === 2 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Box sx={{ p: 2, bgcolor: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <WorkspacePremiumIcon sx={{ color: "#d97706", fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#b45309" }}>
                  Role Assignment: Organization Owner
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                As the workspace creator, you will be assigned the <strong>Owner</strong> role with complete administrative control, billing authority, and permission management.
              </Typography>
            </Box>

            <div>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Initial Starter Channels:
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1.5 }}>
                {starterChannels.map((ch) => (
                  <Chip
                    key={ch}
                    label={`#${ch}`}
                    onDelete={starterChannels.length > 1 ? () => handleRemoveChannel(ch) : undefined}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                ))}
              </Box>

              <Box sx={{ display: "flex", gap: 1 }}>
                <TextFieldAny
                  placeholder="Add custom channel (e.g. devops, design)"
                  value={newChannelName}
                  onChange={(e: any) => setNewChannelName(e.target.value)}
                  onKeyDown={(e: any) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddChannel();
                    }
                  }}
                  size="small"
                  fullWidth
                />
                <Button variant="outlined" size="small" onClick={handleAddChannel} disabled={!newChannelName.trim()}>
                  Add
                </Button>
              </Box>
            </div>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid", borderColor: "divider", justifyContent: "space-between" }}>
        <Button onClick={onClose} disabled={loading} variant="text" size="small">
          Cancel
        </Button>

        <Box sx={{ display: "flex", gap: 1 }}>
          {step > 0 && (
            <Button onClick={() => setStep(step - 1)} disabled={loading} variant="outlined" size="small">
              Back
            </Button>
          )}

          {step < 2 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!name.trim()}
              variant="contained"
              size="small"
            >
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleFinalSubmit}
              disabled={!name.trim() || loading}
              variant="contained"
              color="primary"
              size="small"
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon sx={{ fontSize: 18 }} />}
            >
              Create Workspace & Launch
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
}
