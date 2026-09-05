import { Box, Tooltip } from "@mui/material";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import type { OrgRole } from "../lib/permissions";
import { getCanonicalRole } from "../lib/permissions";

interface RoleBadgeProps {
  role: OrgRole;
  customColor?: string;
  size?: "small" | "medium" | "large";
  showIcon?: boolean;
  isSuspended?: boolean;
}

export function RoleBadge({
  role,
  size = "small",
  showIcon = true,
  isSuspended = false,
}: RoleBadgeProps) {
  const canonical = getCanonicalRole(role);

  const config = {
    Owner: {
      label: "Owner",
      color: "#d97706",
      bg: "rgba(245, 158, 11, 0.14)",
      border: "rgba(245, 158, 11, 0.38)",
      icon: <WorkspacePremiumOutlinedIcon sx={{ fontSize: size === "small" ? 12 : size === "medium" ? 14 : 16 }} />,
      desc: "Workspace Owner with full administrative and policy control",
    },
    Manager: {
      label: "Group Manager",
      color: "#0284c7",
      bg: "rgba(2, 132, 199, 0.12)",
      border: "rgba(2, 132, 199, 0.35)",
      icon: <ManageAccountsOutlinedIcon sx={{ fontSize: size === "small" ? 12 : size === "medium" ? 14 : 16 }} />,
      desc: "Group Manager with channel and member management authority",
    },
    Member: {
      label: "Member",
      color: "var(--theme-text-muted, #64748b)",
      bg: "rgba(100, 116, 139, 0.1)",
      border: "rgba(100, 116, 139, 0.25)",
      icon: <PersonOutlineOutlinedIcon sx={{ fontSize: size === "small" ? 12 : size === "medium" ? 14 : 16 }} />,
      desc: "Standard workspace member",
    },
  }[canonical] || {
    label: "Member",
    color: "#64748b",
    bg: "rgba(100, 116, 139, 0.1)",
    border: "rgba(100, 116, 139, 0.25)",
    icon: <PersonOutlineOutlinedIcon sx={{ fontSize: 12 }} />,
    desc: "Standard workspace member",
  };

  const padX = size === "small" ? "6px" : size === "medium" ? "8px" : "12px";
  const padY = size === "small" ? "1.5px" : size === "medium" ? "3px" : "4px";
  const fontSize = size === "small" ? "10px" : size === "medium" ? "11.5px" : "13px";

  return (
    <Tooltip title={isSuspended ? "Account Suspended" : config.desc} arrow>
      <Box
        component="span"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          px: padX,
          py: padY,
          borderRadius: "6px",
          fontSize,
          fontWeight: 700,
          letterSpacing: "0.03em",
          textTransform: "uppercase",
          bgcolor: isSuspended ? "rgba(239, 68, 68, 0.15)" : config.bg,
          color: isSuspended ? "#ef4444" : config.color,
          border: "1px solid",
          borderColor: isSuspended ? "rgba(239, 68, 68, 0.4)" : config.border,
          userSelect: "none",
          lineHeight: 1.2,
          flexShrink: 0,
        }}
      >
        {showIcon && !isSuspended && config.icon}
        {isSuspended ? "SUSPENDED" : config.label}
      </Box>
    </Tooltip>
  );
}
