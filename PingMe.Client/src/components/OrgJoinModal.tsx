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
} from "@mui/material";

const TextFieldAny = TextField as any;

interface Props {
  onClose: () => void;
  onJoin: (code: string) => Promise<void>;
}

export function OrgJoinModal({ onClose, onJoin }: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      await onJoin(trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid or expired join code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: "bold" }}>Join a Workspace</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Enter your invite or join code below.
          </Typography>

          <TextFieldAny
            id="org-join-code"
            label="Join Code"
            placeholder="e.g. ACME-XYZ7"
            value={code}
            onChange={(e: any) => setCode(e.target.value)}
            disabled={loading}
            autoFocus
            required
            fullWidth
            size="small"
            inputProps={{ maxLength: 40, style: { textTransform: "uppercase" } }}
          />

          <Typography variant="caption" color="text.secondary" sx={{ mt: -0.5 }}>
            Ask your workspace admin for the invite link or join code.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {error}
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={onClose} disabled={loading} variant="outlined" size="small">
            Cancel
          </Button>
          <Button
            type="submit"
            id="org-join-submit"
            disabled={!code.trim() || loading}
            variant="contained"
            size="small"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            Join Workspace
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
