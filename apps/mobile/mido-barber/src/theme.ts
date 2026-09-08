import type { AppTheme, BrandTheme, RuntimeTheme } from "@funfsterne/core";

/**
 * Mido Barber — brand theme.
 *
 * Deliberately the same colour identity as Fünf Sterne: the same gold, the
 * same grounds, the same measured contrast steps. Mido is a second shop on
 * one premium platform, not a different design language, and the WCAG
 * ratios in the comments below are real measurements that took work to
 * land.
 *
 * The token block is COPIED from apps/mobile/funfsterne/src/theme.ts rather
 * than imported from it. That is on purpose: one brand must never be able to
 * change another brand's appearance by editing its own file. Duplication
 * between brand *data* files is the right boundary — the code that consumes
 * them is fully shared.
 *
 * To take Mido in its own direction later, change `primary` / `primaryLight`
 * / `primaryDark` below and delete the `tokens` blocks; everything else is
 * then derived from the palette by `createThemes`.
 */

// ── Values that are deliberately identical in both palettes ──────────────
// Each sits on something that does not change with the theme (photography,
// a QR scanner's contrast requirement) or carries fixed semantics (danger).
const SHARED: Partial<RuntimeTheme> = {
  // Error/destructive as a FILL or ICON. Fixed so "danger" never reads as
  // decorative. (Danger as *text* differs per theme — see below.)
  danger: "#EF4444",
  onStatus: "#FFFFFF",
  // Modal backdrop. A neutral dark veil in both themes so the sheet above
  // it reads as lifted rather than tinted.
  backdrop: "rgba(0,0,0,0.5)",
  // Type and iconography on a photographic overlay — the overlay is dark in
  // both themes, so this stays light in both.
  onImage: "#F5F1E8",
  // The splash sits on full-bleed photography end to end.
  splashGround: "#050403",
  photoScrimMid: "rgba(0,0,0,0.72)",
  photoScrimDeep: "rgba(0,0,0,0.94)",
  // A QR code must be true black on true white to stay scannable; this is a
  // functional contrast requirement, not a design colour.
  qrForeground: "#000000",
  qrBackground: "#FFFFFF",
  // Shadows are cast light, not surface colour — neutral black in both
  // themes, tuned by opacity at the call site instead.
  shadow: "#000000",
  // The coupon razor is a depicted metal object, not a UI surface, so its
  // materials read identically in both themes — the same way the hero
  // photograph does. Gold for the handle, cool steel for the blade guard,
  // which is what makes it read as a razor rather than a gold toggle.
  razorGoldLight: "#E3C77A",
  razorGoldDark: "#9C7A2C",
  razorSteelLight: "#D8D8D0",
  razorSteelDark: "#8C8C86",
};

const fontFamily = {
  regular: "Manrope_400Regular",
  medium: "Manrope_500Medium",
  bold: "Manrope_600SemiBold",
};

const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
const radius = { sm: 4, md: 8, lg: 16, full: 9999 };

export const dark: AppTheme = {
  mode: "dark",

  primary: "#C9A84C",
  primaryDark: "#9C7A2C",
  primaryLight: "#D4B660",
  secondary: "#D4B660",
  accent: "#C9A84C",

  background: "#0E0B08",
  surface: "#1A1917",
  surfaceElevated: "#2A2927",

  textPrimary: "#F5F0E6",
  textSecondary: "#A8A29A",
  textMuted: "#A8A29A",
  textOnPrimary: "#0E0B08",

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

  tokens: {
    ...SHARED,
    // `background` and `ground` are NOT the same value here: `background`
    // predates the themed-ground direction and is still what the auth
    // screens and the loading states paint on.
    background: "#0D0D0C",
    surface: "#1A1917",
    muted: "#2A2927",
    text: "#F5F0E6",
    textMuted: "#A8A29A",

    gold: "#C9A84C",
    goldLight: "#D4B660",
    // Small gold type. Identical to `gold` here — on the dark ground that
    // already measures 8.6:1. See the light palette for why the two diverge.
    goldText: "#C9A84C",
    // Label colour on a solid gold fill. Gold is light here, so the label
    // must be the dark ground (8.6:1); the cream text token measured 2.0:1.
    onGold: "#0E0B08",
    border: "rgba(255,255,255,0.08)",

    ground: "#0E0B08",
    groundDeep: "#0B0906", // tab bar, sheets below the fold
    // Wash alphas are the design reference's exact values. Raising them
    // flattened the ground into one uniform brown instead of two readable
    // pools of light — the depth comes from the radial falloff, not from
    // more pigment.
    groundWarmA: "rgba(120,80,40,0.16)",
    groundWarmB: "rgba(90,60,30,0.12)",
    // Diagonal texture stroke. The reference uses 0.012, which is right for
    // a browser compositing on a desktop panel. Over a #0E0B08 ground that
    // is ~3/255 — on a phone OLED it quantises away and the ground reads as
    // flat brown. 0.022 is the alpha at which the hatch reads on device the
    // way the reference reads on screen.
    grain: "rgba(255,255,255,0.022)",
    hairline: "rgba(201,162,74,0.18)",
    hairlineStrong: "rgba(201,162,74,0.28)",
    placeholderA: "#1A150D",
    placeholderB: "#20190F",
    scrim: "rgba(14,11,8,0.55)",
    overlayTop: "rgba(6,4,2,0.90)",
    // Product/card fill in dark mode. A barely-there tint of the text colour
    // rather than a lighter grey, so no product surface is ever pure white.
    cardTint: "rgba(245,240,230,0.018)",

    success: "#22C55E",
    dangerSurface: "#EF4444",
    // Danger as TYPE. Measured 5.22:1 on the ground, 4.67:1 on a card.
    dangerText: "#EF4444",
  },
};

