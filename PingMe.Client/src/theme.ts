import { createTheme, type Theme } from "@mui/material/styles";

export type ThemeKey =
  | "terracotta"
  | "forest"
  | "espresso"
  | "ink"
  | "cobalt"
  | "plum";

export interface ThemeDefinition {
  id: ThemeKey;
  name: string;
  subtitle: string;
  feel: string;
  mode: "light" | "dark";
  colors: {
    background: string;
    surface: string;
    card: string;
    primary: string;
    primaryDark: string;
    text: string;
    muted: string;
    border: string;
    success: string;
  };
}

export const THEMES: Record<ThemeKey, ThemeDefinition> = {
  terracotta: {
    id: "terracotta",
    name: "Editorial Terracotta",
    subtitle: "Warm, architectural & editorial",
    feel: "Sophisticated, editorial, warm, architectural",
    mode: "light",
    colors: {
      background: "#F5F1E8",
      surface: "#EAE4D8",
      card: "#FFFFFF",
      primary: "#C65D3A",
      primaryDark: "#A94A2C",
      text: "#20201D",
      muted: "#77736A",
      border: "#D9D3C7",
      success: "#5B795D",
    },
  },
  forest: {
    id: "forest",
    name: "Forest & Linen",
    subtitle: "Calm, organic & professional",
    feel: "Calm, organic, professional, premium",
    mode: "light",
    colors: {
      background: "#F2F0E8",
      surface: "#E5E2D7",
      card: "#FAF9F4",
      primary: "#536B50",
      primaryDark: "#3E543C",
      text: "#20251F",
      muted: "#777C72",
      border: "#D3D2C7",
      success: "#657F58",
    },
  },
  espresso: {
    id: "espresso",
    name: "Espresso & Champagne",
    subtitle: "Luxurious, cinematic & exclusive",
    feel: "Luxurious, cinematic, exclusive",
    mode: "dark",
    colors: {
      background: "#171311",
      surface: "#211C19",
      card: "#2A2420",
      primary: "#C4A46C",
      primaryDark: "#A48650",
      text: "#F3EBDD",
      muted: "#A69C8D",
      border: "#3A322C",
      success: "#78936B",
    },
  },
  ink: {
    id: "ink",
    name: "Ink & Copper",
    subtitle: "Industrial, sleek & sophisticated",
    feel: "Premium, industrial, sophisticated",
    mode: "dark",
    colors: {
      background: "#121415",
      surface: "#1B1E1F",
      card: "#232627",
      primary: "#C47A52",
      primaryDark: "#A85F3B",
      text: "#F0ECE5",
      muted: "#96938C",
      border: "#303435",
      success: "#71906B",
    },
  },
  cobalt: {
    id: "cobalt",
    name: "Cobalt & Bone",
    subtitle: "Editorial corporate & distinctive",
    feel: "Premium corporate without looking like a generic SaaS product",
    mode: "light",
    colors: {
      background: "#F1EFE9",
      surface: "#E5E2D9",
      card: "#FAF9F5",
      primary: "#294C73",
      primaryDark: "#1E3A59",
      text: "#171B20",
      muted: "#747A82",
      border: "#D4D1C8",
      success: "#59745D",
    },
  },
  plum: {
    id: "plum",
    name: "Plum & Sand",
    subtitle: "Artistic, elegant & distinctive",
    feel: "Artistic, elegant, distinctive",
    mode: "light",
    colors: {
      background: "#F3EEE8",
      surface: "#E6DED7",
      card: "#FBF8F5",
      primary: "#69465F",
      primaryDark: "#52354A",
      text: "#211C20",
      muted: "#81777D",
      border: "#D8CEC7",
      success: "#60735D",
    },
  },
};

