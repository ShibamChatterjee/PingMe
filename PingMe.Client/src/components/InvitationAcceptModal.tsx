import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  Chip,
  Paper,
  Divider,
  CircularProgress,
  Alert,
} from "@mui/material";
import CorporateFareIcon from "@mui/icons-material/CorporateFare";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import { RoleBadge } from "./RoleBadge";
import { api, type OrganizationResponseDto, type InvitePreviewDto } from "../lib/api";

interface Props {
  token: string;
  onClose: () => void;
  onAccepted: (org: OrganizationResponseDto) => void;
}

export function InvitationAcceptModal({
  token,
  onClose,
  onAccepted,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<InvitePreviewDto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    let mounted = true;
    api.orgs.getInvitePreview(token)
      .then((data) => {
        if (mounted) {
          setPreview(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load invitation details");
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [token]);

  const handleAcceptClick = async () => {
    const authData = localStorage.getItem("pingme.auth");
    if (!authData) {
      setError("Please log in first to accept this invitation.");
      return;
    }
    const { token: userToken } = JSON.parse(authData);
    setSubmitting(true);
    setError(null);
    try {
      const org = await api.orgs.acceptInvite(userToken, token);
      setAccepted(true);
      setTimeout(() => {
        onAccepted(org);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeclineClick = async () => {
    const authData = localStorage.getItem("pingme.auth");
    if (authData) {
      const { token: userToken } = JSON.parse(authData);
      await api.orgs.declineInvite(userToken, token).catch(() => {});
    }
    setDeclined(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  if (loading) {
    return (
      <Dialog open onClose={onClose} fullWidth maxWidth="sm">
        <DialogContent sx={{ p: 4, display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
          <CircularProgress size={32} />
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !preview) {
    return (
      <Dialog open onClose={onClose} fullWidth maxWidth="sm">
        <DialogContent sx={{ p: 4, display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
          <Alert severity="error" sx={{ width: "100%" }}>
            {error || "Invalid or expired invitation token."}
          </Alert>
          <Button variant="outlined" onClick={onClose}>
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogContent sx={{ p: { xs: 3, sm: 4 } }}>
        {!accepted && !declined && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            {/* Org Logo / Icon */}
            {preview.logoUrl ? (
              <Box
                component="img"
                src={preview.logoUrl}
                alt={preview.organizationName}
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: "16px",
                  objectFit: "cover",
                  border: "2px solid",
                  borderColor: "divider",
                  mb: 2,
                  boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12)",
                }}
              />
            ) : (
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: "16px",
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 2,
                }}
              >
                <CorporateFareIcon sx={{ fontSize: 36 }} />
              </Box>
            )}

            <Typography variant="overline" sx={{ letterSpacing: "0.15em", color: "text.secondary", fontWeight: 700 }}>
              You've been invited to join
            </Typography>

            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: "-0.02em", color: "text.primary", mb: 0.5 }}>
              {preview.organizationName}
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, mb: 3 }}>
              {preview.description || "Enterprise workspace and team communication hub."}
            </Typography>

            {/* Invite Details Card */}
            <Paper
              variant="outlined"
              sx={{
                width: "100%",
                p: 2.5,
                borderRadius: "12px",
                bgcolor: "action.hover",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
                mb: 3.5,
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                  Invited By
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {preview.inviterName}
                </Typography>
              </Box>

              <Divider />

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                  Assigned Workspace Role
                </Typography>
                <RoleBadge role={preview.role} size="medium" />
              </Box>

              <Divider />

              <div>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", mb: 1, display: "block" }}>
                  Pre-Assigned Channels & Groups ({preview.initialGroupNames.length})
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                  {preview.initialGroupNames.length > 0 ? (
                    preview.initialGroupNames.map((ch) => (
                      <Chip
                        key={ch}
                        label={`#${ch}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: "11px" }}
                      />
                    ))
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      Standard public channels
                    </Typography>
                  )}
                </Box>
              </div>
            </Paper>

            {/* Action Buttons */}
            <Box sx={{ display: "flex", gap: 1.5, width: "100%" }}>
              <Button
                variant="outlined"
                color="inherit"
                fullWidth
                onClick={handleDeclineClick}
                disabled={submitting}
                sx={{ py: 1.2, fontWeight: 700, textTransform: "none" }}
              >
                Decline
              </Button>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleAcceptClick}
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
                sx={{ py: 1.2, fontWeight: 700, textTransform: "none" }}
              >
                Accept Invitation
              </Button>
            </Box>
          </Box>
        )}

        {/* Accepted Success Screen */}
        {accepted && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", py: 3 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                bgcolor: "success.light",
                color: "success.dark",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 2,
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 40 }} />
            </Box>

            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
              Welcome to {preview.organizationName}!
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Redirecting you to your new workspace...
            </Typography>
          </Box>
        )}

        {/* Declined Screen */}
        {declined && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", py: 3 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                bgcolor: "action.hover",
                color: "text.secondary",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 2,
              }}
            >
              <CancelOutlinedIcon sx={{ fontSize: 40 }} />
            </Box>

            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
              Invitation Declined
            </Typography>

            <Typography variant="body2" color="text.secondary">
              You have declined the invitation to {preview.organizationName}.
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