export const light: AppTheme = {
  mode: "light",

  primary: "#A9822F",
  primaryDark: "#8F6D25",
  primaryLight: "#C9A84C",
  secondary: "#C9A84C",
  accent: "#A9822F",

  background: "#FAF8F4",
  surface: "#FFFFFF",
  surfaceElevated: "#EFEBE4",

  textPrimary: "#1A1917",
  textSecondary: "#6E685E",
  textMuted: "#6E685E",
  textOnPrimary: "#1A1917",

  success: "#16A34A",
  warning: "#D97706",
  error: "#DC2626",
  info: "#2563EB",

  border: "rgba(0,0,0,0.08)",
  borderLight: "rgba(0,0,0,0.04)",

  statusBarStyle: "dark-content",
  fontFamily,
  spacing,
  radius,

  tokens: {
    ...SHARED,
    background: "#FAF8F4",
    surface: "#FFFFFF",
    muted: "#EFEBE4",
    text: "#1A1917",
    textMuted: "#6E685E",

    gold: "#A9822F",
    goldLight: "#C9A84C",
    /**
     * Gold for SMALL type (micro eyebrows, prices) on the cream ground or a
     * white card.
     *
     * `gold` (#A9822F) measures 3.34:1 on the ground and 3.55:1 on white —
     * fine for the 46dp hero wordmark and for fills/rings/dots (large-text
     * and non-text thresholds), but below the 4.5:1 that 8–20dp text needs.
     * This darker step of the same hue measures 4.52:1 and 4.79:1, so small
     * gold copy stays legible without changing the brand gold itself.
     */
    goldText: "#8F6D25",
    // Gold is mid-dark in light mode, so the dark ink label wins here
    // (4.95:1) where the cream ground would only reach 3.34:1.
    onGold: "#1A1917",
    border: "rgba(0,0,0,0.08)",

    ground: "#FAF8F4",
    groundDeep: "#F2EDE4",
    groundWarmA: "rgba(169,130,47,0.15)",
    groundWarmB: "rgba(140,105,45,0.10)",
    grain: "rgba(0,0,0,0.025)",
    hairline: "rgba(169,130,47,0.24)",
    hairlineStrong: "rgba(169,130,47,0.40)",
    placeholderA: "#EFEAE0",
    placeholderB: "#E7E0D3",
    scrim: "rgba(255,255,255,0.72)",
    // Stays dark: it sits on photography in both themes.
    overlayTop: "rgba(20,14,6,0.72)",
    // White is the correct card fill in light mode — the "no white tiles"
    // rule is a dark-mode rule.
    cardTint: "#FFFFFF",

    success: "#16A34A",
    dangerSurface: "#DC2626",
    /**
     * The shared #EF4444 measures only 3.55:1 on this cream ground, so error
     * text was failing AA in light mode wherever it was used. This darker
     * step of the same hue is 4.55:1 on the ground and 4.83:1 on a card.
     */
    dangerText: "#DC2626",
  },
};

export const theme: BrandTheme = { dark, light };
