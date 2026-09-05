import {
  Box,
  Tooltip,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import type { OrganizationResponseDto } from "../lib/api";

interface Props {
  orgs: OrganizationResponseDto[];
  activeOrg: OrganizationResponseDto | null;
  username?: string;
  onSwitch: (org: OrganizationResponseDto) => void;
  onAddOrg: () => void;
}

function OrgInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function OrgRail({ orgs, activeOrg, onSwitch, onAddOrg }: Props) {
  return (
    <Box
      component="aside"
      sx={{
        width: 60,
        minWidth: 60,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        py: 1.75,
        gap: 1.5,
        bgcolor: "var(--theme-bg)",
        borderRight: 1,
        borderColor: "divider",
        userSelect: "none",
        zIndex: 11,
      }}
    >
      {/* Brand Icon */}
      <Box
        sx={{
          width: 38,
          height: 38,
          borderRadius: 1.5,
          bgcolor: "primary.main",
          color: "primary.contrastText",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: "1rem",
          letterSpacing: "-0.02em",
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        }}
        title="PingMe Workspace"
      >
        P
      </Box>

      <Box sx={{ width: 24, height: "1px", bgcolor: "divider", my: 0.5 }} />

      {/* Orgs List */}
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1.25,
          overflowY: "auto",
          width: "100%",
        }}
      >
        {orgs.map((org) => {
          const isActive = activeOrg?.id === org.id;

          return (
            <Tooltip key={org.id} title={org.name} placement="right">
              <Box
                onClick={() => onSwitch(org)}
                sx={{
                  position: "relative",
                  width: 40,
                  height: 40,
                  borderRadius: 1.5,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  bgcolor: isActive ? "primary.main" : "background.paper",
                  color: isActive ? "primary.contrastText" : "text.primary",
                  border: 1,
                  borderColor: isActive ? "primary.main" : "divider",
                  transition: "all 0.15s ease",
                  "&:hover": {
                    borderColor: "primary.main",
                    transform: "scale(1.04)",
                  },
                }}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <Box
                    sx={{
                      position: "absolute",
                      left: -10,
                      width: 3,
                      height: 20,
                      borderRadius: 1,
                      bgcolor: "primary.main",
                    }}
                  />
                )}

                {org.logoUrl ? (
                  <Box
                    component="img"
                    src={org.logoUrl}
                    alt={org.name}
                    sx={{ width: "100%", height: "100%", borderRadius: 1.5, objectFit: "cover" }}
                  />
                ) : (
                  <span>{OrgInitials(org.name)}</span>
                )}
              </Box>
            </Tooltip>
          );
        })}

        {/* Add Org */}
        <Tooltip title="Create or Join Workspace" placement="right">
          <IconButton
            onClick={onAddOrg}
            size="small"
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              border: "1px dashed var(--theme-border)",
              color: "text.secondary",
              "&:hover": {
                borderColor: "primary.main",
                color: "primary.main",
                bgcolor: "action.hover",
              },
            }}
          >
            <AddIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
