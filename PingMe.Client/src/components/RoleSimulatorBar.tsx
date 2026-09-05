import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import LockPersonOutlinedIcon from "@mui/icons-material/LockPersonOutlined";
import MarkEmailReadOutlinedIcon from "@mui/icons-material/MarkEmailReadOutlined";
import { RoleBadge } from "./RoleBadge";

export interface Persona {
  userId: string;
  username: string;
  email: string;
  role: string;
  description: string;
  avatarSeed: string;
}

export const PRESET_PERSONAS: Persona[] = [
  {
    userId: "user-alex",
    username: "Alex Morgan",
    email: "alex@acme.corp",
    role: "Owner",
    description: "Workspace Owner • Full permissions, transfers, deletion, billing & policies",
    avatarSeed: "Alex Morgan",
  },
  {
    userId: "user-sarah",
    username: "Sarah Wilson",
    email: "sarah.w@acme.corp",
    role: "Admin",
    description: "Organization Admin • Member management, invites, all groups & settings",
    avatarSeed: "Sarah Wilson",
  },
  {
    userId: "user-john",
    username: "John Carter",
    email: "john.c@acme.corp",
    role: "Manager",
    description: "Group Admin • Manages #engineering & #core-infra (no org-wide admin rights)",
    avatarSeed: "John Carter",
  },
  {
    userId: "user-emma",
    username: "Emma Davis",
    email: "emma.d@acme.corp",
    role: "Member",
    description: "Standard Member • Sends messages, calls, media, sees public groups",
    avatarSeed: "Emma Davis",
  },
  {
    userId: "user-michael",
    username: "Michael Lee",
    email: "michael.contractor@partner.com",
    role: "Guest",
    description: "Restricted Guest • Assigned ONLY to #marketing. Hidden from other channels & directory",
    avatarSeed: "Michael Lee",
  },
];

interface Props {
  currentUserId: string;
  onSelectPersona: (persona: Persona) => void;
  onOpenInviteTester: () => void;
  activeOrgName: string;
}

export function RoleSimulatorBar({
  currentUserId,
  onSelectPersona,
  onOpenInviteTester,
  activeOrgName,
}: Props) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const activePersona =
    PRESET_PERSONAS.find((p) => p.userId === currentUserId) || PRESET_PERSONAS[0];

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "Owner":
        return <WorkspacePremiumOutlinedIcon sx={{ fontSize: 16, color: "#d97706" }} />;
      case "Admin":
        return <ShieldOutlinedIcon sx={{ fontSize: 16, color: "#6366f1" }} />;
      case "Manager":
        return <ManageAccountsOutlinedIcon sx={{ fontSize: 16, color: "#06b6d4" }} />;
      case "Member":
        return <PersonOutlineOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />;
      case "Guest":
        return <LockPersonOutlinedIcon sx={{ fontSize: 16, color: "#ea580c" }} />;
      default:
        return <PersonOutlineOutlinedIcon sx={{ fontSize: 16 }} />;
    }
  };

  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
        px: { xs: 1.5, sm: 2.5 },
        py: 0.75,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        flexWrap: "wrap",
        zIndex: 11,
      }}
    >
      {/* Left: Active Persona Display */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1.25,
            py: 0.4,
            borderRadius: "6px",
            bgcolor: "action.hover",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              textTransform: "uppercase",
              fontSize: "10px",
              color: "text.secondary",
              letterSpacing: "0.05em",
            }}
          >
            Testing View:
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 0.75 }}
          >
            {activePersona.username}
          </Typography>
          <RoleBadge role={activePersona.role} size="small" />
        </Box>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: { xs: "none", md: "inline" }, fontStyle: "italic" }}
        >
          {activePersona.description}
        </Typography>
      </Box>

      {/* Right: Switcher Trigger & Invite Simulator */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Tooltip title="Preview how an invited teammate experiences the onboarding invitation flow">
          <Button
            size="small"
            variant="outlined"
            startIcon={<MarkEmailReadOutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={onOpenInviteTester}
            sx={{
              fontSize: "11px",
              fontWeight: 600,
              textTransform: "none",
              py: 0.4,
              px: 1.25,
              borderColor: "divider",
            }}
          >
            Preview Invite Acceptance
          </Button>
        </Tooltip>

        <Button
          size="small"
          variant="contained"
          color="primary"
          startIcon={<SwapHorizIcon sx={{ fontSize: 16 }} />}
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            fontSize: "11px",
            fontWeight: 700,
            textTransform: "none",
            py: 0.4,
            px: 1.5,
            boxShadow: "none",
          }}
        >
          Switch Role Persona
        </Button>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{
            paper: {
              sx: {
                width: 320,
                p: 1,
                borderRadius: "10px",
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2)",
              },
            },
          }}
        >
          <Box sx={{ px: 1.5, py: 1, borderBottom: "1px solid", borderColor: "divider", mb: 0.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Select Active Persona
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Instantly test permissions in {activeOrgName}
            </Typography>
          </Box>

          {PRESET_PERSONAS.map((persona) => {
            const isSelected = persona.userId === currentUserId;
            return (
              <MenuItem
                key={persona.userId}
                selected={isSelected}
                onClick={() => {
                  onSelectPersona(persona);
                  setAnchorEl(null);
                }}
                sx={{
                  borderRadius: "6px",
                  my: 0.25,
                  py: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 0.25,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {getRoleIcon(persona.role)}
                    <Typography variant="body2" sx={{ fontWeight: isSelected ? 700 : 600 }}>
                      {persona.username}
                    </Typography>
                  </Box>
                  <RoleBadge role={persona.role} size="small" />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ pl: 3, fontSize: "11px" }}>
                  {persona.description}
                </Typography>
              </MenuItem>
            );
          })}
        </Menu>
      </Box>
    </Box>
  );
}
