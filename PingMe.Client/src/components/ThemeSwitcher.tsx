import { useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Popover,
  Paper,
  ButtonBase,
  Chip,
} from "@mui/material";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import CheckIcon from "@mui/icons-material/Check";
import { THEMES, type ThemeKey } from "../theme";

interface Props {
  currentTheme: ThemeKey;
  onSelectTheme: (themeKey: ThemeKey) => void;
  compact?: boolean;
}

export function ThemeSwitcher({ currentTheme, onSelectTheme, compact = false }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const currentDef = THEMES[currentTheme] || THEMES.terracotta;

  return (
    <>
      {compact ? (
        <IconButton
          onClick={handleClick}
          size="small"
          title="Switch Workspace Theme"
          sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: 1.5,
            p: 0.75,
            bgcolor: "background.paper",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <Box
            sx={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              bgcolor: currentDef.colors.primary,
              border: 1,
              borderColor: "divider",
            }}
          />
        </IconButton>
      ) : (
        <ButtonBase
          onClick={handleClick}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            px: 1.25,
            py: 0.75,
            borderRadius: 1.5,
            border: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            transition: "all 0.15s ease",
            "&:hover": {
              borderColor: "text.secondary",
              bgcolor: "action.hover",
            },
          }}
        >
          <Box
            sx={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              bgcolor: currentDef.colors.primary,
              boxShadow: "0 0 0 1px var(--theme-border)",
            }}
          />
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: "text.primary",
              fontSize: "0.78rem",
            }}
          >
            {currentDef.name}
          </Typography>
          <PaletteOutlinedIcon sx={{ fontSize: 14, color: "text.secondary", ml: 0.25 }} />
        </ButtonBase>
      )}

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        slotProps={{
          paper: {
            sx: {
              p: 2,
              width: 320,
              maxWidth: "95vw",
              mt: 1,
            },
          },
        }}
      >
        <Box sx={{ mb: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
              Workspace Palette
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.72rem" }}>
              Distinctive, architectural color systems
            </Typography>
          </div>
          <Chip
            size="small"
            label={`${Object.keys(THEMES).length} Themes`}
            sx={{ fontSize: "0.68rem", height: 20 }}
          />
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
            const item = THEMES[key];
            const isSelected = key === currentTheme;

            return (
              <Paper
                key={key}
                variant="outlined"
                onClick={() => {
                  onSelectTheme(key);
                  handleClose();
                }}
                sx={{
                  p: 1.25,
                  cursor: "pointer",
                  borderRadius: 1.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderColor: isSelected ? item.colors.primary : "divider",
                  borderWidth: isSelected ? 1.5 : 1,
                  bgcolor: isSelected ? "action.selected" : "background.paper",
                  transition: "all 0.15s ease",
                  "&:hover": {
                    borderColor: item.colors.primary,
                    bgcolor: "action.hover",
                    transform: "translateX(2px)",
                  },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                  {/* Swatch preview */}
                  <Box
                    sx={{
                      display: "flex",
                      borderRadius: 1,
                      overflow: "hidden",
                      border: "1px solid rgba(0,0,0,0.1)",
                      width: 28,
                      height: 28,
                      flexShrink: 0,
                    }}
                  >
                    <Box sx={{ width: "50%", height: "100%", bgcolor: item.colors.background }} />
                    <Box sx={{ width: "50%", height: "100%", bgcolor: item.colors.primary }} />
                  </Box>

                  <div>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isSelected ? 700 : 600,
                        fontSize: "0.82rem",
                        color: "text.primary",
                      }}
                    >
                      {item.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        fontSize: "0.7rem",
                        display: "block",
                      }}
                    >
                      {item.subtitle}
                    </Typography>
                  </div>
                </Box>

                {isSelected && (
                  <CheckIcon sx={{ fontSize: 16, color: item.colors.primary }} />
                )}
              </Paper>
            );
          })}
        </Box>
      </Popover>
    </>
  );
}
