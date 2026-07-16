export const theme = {
  colors: {
    background: "#0A0A0A",
    surface: "#141414",
    muted: "#2A2A2A",
    primary: "#C9A84C",
    secondary: "#D4B660",
    text: "#FFFFFF",
    textMuted: "#A3A3A3",
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
} as const;

export type Theme = typeof theme;
