/**
 * Values that are deliberately identical in both themes.
 *
 * These are not "we forgot to theme them" — each one sits on something that
 * doesn't change with the theme (photography, a QR scanner's contrast
 * requirement) or carries a fixed semantic meaning (danger).
 */
export const SHARED_TOKENS = {
  // Error/destructive. Fixed so "danger" never reads as decorative.
  danger: "#EF4444",
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
  // A QR code must be true black on true white to stay scannable; this is a
  // functional contrast requirement, not a design colour.
  qrForeground: "#000000",
  qrBackground: "#FFFFFF",
  // Drop-shadow colour. Shadows are cast light, not surface colour — they
  // stay neutral black in both themes and are tuned by opacity at the
  // call site instead.
  shadow: "#000000",
  // The coupon razor is a depicted metal object, not a UI surface, so its
  // materials read identically in both themes — the same way the hero
  // photograph does. Gold for the handle, cool steel for the blade guard,
  // which is what makes it read as a razor rather than a gold toggle.
  razorGoldLight: "#E3C77A",
  razorGoldDark: "#9C7A2C",
  razorSteelLight: "#D8D8D0",
  razorSteelDark: "#8C8C86",
} as const;

export const darkTheme = {
  mode: "dark" as const,
  background: "#0D0D0C",
  surface: "#1A1917",
  muted: "#2A2927",
  text: "#F5F0E6",
  textMuted: "#A8A29A",
  gold: "#C9A84C",
  goldLight: "#D4B660",
  // Small gold type. Identical to `gold` here — on the dark ground that
  // already measures 8.6:1. See lightTheme for why the two diverge.
  goldText: "#C9A84C",
  // Label colour on a solid gold fill. Gold is light here, so the label
  // must be the dark ground (8.6:1); the cream text token measured 2.0:1.
  onGold: "#0E0B08",
  border: "rgba(255,255,255,0.08)",

  // ── 3a direction tokens ──────────────────────────────────────────────
  ground: "#0E0B08", // page background — replaces flat #0D0D0C on themed screens
  groundDeep: "#0B0906", // tab bar, sheets below the fold
  // Wash alphas are the reference's exact values. Round 2 raised them,
  // which flattened the ground into one uniform brown instead of two
  // readable pools of light — the depth comes from the radial falloff, not
  // from more pigment. (The grain below is the one deliberate deviation.)
  groundWarmA: "rgba(120,80,40,0.16)", // top-left radial wash
  groundWarmB: "rgba(90,60,30,0.12)", // right-mid radial wash
  /**
   * Diagonal texture stroke.
   *
   * The reference uses 0.012, which is right for a browser compositing on
   * a desktop panel. Over a #0E0B08 ground that is ~3/255 — on a phone
   * OLED it quantises away and the ground reads as flat brown. 0.022 is
   * the alpha at which the hatch reads on device the way the reference
   * reads on screen; the geometry (2dp stripe, 5dp pitch, 52°) is the
   * reference's exactly.
   */
  grain: "rgba(255,255,255,0.022)",
  hairline: "rgba(201,162,74,0.18)", // gold hairline on cards
  hairlineStrong: "rgba(201,162,74,0.28)",
  placeholderA: "#1A150D", // product-image placeholder stripe A
  placeholderB: "#20190F", // stripe B
  scrim: "rgba(14,11,8,0.55)", // glass chip fill
  overlayTop: "rgba(6,4,2,0.90)", // bottom of image overlays
  // Product/card fill in dark mode. A barely-there tint of the text colour
  // rather than a lighter grey, so no product surface is ever pure white.
  cardTint: "rgba(245,240,230,0.018)",
  success: "#22C55E",
  dangerSurface: "#EF4444",
  ...SHARED_TOKENS,
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

  // ── 3a direction tokens ──────────────────────────────────────────────
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
  ...SHARED_TOKENS,
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

/**
 * Top padding for a screen whose first element is a page title.
 *
 * Only the Home hero is full-bleed under the status bar; every other screen
 * has to start below it. The reference gives those screens a 54dp block of
 * clear space before the title, which comfortably clears a standard status
 * bar — but a device with a taller notch needs more than a fixed 54, so the
 * real inset wins when it is larger and a fixed gap is added on top.
 *
 * `Math.max` with 44 (rather than using the inset alone) keeps the rhythm
 * intact on Android, where `insets.top` can report as little as 24dp.
 */
export function screenTopPadding(insetTop: number): number {
  return Math.max(insetTop, 44) + 10;
}

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  card: 6,
  sheet: 30,
  pill: 999,
} as const;

/**
 * Three-role type system. Every screen reads from here instead of pairing
 * fontSize/fontFamily inline, so the scale stays consistent as screens grow.
 *
 *   display — Playfair Display: titles, headings, product names on hero
 *             cards, prices, big numerals.
 *   body    — Manrope: anything read as a sentence.
 *   micro   — IBM Plex Mono: eyebrows, counts, status. ALWAYS uppercase;
 *             the letterSpacing values below are already the dp equivalent
 *             of the 0.14–0.32em range the design calls for.
 *
 * Colors are deliberately NOT included — callers pair these with a
 * `useTheme()` color so the same scale works in both themes.
 */
export const typography = {
  displayXl: {
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 46,
    lineHeight: 46,
    letterSpacing: -0.55,
  },
  displayXlItalic: {
    fontFamily: "PlayfairDisplay_400Regular_Italic",
    fontSize: 46,
    lineHeight: 46,
    letterSpacing: -0.55,
  },
  displayLg: {
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 24,
    lineHeight: 28,
  },
  displayMd: {
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 20,
    lineHeight: 24,
  },
  price: {
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 20,
    lineHeight: 24,
  },
  priceSm: {
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 17,
    lineHeight: 20,
  },
  bodyLg: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 20,
  },
  bodyMd: {
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  bodySm: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    lineHeight: 15,
  },
  micro: {
    fontFamily: "IBMPlexMono_400Regular",
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 1.6,
  },
  microXs: {
    fontFamily: "IBMPlexMono_400Regular",
    fontSize: 8,
    lineHeight: 11,
    letterSpacing: 2.2,
  },
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
