import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type { AuthResult } from "../lib/api";
import { initSodium, deriveIdentityKeyPair } from "../lib/crypto";
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from "@mui/material";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

const TextFieldAny = TextField as any;

interface Props {
  onAuth: (a: AuthResult, privateKey: string | null, email: string, isSignUp?: boolean) => void;
}

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

export function AuthScreen({ onAuth }: Props) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Initialize Google Identity Services
  useEffect(() => {
    const initGoogle = () => {
      const google = (window as any).google;
      if (!google?.accounts?.id) return false;

      try {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (googleBtnRef.current) {
          google.accounts.id.renderButton(googleBtnRef.current, {
            theme: "outline",
            size: "large",
            width: 340,
            text: "continue_with",
            shape: "rectangular",
            logo_alignment: "left",
          });
        }
        setGoogleReady(true);
        return true;
      } catch (e) {
        console.error("Failed to initialize Google Sign-In:", e);
        return false;
      }
    };

    if (!initGoogle()) {
      const interval = setInterval(() => {
        if (initGoogle()) clearInterval(interval);
      }, 300);
      return () => clearInterval(interval);
    }
  }, []);

  const handleGoogleResponse = async (response: any) => {
    if (!response?.credential) {
      setErr("Google sign-in did not return a valid credential.");
      return;
    }

    setErr("");
    setLoading(true);

    try {
      const auth = await api.googleLogin(response.credential);
      onAuth(auth, null, auth.email || "", auth.isNewUser);
    } catch (e: unknown) {
      console.error("Google login failed:", e);
      const msg = e instanceof Error ? e.message : String(e);
      setErr(`Google sign-in failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    setErr("");
    setLoading(true);
    try {
      await initSodium();

      if (tab === "register") {
        const auth = await api.register(form.username, form.email, form.password);

        // Deterministically derive keypair from email + password.
        const { publicKey, privateKey } = deriveIdentityKeyPair(
          form.email,
          form.password,
        );

        // Publish our public key so peers can encrypt messages to us
        await api.publishKey(auth.accessToken, publicKey);

        onAuth(auth, privateKey, form.email, true);
      } else {
        let auth: AuthResult;
        try {
          auth = await api.login(form.email, form.password);
        } catch {
          setErr("Invalid email or password");
          setLoading(false);
          return;
        }

        // Derive the same keypair from credentials
        const { publicKey, privateKey } = deriveIdentityKeyPair(
          form.email,
          form.password,
        );

        // Re-publish public key on each login to ensure freshness
        try {
          await api.publishKey(auth.accessToken, publicKey);
        } catch (e) {
          console.warn("publishKey failed (non-fatal):", e);
        }

        onAuth(auth, privateKey, form.email, false);
      }
    } catch (e: unknown) {
      console.error("Auth submit error:", e);
      const msg = e instanceof Error ? e.message : String(e);
      setErr(
        tab === "register"
          ? "Registration failed - email may already exist"
          : `Login failed: ${msg}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") submit();
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 420,
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
          border: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          boxShadow: "0 12px 40px -10px rgba(0,0,0,0.35)",
        }}
      >
        {/* ── Brand Header ── */}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 3 }}>
          {/* <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2.5,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: 2,
              mb: 1.5,
            }}
          >
            <ForumIcon sx={{ fontSize: 26 }} />
          </Box> */}
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.5 }}>
            PingMe
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, textAlign: "center", fontSize: "13px" }}
          >
            Secure messaging with SignalR & E2E encryption
          </Typography>
        </Box>

        {/* ── Switch Tabs (Segmented Control) ── */}
        <ToggleButtonGroup
          value={tab}
          exclusive
          onChange={(_, val) => {
            if (val) {
              setTab(val);
              setErr("");
            }
          }}
          fullWidth
          size="small"
          sx={{
            mb: 2.5,
            p: 0.5,
            bgcolor: "action.selected",
            borderRadius: 2,
            "& .MuiToggleButton-root": {
              border: "none",
              borderRadius: 1.5,
              py: 0.75,
              fontWeight: 600,
              fontSize: "13px",
              color: "text.secondary",
              "&.Mui-selected": {
                bgcolor: "background.paper",
                color: "text.primary",
                boxShadow: 1,
              },
            },
          }}
        >
          <ToggleButton value="login">Sign In</ToggleButton>
          <ToggleButton value="register">Create Account</ToggleButton>
        </ToggleButtonGroup>

        {/* ── Email & Password Form ── */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {tab === "register" && (
            <TextFieldAny
              label="Username"
              placeholder="e.g. alex"
              value={form.username}
              onChange={(e: any) => setForm((f) => ({ ...f, username: e.target.value }))}
              fullWidth
              size="small"
              autoFocus={tab === "register"}
              onKeyDown={onKey}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlinedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  </InputAdornment>
                ),
              }}
            />
          )}

          <TextFieldAny
            label="Email address"
            placeholder="you@example.com"
            type="email"
            value={form.email}
            onChange={(e: any) => setForm((f) => ({ ...f, email: e.target.value }))}
            fullWidth
            size="small"
            autoFocus={tab === "login"}
            onKeyDown={onKey}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlinedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
          />

          <TextFieldAny
            label="Password"
            placeholder="Enter your password"
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={(e: any) => setForm((f) => ({ ...f, password: e.target.value }))}
            fullWidth
            size="small"
            onKeyDown={onKey}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    sx={{ color: "text.secondary" }}
                  >
                    {showPassword ? (
                      <VisibilityOffIcon sx={{ fontSize: 18 }} />
                    ) : (
                      <VisibilityIcon sx={{ fontSize: 18 }} />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={submit}
            disabled={loading}
            sx={{
              py: 1.25,
              fontWeight: 700,
              fontSize: "14px",
              borderRadius: 2,
              mt: 0.5,
            }}
          >
            {loading ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={18} color="inherit" />
                <span>Please wait…</span>
              </Box>
            ) : tab === "login" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </Button>
        </Box>

        {err && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
            {err}
          </Alert>
        )}

        {/* ── Divider Below Form ── */}
        <Divider sx={{ my: 2.5 }}>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              textTransform: "uppercase",
              letterSpacing: 1,
              fontWeight: 700,
              fontSize: "10px",
            }}
          >
            or continue with
          </Typography>
        </Divider>

        {/* ── Google Sign-In Button (Positioned Below) ── */}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 1 }}>
          <div
            ref={googleBtnRef}
            style={{ width: "100%", display: "flex", justifyContent: "center", minHeight: 40 }}
          />
          {!googleReady && (
            <Typography variant="caption" color="text.secondary" sx={{ py: 0.5, fontSize: "11px" }}>
              Loading Google Sign-In…
            </Typography>
          )}
        </Box>

        {/* ── Security Badge ── */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.75,
            mt: 2.5,
            pt: 2,
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <LockOutlinedIcon sx={{ fontSize: 14, color: "success.main" }} />
          <Typography
            variant="caption"
            sx={{ fontSize: "11px", color: "text.secondary", fontWeight: "medium" }}
          >
            End-to-End Secure Workspace
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}