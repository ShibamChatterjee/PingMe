import { useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  Paper,
} from "@mui/material";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import DrawOutlinedIcon from "@mui/icons-material/DrawOutlined";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";

import type { Group, MemberResponseDto, OrganizationResponseDto } from "../lib/api";
import type { ThemeKey } from "../theme";

interface Props {
  org: OrganizationResponseDto;
  members?: MemberResponseDto[];
  groups: Group[];
  username?: string;
  themeKey?: ThemeKey;
  onlineCount?: number;
  onlineUsers?: Set<string>;
  currentUserId?: string;
  onOpenGeneralChat: () => void;
  onOpenMembersSection?: () => void;
  onOpenFilesSection?: () => void;
  onOpenActivitySection?: () => void;
  onStartDm?: (userId: string) => void;
}

export function OverviewView({
  org,
  groups,
  username = "User",
  themeKey = "terracotta",
  onOpenGeneralChat,
  onOpenFilesSection,
}: Props) {
  const generalGroup = groups.find((g) => g.name.toLowerCase() === "general") || groups[0];

  // Theme-coordinated color schemes for showcase cards
  const themePalette = useMemo(() => {
    switch (themeKey) {
      case "forest":
        return {
          accent: "#536B50",
          gradient: "linear-gradient(135deg, rgba(83, 107, 80, 0.12) 0%, rgba(62, 84, 60, 0.04) 100%)",
          cardBg: "rgba(83, 107, 80, 0.06)",
          border: "rgba(83, 107, 80, 0.2)",
        };
      case "espresso":
        return {
          accent: "#A06B43",
          gradient: "linear-gradient(135deg, rgba(160, 107, 67, 0.15) 0%, rgba(76, 50, 31, 0.05) 100%)",
          cardBg: "rgba(160, 107, 67, 0.08)",
          border: "rgba(160, 107, 67, 0.25)",
        };
      case "cobalt":
        return {
          accent: "#2563eb",
          gradient: "linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(30, 58, 138, 0.05) 100%)",
          cardBg: "rgba(37, 99, 235, 0.08)",
          border: "rgba(37, 99, 235, 0.25)",
        };
      case "ink":
        return {
          accent: "#94a3b8",
          gradient: "linear-gradient(135deg, rgba(148, 163, 184, 0.12) 0%, rgba(30, 41, 59, 0.05) 100%)",
          cardBg: "rgba(148, 163, 184, 0.06)",
          border: "rgba(148, 163, 184, 0.2)",
        };
      case "plum":
        return {
          accent: "#9333ea",
          gradient: "linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(88, 28, 135, 0.05) 100%)",
          cardBg: "rgba(147, 51, 234, 0.08)",
          border: "rgba(147, 51, 234, 0.25)",
        };
      case "terracotta":
      default:
        return {
          accent: "#C65D3A",
          gradient: "linear-gradient(135deg, rgba(198, 93, 58, 0.12) 0%, rgba(169, 74, 44, 0.04) 100%)",
          cardBg: "rgba(198, 93, 58, 0.06)",
          border: "rgba(198, 93, 58, 0.2)",
        };
    }
  }, [themeKey]);

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
      <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 4 }}>
        {/* UPPER SECTION: Prominent Organization Identity & Header */}
        <Box sx={{ pb: 3, borderBottom: "1px solid", borderColor: "divider" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 3 }}>
            <Box sx={{ display: "flex", gap: 2.5, alignItems: "flex-start", maxWidth: 640 }}>
              {/* Org Logo / Avatar */}
              <Box
                sx={{
                  width: { xs: 52, sm: 84 },
                  height: { xs: 52, sm: 84 },
                  borderRadius: "16px",
                  bgcolor: themePalette.cardBg,
                  border: `1.5px solid ${themePalette.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  flexShrink: 0,
                  boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
                }}
              >
                {org.logoUrl ? (
                  <img
                    src={org.logoUrl}
                    alt={org.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      (e.target as any).style.display = "none";
                    }}
                  />
                ) : (
                  <Typography variant="h5" sx={{ fontWeight: 900, color: "primary.main" }}>
                    {org.name ? org.name.substring(0, 2).toUpperCase() : "PM"}
                  </Typography>
                )}
              </Box>

              {/* Title & Metadata */}
              <Box sx={{ minWidth: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5, flexWrap: "wrap" }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "11px" }}>
                    Welcome, {username} · Workspace /{org.slug || org.name.toLowerCase()}
                  </Typography>
                </Box>

                <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: "-0.025em", color: "text.primary", fontSize: { xs: "1.8rem", md: "2.3rem" }, lineHeight: 1.15 }}>
                  {org.name}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.6, fontSize: "14px" }}>
                  {org.description || "Private secure workspace for team channels, collaborative documents, and project hubs."}
                </Typography>
              </Box>
            </Box>

            {/* Quick Action Button */}
            <Button
              variant="contained"
              color="primary"
              startIcon={<ChatBubbleOutlineOutlinedIcon sx={{ fontSize: 18 }} />}
              endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
              onClick={onOpenGeneralChat}
              sx={{
                fontWeight: 700,
                textTransform: "none",
                px: 3,
                py: 1.1,
                borderRadius: "10px",
                fontSize: "13.5px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
              }}
            >
              Open #{generalGroup ? generalGroup.name : "general"}
            </Button>
          </Box>
        </Box>

        {/* HERO SHOWCASE BANNER: Guy with Laptop / Workspace Visual Illustration */}
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: "18px",
            background: themePalette.gradient,
            borderColor: themePalette.border,
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: "center",
            justifyContent: "space-between",
            gap: 4,
            overflow: "hidden",
            boxShadow: "0 6px 20px -4px rgba(0,0,0,0.04)",
          }}
        >
          {/* Left Text & Call-To-Action */}
          <Box sx={{ maxWidth: 520, display: "flex", flexDirection: "column", gap: 1.75 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Chip
                label="Enterprise Team Collaboration"
                size="small"
                sx={{
                  fontWeight: 800,
                  fontSize: "11px",
                  bgcolor: themePalette.cardBg,
                  color: themePalette.accent,
                  border: `1px solid ${themePalette.border}`,
                }}
              />
            </Box>

            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.015em", color: "text.primary" }}>
              Productive Work & Seamless Team Communication
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontSize: "13.5px" }}>
              Collaborate in real-time with channel threads, sketch architectural diagrams using live Excalidraw whiteboards, and securely share workspace documents.
            </Typography>

            <Box sx={{ display: "flex", gap: 1.5, pt: 1, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                color="primary"
                onClick={onOpenGeneralChat}
                startIcon={<ChatBubbleOutlineOutlinedIcon sx={{ fontSize: 16 }} />}
                sx={{ fontWeight: 700, textTransform: "none", borderRadius: "8px", px: 2.5 }}
              >
                Start Chatting
              </Button>

              {onOpenFilesSection && (
                <Button
                  variant="outlined"
                  onClick={onOpenFilesSection}
                  startIcon={<InsertDriveFileOutlinedIcon sx={{ fontSize: 16 }} />}
                  sx={{ fontWeight: 700, textTransform: "none", borderRadius: "8px" }}
                >
                  Explore Files
                </Button>
              )}
            </Box>
          </Box>

          {/* Right Hero Illustration */}
          <Box
            sx={{
              width: { xs: "100%", md: 360 },
              height: { xs: 200, md: 220 },
              borderRadius: "14px",
              overflow: "hidden",
              border: `1px solid ${themePalette.border}`,
              flexShrink: 0,
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          >
            <img
              src="/illustrations/guy_with_laptop.jpg"
              alt="Team Collaboration"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => {
                // Fallback to workspace hero
                (e.target as HTMLImageElement).src = "/illustrations/workspace_hero.jpg";
              }}
            />
          </Box>
        </Paper>

        {/* 2-COLUMN DUAL SHOWCASE CARDS WITH GRAPHICS */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
          {/* Card 1: Workspace & Real-Time Analytics */}
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              borderRadius: "16px",
              bgcolor: "background.paper",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 8px 24px -4px rgba(0,0,0,0.06)",
              },
            }}
          >
            <Box
              sx={{
                width: "100%",
                height: 160,
                borderRadius: "12px",
                overflow: "hidden",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <img
                src="/illustrations/workspace_hero.jpg"
                alt="Workspace Collaboration"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ForumOutlinedIcon sx={{ color: themePalette.accent, fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "15px" }}>
                Real-Time Messaging & Direct DMs
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "13px", lineHeight: 1.55 }}>
              Instant SignalR channels with real-time typing alerts, presence status, and end-to-end encrypted direct conversations.
            </Typography>
          </Paper>

          {/* Card 2: Excalidraw Whiteboard & Architectural Diagrams */}
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              borderRadius: "16px",
              bgcolor: "background.paper",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 8px 24px -4px rgba(0,0,0,0.06)",
              },
            }}
          >
            <Box
              sx={{
                width: "100%",
                height: 160,
                borderRadius: "12px",
                background: themePalette.gradient,
                border: `1px solid ${themePalette.border}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1.5,
                p: 2,
              }}
            >
              <DrawOutlinedIcon sx={{ fontSize: 44, color: themePalette.accent }} />
              <Typography variant="caption" sx={{ fontWeight: 800, color: themePalette.accent, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Excalidraw Canvas & Diagrams
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ShieldOutlinedIcon sx={{ color: themePalette.accent, fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "15px" }}>
                Diagrams & Secure Storage
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "13px", lineHeight: 1.55 }}>
              Sketch collaborative systems architecture, export high-res PNG/SVG drawings, and store project assets with enterprise-grade security.
            </Typography>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
