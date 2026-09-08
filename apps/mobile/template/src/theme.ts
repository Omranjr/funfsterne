import type { AppTheme, BrandTheme } from "@funfsterne/core";

/**
 * TEMPLATE — customer brand theme.
 *
 * Fill in the palette below. Every other token the app renders (ground
 * washes, hairlines, scrims, placeholder stripes) is derived from these by
 * `createThemes`, so this is the whole job for a normal customer.
 *
 * Only reach for the `tokens` escape hatch if a designer has hand-tuned
 * specific values — see apps/mobile/funfsterne/src/theme.ts for what that
 * looks like.
 */

const fontFamily = {
  // The app loads Playfair Display / Manrope / IBM Plex Mono. Changing the
  // fonts means changing the @expo-google-fonts packages in package.json and
  // useAppFonts() in @funfsterne/core — see docs/WHITE_LABEL.md.
  regular: "Manrope_400Regular",
  medium: "Manrope_500Medium",
  bold: "Manrope_600SemiBold",
};

const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
const radius = { sm: 4, md: 8, lg: 16, full: 9999 };

export const dark: AppTheme = {
  mode: "dark",

  primary: "#C9A84C", // TODO: customer's brand accent
  primaryDark: "#9C7A2C", // TODO: a darker step of the same hue, for small type on light
  primaryLight: "#D4B660", // TODO: a lighter step of the same hue
  secondary: "#D4B660", // TODO
  accent: "#C9A84C", // TODO

  background: "#0E0B08", // TODO: customer's dark page ground
  surface: "#1A1917", // TODO: card fill
  surfaceElevated: "#2A2927", // TODO: the step above a card

  textPrimary: "#F5F0E6", // TODO
  textSecondary: "#A8A29A", // TODO
  textMuted: "#A8A29A", // TODO
  // Must clear 4.5:1 against `primary` — it is the label on a solid accent fill.
  textOnPrimary: "#0E0B08", // TODO

  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",

  border: "rgba(255,255,255,0.08)",
  borderLight: "rgba(255,255,255,0.04)",

  statusBarStyle: "light-content",
  fontFamily,
  spacing,
  radius,
};

export const light: AppTheme = {
  ...dark,
  mode: "light",

  primary: "#A9822F", // TODO: usually a darker step than the dark-mode accent
  primaryDark: "#8F6D25", // TODO: small gold type needs 4.5:1 on the light ground
  primaryLight: "#C9A84C", // TODO
  secondary: "#C9A84C", // TODO
  accent: "#A9822F", // TODO

  background: "#FAF8F4", // TODO
  surface: "#FFFFFF", // TODO
  surfaceElevated: "#EFEBE4", // TODO

  textPrimary: "#1A1917", // TODO
  textSecondary: "#6E685E", // TODO
  textMuted: "#6E685E", // TODO
  textOnPrimary: "#1A1917", // TODO

  success: "#16A34A",
  warning: "#D97706",
  error: "#DC2626",
  info: "#2563EB",

  border: "rgba(0,0,0,0.08)",
  borderLight: "rgba(0,0,0,0.04)",

  statusBarStyle: "dark-content",
};

export const theme: BrandTheme = { dark, light };
