import type { AppTheme, BrandTheme, RuntimeTheme } from "./types";
import { NEUTRAL_TOKENS, defaultDarkTheme, defaultLightTheme } from "./defaultTheme";
import { darken, lighten, mix, withAlpha } from "./color";

/**
 * Turns one brand palette into the full token set components render against.
 *
 * Derivation, not invention: every derived token is the brand's own colour
 * put through a fixed transform (an alpha, or a blend toward the ground),
 * so a brand that supplies a coherent palette gets a coherent app. The
 * alphas and blend amounts are the ones the design system was measured at.
 *
 * `AppTheme.tokens` wins over everything derived here. That is how an
 * existing app migrates with its appearance provably unchanged: it passes
 * the exact values it already shipped and nothing is recomputed.
 */
export function createRuntimeTheme(appTheme: AppTheme): RuntimeTheme {
  const isDark = appTheme.mode === "dark";
  const ground = appTheme.background;

  const derived: RuntimeTheme = {
    mode: appTheme.mode,

    background: appTheme.background,
    surface: appTheme.surface,
    muted: appTheme.surfaceElevated,
    text: appTheme.textPrimary,
    textMuted: appTheme.textMuted,

    gold: appTheme.primary,
    goldLight: appTheme.primaryLight,
    // Small type needs 4.5:1; the brand accent usually only clears that on
    // one of the two grounds. On dark the accent itself is already light
    // enough; on light it has to step down.
    goldText: isDark ? appTheme.primary : appTheme.primaryDark,
    onGold: appTheme.textOnPrimary,
    border: appTheme.border,

    ground,
    groundDeep: isDark ? darken(ground, 0.25) : darken(ground, 0.04),
    // Two radial washes of the brand accent. The depth comes from the
    // radial falloff, not from pigment — hence the low alphas.
    groundWarmA: withAlpha(darken(appTheme.primary, 0.42), isDark ? 0.16 : 0.15),
    groundWarmB: withAlpha(darken(appTheme.primary, 0.55), isDark ? 0.12 : 0.1),
    // Diagonal texture stroke. Higher on dark than a desktop reference would
    // suggest: below ~0.02 it quantises away on a phone OLED and the ground
    // reads as flat.
    grain: isDark
      ? withAlpha(appTheme.textPrimary, 0.022)
      : "rgba(0,0,0,0.025)",
    hairline: withAlpha(appTheme.primary, isDark ? 0.18 : 0.24),
    hairlineStrong: withAlpha(appTheme.primary, isDark ? 0.28 : 0.4),
    placeholderA: mix(ground, appTheme.primary, isDark ? 0.06 : 0.04),
    placeholderB: mix(ground, appTheme.primary, isDark ? 0.1 : 0.08),
    scrim: isDark ? withAlpha(ground, 0.55) : withAlpha(appTheme.surface, 0.72),
    // Sits on photography in both themes, so it stays dark in both.
    overlayTop: isDark
      ? withAlpha(darken(ground, 0.5), 0.9)
      : withAlpha(darken(ground, 0.9), 0.72),
    // No product surface in dark mode is ever pure white: a barely-there
    // tint of the text colour rather than a lighter grey.
    cardTint: isDark ? withAlpha(appTheme.textPrimary, 0.018) : appTheme.surface,

    success: appTheme.success,
    dangerSurface: appTheme.error,
    dangerText: appTheme.error,
    danger: appTheme.error,

    ...NEUTRAL_TOKENS,
    // The depicted metal object's warm parts follow the brand accent; its
    // steel does not (see NEUTRAL_TOKENS).
    razorGoldLight: lighten(appTheme.primary, 0.2),
    razorGoldDark: darken(appTheme.primary, 0.28),

    fontFamily: appTheme.fontFamily,
    spacing: appTheme.spacing,
    radius: appTheme.radius,
    statusBarStyle: appTheme.statusBarStyle,
  };

  return { ...derived, ...(appTheme.tokens ?? {}) };
}

/**
 * Builds both runtime themes for a brand.
 *
 * A brand with no `light` palette gets its dark one in both slots, so the
 * theme toggle still works and simply resolves to the same appearance.
 */
export function createThemes(brand: Partial<BrandTheme>): {
  dark: RuntimeTheme;
  light: RuntimeTheme;
} {
  const dark = brand.dark ?? defaultDarkTheme;
  const light = brand.light ?? (brand.dark ? { ...brand.dark, mode: "light" as const } : defaultLightTheme);
  return {
    dark: createRuntimeTheme(dark),
    light: createRuntimeTheme(light),
  };
}
