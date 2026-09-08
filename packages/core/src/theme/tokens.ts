import type { AppTheme } from "./types";
import { NEUTRAL_TOKENS, defaultDarkTheme } from "./defaultTheme";
import { createRuntimeTheme } from "./createThemes";

/**
 * Platform-level layout and type scales.
 *
 * These are the *design system*, not the brand: the 4/8/16/24/32 spacing
 * rhythm and the three-role type hierarchy are the same for every customer.
 * A brand changes the colours, the fonts and the copy — it does not get its
 * own spacing scale, because every screen in `packages/core` is laid out
 * against this one.
 *
 * Brand-specific values live in `apps/mobile/<customer>/src/theme.ts` and
 * reach components through `useTheme()`.
 */

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
  card: 6,
  sheet: 30,
  pill: 999,
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

/**
 * Three-role type system. Every screen reads from here instead of pairing
 * fontSize/fontFamily inline, so the scale stays consistent as screens grow.
 *
 *   display — a serif: titles, headings, product names on hero cards,
 *             prices, big numerals.
 *   body    — a humanist sans: anything read as a sentence.
 *   micro   — a mono: eyebrows, counts, status. ALWAYS uppercase; the
 *             letterSpacing values below are already the dp equivalent of
 *             the 0.14–0.32em range the design calls for.
 *
 * Colours are deliberately NOT included — callers pair these with a
 * `useTheme()` colour so the same scale works in both themes.
 */
export function createTypography(fonts: {
  display: string;
  displayItalic: string;
  body: string;
  bodyMedium: string;
  micro: string;
}) {
  return {
    displayXl: {
      fontFamily: fonts.display,
      fontSize: 46,
      lineHeight: 46,
      letterSpacing: -0.55,
    },
    displayXlItalic: {
      fontFamily: fonts.displayItalic,
      fontSize: 46,
      lineHeight: 46,
      letterSpacing: -0.55,
    },
    displayLg: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28 },
    displayMd: { fontFamily: fonts.display, fontSize: 20, lineHeight: 24 },
    price: { fontFamily: fonts.display, fontSize: 20, lineHeight: 24 },
    priceSm: { fontFamily: fonts.display, fontSize: 17, lineHeight: 20 },
    bodyLg: { fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 20 },
    bodyMd: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
    bodySm: { fontFamily: fonts.body, fontSize: 11, lineHeight: 15 },
    micro: {
      fontFamily: fonts.micro,
      fontSize: 9,
      lineHeight: 12,
      letterSpacing: 1.6,
    },
    microXs: {
      fontFamily: fonts.micro,
      fontSize: 8,
      lineHeight: 11,
      letterSpacing: 2.2,
    },
  } as const;
}

/**
 * The platform's default type scale.
 *
 * Bound to the font families the core screens are laid out against, which
 * `useAppFonts()` loads. Changing them for a customer is a bundle-level
 * change (different `@expo-google-fonts` packages), not a runtime one — see
 * `docs/WHITE_LABEL.md`.
 */
export const typography = createTypography({
  display: "PlayfairDisplay_400Regular",
  displayItalic: "PlayfairDisplay_400Regular_Italic",
  body: "Manrope_400Regular",
  bodyMedium: "Manrope_500Medium",
  micro: "IBMPlexMono_400Regular",
});

/**
 * Tokens that never vary by theme *or* brand.
 *
 * Kept under the original name so the handful of module-scope
 * `StyleSheet.create` blocks that reference `SHARED_TOKENS.shadow` did not
 * have to change. Anything brand-tinted that used to live here (the razor's
 * gold) is now derived per brand and read from `useTheme()`.
 */
export const SHARED_TOKENS = NEUTRAL_TOKENS;

/**
 * A runtime theme built from the neutral defaults.
 *
 * The one legitimate consumer is `ErrorBoundary`, which wraps the providers
 * themselves and so must still render if the crash happened inside
 * `ThemeProvider`. It deliberately does not show brand colours: a crash
 * screen that tried to read the brand could fail for the same reason the
 * app did.
 */
export const fallbackTheme = createRuntimeTheme(defaultDarkTheme);

export type { AppTheme };
export type { RuntimeTheme, Theme, ThemeMode, BrandTheme } from "./types";
