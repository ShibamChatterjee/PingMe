import {
  Box,
  Typography,
  Paper,
  Button,
  ButtonBase,
} from "@mui/material";
import AddBusinessOutlinedIcon from "@mui/icons-material/AddBusinessOutlined";
import GroupAddOutlinedIcon from "@mui/icons-material/GroupAddOutlined";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { ThemeSwitcher } from "./ThemeSwitcher";
import type { ThemeKey } from "../theme";

interface Props {
  username: string;
  themeKey: ThemeKey;
  onSelectTheme: (key: ThemeKey) => void;
  onCreateOrg: () => void;
  onJoinOrg: () => void;
  onLogout: () => void;
}

export function OrgLandingPage({
  username,
  themeKey,
  onSelectTheme,
  onCreateOrg,
  onJoinOrg,
  onLogout,
}: Props) {
  return (
    <Box
      sx={{
        flexGrow: 1,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
        overflowY: "auto",
      }}
    >
      {/* Top Header Bar with Branding, Theme Switcher & Sign Out */}
      <Box
        component="header"
        sx={{
          height: 64,
          px: { xs: 2.5, md: 5 },
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.25,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "0.95rem",
              letterSpacing: "-0.02em",
            }}
          >
            P
          </Box>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, letterSpacing: "-0.01em", color: "text.primary" }}
          >
            PingMe Workspaces
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <ThemeSwitcher currentTheme={themeKey} onSelectTheme={onSelectTheme} />

          <Button
            variant="outlined"
            size="small"
            color="inherit"
            startIcon={<ExitToAppIcon sx={{ fontSize: 16 }} />}
            onClick={onLogout}
            sx={{
              borderColor: "divider",
              color: "text.secondary",
              "&:hover": { borderColor: "text.primary", color: "text.primary" },
            }}
          >
            Sign Out
          </Button>
        </Box>
      </Box>

      {/* Main Content Hero */}
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          p: { xs: 3, md: 6 },
          textAlign: "center",
          maxWidth: 820,
          mx: "auto",
          width: "100%",
        }}
      >

        <Typography
          variant="h3"
          sx={{
            fontWeight: 800,
            letterSpacing: "-0.025em",
            color: "text.primary",
            fontSize: { xs: "1.8rem", md: "2.5rem" },
            mb: 1.5,
          }}
        >
          Welcome, {username}
        </Typography>

        <Typography
          variant="body1"
          color="text.secondary"
          sx={{
            maxWidth: 520,
            lineHeight: 1.65,
            fontSize: { xs: "0.9rem", md: "1rem" },
            mb: 5,
          }}
        >
          PingMe workspaces provide a private, end-to-end encrypted environment for your team. Create a new organization or join with an invite code to begin.
        </Typography>

        {/* 2 Clean Architectural Action Cards */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
            gap: 3,
            width: "100%",
            textAlign: "left",
          }}
        >
          {/* Create Workspace Card */}
          <Paper
            variant="outlined"
            component={ButtonBase}
            onClick={onCreateOrg}
            sx={{
              p: 3.5,
              borderRadius: 2.5,
              bgcolor: "background.paper",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 3,
              textAlign: "left",
              transition: "all 0.2s ease",
              cursor: "pointer",
              "&:hover": {
                borderColor: "primary.main",
                transform: "translateY(-3px)",
                boxShadow: "0 8px 24px -6px rgba(0,0,0,0.06)",
              },
            }}
          >
            <Box sx={{ width: "100%" }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 1.75,
                  bgcolor: "action.hover",
                  color: "primary.main",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 2.5,
                  border: 1,
                  borderColor: "divider",
                }}
              >
                <AddBusinessOutlinedIcon sx={{ fontSize: 22 }} />
              </Box>

              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.1rem", color: "text.primary" }}>
                Create a Workspace
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.6 }}>
                Set up a fresh organization for your company or project, invite team members, and manage channels.
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                color: "primary.main",
                fontWeight: 700,
                fontSize: "0.85rem",
              }}
            >
              <span>Get Started</span>
              <ArrowForwardIcon sx={{ fontSize: 16 }} />
            </Box>
          </Paper>

          {/* Join Workspace Card */}
          <Paper
            variant="outlined"
            component={ButtonBase}
            onClick={onJoinOrg}
            sx={{
              p: 3.5,
              borderRadius: 2.5,
              bgcolor: "background.paper",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 3,
              textAlign: "left",
              transition: "all 0.2s ease",
              cursor: "pointer",
              "&:hover": {
                borderColor: "primary.main",
                transform: "translateY(-3px)",
                boxShadow: "0 8px 24px -6px rgba(0,0,0,0.06)",
              },
            }}
          >
            <Box sx={{ width: "100%" }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 1.75,
                  bgcolor: "action.hover",
                  color: "primary.main",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 2.5,
                  border: 1,
                  borderColor: "divider",
                }}
              >
                <GroupAddOutlinedIcon sx={{ fontSize: 22 }} />
              </Box>

              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.1rem", color: "text.primary" }}>
                Join a Workspace
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.6 }}>
                Enter an 8-character invite code provided by your organization admin to access shared workspace chats.
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                color: "primary.main",
                fontWeight: 700,
                fontSize: "0.85rem",
              }}
            >
              <span>Enter Code</span>
              <ArrowForwardIcon sx={{ fontSize: 16 }} />
            </Box>
          </Paper>
        </Box>

        {/* Security Footer Note */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 6, fontSize: "0.75rem", opacity: 0.8 }}
        >
          All workspace communications are secured with enterprise-grade encryption.
        </Typography>
      </Box>
    </Box>
  );
}