export function applyThemeVariables(themeKey: ThemeKey) {
  const t = THEMES[themeKey] || THEMES.terracotta;
  const root = document.documentElement;

  root.style.setProperty("--theme-bg", t.colors.background);
  root.style.setProperty("--theme-surface", t.colors.surface);
  root.style.setProperty("--theme-card", t.colors.card);
  root.style.setProperty("--theme-primary", t.colors.primary);
  root.style.setProperty("--theme-primary-dark", t.colors.primaryDark);
  root.style.setProperty("--theme-text", t.colors.text);
  root.style.setProperty("--theme-muted", t.colors.muted);
  root.style.setProperty("--theme-border", t.colors.border);
  root.style.setProperty("--theme-success", t.colors.success);

  if (t.mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  root.setAttribute("data-theme-key", themeKey);
}

export function getMuiTheme(themeKey: ThemeKey): Theme {
  const t = THEMES[themeKey] || THEMES.terracotta;
  const isDark = t.mode === "dark";

  return createTheme({
    palette: {
      mode: t.mode,
      primary: {
        main: t.colors.primary,
        dark: t.colors.primaryDark,
        contrastText: isDark ? "#171311" : "#FFFFFF",
      },
      secondary: {
        main: t.colors.muted,
      },
      background: {
        default: t.colors.background,
        paper: t.colors.card,
      },
      text: {
        primary: t.colors.text,
        secondary: t.colors.muted,
        disabled: isDark ? "#55524B" : "#A5A096",
      },
      divider: t.colors.border,
      success: {
        main: t.colors.success,
      },
      action: {
        hover: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
        selected: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
      },
    },
    typography: {
      fontFamily: [
        "Inter",
        "-apple-system",
        "BlinkMacSystemFont",
        '"Segoe UI"',
        "Roboto",
        '"Helvetica Neue"',
        "Arial",
        "sans-serif",
      ].join(","),
      h1: { fontWeight: 700, letterSpacing: "-0.02em" },
      h2: { fontWeight: 700, letterSpacing: "-0.02em" },
      h3: { fontWeight: 600, letterSpacing: "-0.015em" },
      h4: { fontWeight: 600, letterSpacing: "-0.01em" },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      subtitle1: { fontWeight: 500, letterSpacing: "-0.01em" },
      subtitle2: { fontWeight: 600, fontSize: "0.85rem" },
      body1: { fontSize: "0.925rem", lineHeight: 1.6 },
      body2: { fontSize: "0.85rem", lineHeight: 1.5 },
      caption: { fontSize: "0.75rem", letterSpacing: "0.01em" },
      button: {
        textTransform: "none",
        fontWeight: 600,
        letterSpacing: "-0.005em",
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            boxShadow: "none",
            borderRadius: 6,
            padding: "6px 14px",
            fontSize: "0.85rem",
            transition: "all 0.15s ease-in-out",
            "&:hover": {
              boxShadow: "none",
            },
          },
          contained: {
            backgroundColor: t.colors.primary,
            color: isDark ? "#171311" : "#FFFFFF",
            "&:hover": {
              backgroundColor: t.colors.primaryDark,
            },
          },
          outlined: {
            borderColor: t.colors.border,
            color: t.colors.text,
            "&:hover": {
              borderColor: t.colors.muted,
              backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundImage: "none",
            borderRadius: 12,
            border: `1px solid ${t.colors.border}`,
            boxShadow: isDark
              ? "0 20px 40px -10px rgba(0,0,0,0.7)"
              : "0 20px 40px -10px rgba(0,0,0,0.12)",
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 8,
            border: `1px solid ${t.colors.border}`,
            boxShadow: isDark
              ? "0 12px 28px -4px rgba(0,0,0,0.6)"
              : "0 12px 28px -4px rgba(0,0,0,0.1)",
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: t.colors.border,
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: t.colors.muted,
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: t.colors.primary,
              borderWidth: "1.5px",
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 500,
            fontSize: "0.75rem",
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: t.colors.border,
          },
        },
      },
    },
  });
}
