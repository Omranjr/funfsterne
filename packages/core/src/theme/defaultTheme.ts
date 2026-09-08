import type { AppTheme, BrandTheme, RuntimeTheme } from "./types";

/**
 * A complete, brand-neutral fallback theme.
 *
 * Every value here is a grey or a semantic colour — nothing in this file
 * identifies any customer. A brand overrides what it needs; anything it
 * leaves out falls back to these, which is what makes `createThemes` safe
 * to call with a partial palette during onboarding.
 */
export const defaultDarkTheme: AppTheme = {
  mode: "dark",

  primary: "#8A8A8A",
  primaryDark: "#6E6E6E",
  primaryLight: "#A6A6A6",
  secondary: "#5E5E5E",
  accent: "#8A8A8A",

  background: "#101010",
  surface: "#1A1A1A",
  surfaceElevated: "#262626",

  textPrimary: "#F2F2F2",
  textSecondary: "#B8B8B8",
  textMuted: "#9A9A9A",
  textOnPrimary: "#101010",

  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",

  border: "rgba(255,255,255,0.08)",
  borderLight: "rgba(255,255,255,0.04)",

  statusBarStyle: "light-content",

  fontFamily: {
    regular: "System",
    medium: "System",
    bold: "System",
  },

  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { sm: 4, md: 8, lg: 16, full: 9999 },
};

export const defaultLightTheme: AppTheme = {
  ...defaultDarkTheme,
  mode: "light",

  primary: "#5A5A5A",
  primaryDark: "#3D3D3D",
  primaryLight: "#8A8A8A",
  secondary: "#7A7A7A",
  accent: "#5A5A5A",

  background: "#F7F7F7",
  surface: "#FFFFFF",
  surfaceElevated: "#EDEDED",

  textPrimary: "#1A1A1A",
  textSecondary: "#5C5C5C",
  textMuted: "#6E6E6E",
  textOnPrimary: "#FFFFFF",

  success: "#16A34A",
  error: "#DC2626",

  border: "rgba(0,0,0,0.08)",
  borderLight: "rgba(0,0,0,0.04)",

  statusBarStyle: "dark-content",
};

/** The default brand: neutral greys in both modes. */
export const defaultTheme: BrandTheme = {
  dark: defaultDarkTheme,
  light: defaultLightTheme,
};

/**
 * Tokens that are the same in every theme and, mostly, in every brand.
 *
 * Each one sits on something that does not change with the theme — a
 * photographic overlay, a modal veil — or carries a fixed semantic meaning
 * (danger), or has a functional requirement (a QR code must be true black
 * on true white to stay scannable). They are still overridable via
 * `AppTheme.tokens`; they are simply never *derived*.
 */
export const NEUTRAL_TOKENS: Pick<
  RuntimeTheme,
  | "onStatus"
  | "backdrop"
  | "onImage"
  | "splashGround"
  | "photoScrimMid"
  | "photoScrimDeep"
  | "qrForeground"
  | "qrBackground"
  | "shadow"
  | "razorSteelLight"
  | "razorSteelDark"
> = {
  onStatus: "#FFFFFF",
  // Modal backdrop. Stays a neutral dark veil in both themes so the sheet
  // above it reads as lifted rather than tinted.
  backdrop: "rgba(0,0,0,0.5)",
  // Type and iconography sitting on a photographic overlay — the overlay is
  // dark in both themes, so this stays light in both.
  onImage: "#F5F1E8",
  // The splash sits on full-bleed photography end to end.
  splashGround: "#050403",
  photoScrimMid: "rgba(0,0,0,0.72)",
  photoScrimDeep: "rgba(0,0,0,0.94)",
  qrForeground: "#000000",
  qrBackground: "#FFFFFF",
  // Shadows are cast light, not surface colour — they stay neutral black in
  // both themes and are tuned by opacity at the call site instead.
  shadow: "#000000",
  // Cool steel for the depicted blade guard, which is what makes the coupon
  // razor read as a razor rather than a coloured toggle.
  razorSteelLight: "#D8D8D0",
  razorSteelDark: "#8C8C86",
};
