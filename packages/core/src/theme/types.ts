/**
 * The brand's theme input — the shape a white-label customer fills in.
 *
 * This is deliberately small and flat: it is what a designer hands over for
 * a new shop. The much larger set of tokens the components actually render
 * against (`RuntimeTheme` below) is *derived* from this by `createThemes`,
 * so onboarding a customer means picking ~20 colours, not 60.
 *
 * A customer who has had a designer tune the derived tokens by hand can
 * still override any of them via `AppTheme.tokens` — see `createThemes`.
 */
export interface AppTheme {
  // ── Brand colours ────────────────────────────────────────────────────
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  accent: string;

  // ── Background colours ───────────────────────────────────────────────
  background: string;
  surface: string;
  surfaceElevated: string;

  // ── Text colours ─────────────────────────────────────────────────────
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnPrimary: string;

  // ── Semantic colours ─────────────────────────────────────────────────
  success: string;
  warning: string;
  error: string;
  info: string;

  // ── Border ───────────────────────────────────────────────────────────
  border: string;
  borderLight: string;

  /** Status bar style for React Native. */
  statusBarStyle: "light-content" | "dark-content";

  /**
   * Which of the two runtime themes this palette describes.
   *
   * Not in the brief's interface, but required here: this app has always
   * shipped a light *and* a dark theme with independently hand-tuned
   * contrast, and the OS-following theme toggle is a user-facing feature.
   * A single flat palette cannot express both, so a brand supplies one
   * `AppTheme` per mode (see `BrandTheme`).
   */
  mode: "light" | "dark";

  // ── Typography ───────────────────────────────────────────────────────
  /**
   * Font family names as registered with `expo-font` / `@expo-google-fonts`.
   *
   * Note: swapping these also means swapping the font packages the customer
   * app installs and loads — fonts are a bundle-level concern, not a purely
   * runtime one. See `createTypography` for rebranding the whole scale.
   */
  fontFamily: {
    regular: string;
    medium: string;
    bold: string;
  };

  // ── Spacing scale ────────────────────────────────────────────────────
  spacing: {
    xs: number; // 4
    sm: number; // 8
    md: number; // 16
    lg: number; // 24
    xl: number; // 32
    xxl: number; // 48
  };

  // ── Border radius ────────────────────────────────────────────────────
  radius: {
    sm: number; // 4
    md: number; // 8
    lg: number; // 16
    full: number; // 9999
  };

  /**
   * Escape hatch: exact values for any derived token.
   *
   * `createThemes` derives every `RuntimeTheme` token from the fields above,
   * but some of them (radial ground washes, texture alpha, placeholder
   * stripes) were tuned by hand against a specific palette and measured on
   * device. A brand that has those values supplies them here and they win
   * over anything derived, so an existing app can be migrated with its
   * appearance provably unchanged.
   */
  tokens?: Partial<RuntimeTheme>;
}

/**
 * A brand's complete theme: one palette per mode.
 *
 * `light` is optional — a brand that ships dark-only gets the dark palette
 * in both slots, which is what the toggle then resolves to either way.
 */
export interface BrandTheme {
  dark: AppTheme;
  light?: AppTheme;
}

/**
 * The token set every component renders against, via `useTheme().theme`.
 *
 * This is the app's real design system and is intentionally larger than
 * `AppTheme`: it includes derived surfaces (washes, scrims, hairlines) and
 * a group of values that are deliberately identical in both themes because
 * they sit on photography, or carry fixed semantics (danger), or have a
 * functional contrast requirement (QR codes).
 */
export interface RuntimeTheme {
  mode: "light" | "dark";

  // Core surfaces and type
  background: string;
  surface: string;
  muted: string;
  text: string;
  textMuted: string;

  // Brand accent. Named `gold` for continuity with the design system this
  // app was built against; it is whatever the brand's `primary` is.
  gold: string;
  goldLight: string;
  /** Brand accent stepped for SMALL type, so it clears 4.5:1 on the ground. */
  goldText: string;
  /** Label colour on a solid brand-accent fill. */
  onGold: string;
  border: string;

  // Ground / depth
  ground: string;
  groundDeep: string;
  groundWarmA: string;
  groundWarmB: string;
  grain: string;
  hairline: string;
  hairlineStrong: string;
  placeholderA: string;
  placeholderB: string;
  scrim: string;
  overlayTop: string;
  cardTint: string;

  // Semantic
  success: string;
  dangerSurface: string;
  dangerText: string;

  // ── Mode-independent tokens ──────────────────────────────────────────
  danger: string;
  onStatus: string;
  backdrop: string;
  onImage: string;
  splashGround: string;
  photoScrimMid: string;
  photoScrimDeep: string;
  qrForeground: string;
  qrBackground: string;
  shadow: string;
  razorGoldLight: string;
  razorGoldDark: string;
  razorSteelLight: string;
  razorSteelDark: string;

  // ── Scales, carried on the theme so brands can override them ─────────
  fontFamily: AppTheme["fontFamily"];
  spacing: AppTheme["spacing"];
  radius: AppTheme["radius"];
  statusBarStyle: AppTheme["statusBarStyle"];
}

export type ThemeMode = "light" | "dark" | "system";

/** Back-compat alias: components have always called this `Theme`. */
export type Theme = RuntimeTheme;
