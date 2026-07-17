export const darkTheme = {
  mode: "dark" as const,
  background: "#0D0D0C",
  surface: "#1A1917",
  muted: "#2A2927",
  text: "#F5F0E6",
  textMuted: "#A8A29A",
  gold: "#C9A84C",
  goldLight: "#D4B660",
  border: "rgba(255,255,255,0.08)",
};

export const lightTheme = {
  mode: "light" as const,
  background: "#FAF8F4",
  surface: "#FFFFFF",
  muted: "#EFEBE4",
  text: "#1A1917",
  textMuted: "#6E685E",
  gold: "#A9822F",
  goldLight: "#C9A84C",
  border: "rgba(0,0,0,0.08)",
};

export type ThemeMode = "light" | "dark" | "system";
export type Theme = typeof darkTheme | typeof lightTheme;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
} as const;

// Legacy static theme kept for components that have not yet been migrated.
// Prefer useTheme() for all new work.
export const theme = {
  colors: {
    background: darkTheme.background,
    surface: darkTheme.surface,
    muted: darkTheme.muted,
    primary: darkTheme.gold,
    secondary: darkTheme.goldLight,
    text: darkTheme.text,
    textMuted: darkTheme.textMuted,
  },
  spacing,
  borderRadius,
} as const;

export type LegacyTheme = typeof theme;
