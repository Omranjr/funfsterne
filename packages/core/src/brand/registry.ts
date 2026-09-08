import type { ImageSourcePropType } from "react-native";
import type { AppConfig } from "../types/config";
import type { BrandTheme, RuntimeTheme } from "../theme/types";
import { createThemes } from "../theme/createThemes";
import { defaultTheme } from "../theme/defaultTheme";
import { defaultConfig } from "../config/defaultConfig";

/**
 * Brand-specific images, supplied by the customer app.
 *
 * These cannot live in `packages/core`: they are the customer's logo and
 * photography, and each app bundles its own. `require()` of an image is
 * resolved by Metro at bundle time relative to the requiring file, so the
 * app hands core the already-resolved sources here.
 */
export interface BrandAssets {
  /** App icon / wordmark shown on the sign-in and sign-up screens. */
  icon: ImageSourcePropType;
  /** Full-bleed image behind the animated splash and the home hero. */
  hero: ImageSourcePropType;
}

/**
 * Which opening animation a brand plays.
 *
 * Named by style rather than by customer, because `packages/core` may not
 * name a customer and because the second brand to want a minimal opening
 * should pick one, not copy one.
 *
 *  - `classic`   the original composition: full-bleed portrait, wordmark,
 *                five stars that become the loading indicator, scissors.
 *  - `editorial` a typographic opening: deep ground, a monogram rule that
 *                draws, the wordmark rising into place, a tracked tagline
 *                and a progress hairline. Minimal, and it holds up with a
 *                placeholder image behind it because the type carries it.
 */
export type IntroVariant = "classic" | "editorial";

/**
 * Per-language copy that belongs to the customer, not the platform.
 *
 * Layered over `packages/core`'s shared locale files, so a customer only
 * lists the handful of strings that are actually theirs (tagline, hero
 * eyebrow, support number) and inherits every other string -- including any
 * added by a later core release.
 *
 * Shape is i18next's: a nested object mirroring the shared bundle.
 */
export type BrandTranslations = Record<string, Record<string, unknown>>;

export interface BrandDefinition {
  theme: BrandTheme;
  config: AppConfig;
  assets: BrandAssets;
  translations?: BrandTranslations;
  /** Defaults to `classic` -- the composition the platform shipped with. */
  intro?: IntroVariant;
}

interface ResolvedBrand {
  config: AppConfig;
  assets: BrandAssets | null;
  themes: { dark: RuntimeTheme; light: RuntimeTheme };
  translations: BrandTranslations;
  intro: IntroVariant;
}

/**
 * The registered brand.
 *
 * A module-level singleton on purpose. Two things need the brand before any
 * React tree exists: the API client (which must attach `x-tenant-id` to a
 * request that may fire from a non-component module) and the storage-key
 * helpers (which namespace every persisted key by tenant so two of these
 * apps installed side by side can never read each other's cache).
 *
 * `configureBrand` is called at the top of the customer app's entry file,
 * which Metro evaluates before any screen module, so by the time anything
 * renders this is always populated. The neutral defaults below exist so
 * that `packages/core` still type-checks and runs standalone.
 */
let brand: ResolvedBrand = {
  config: defaultConfig,
  assets: null,
  themes: createThemes(defaultTheme),
  translations: {},
  intro: "classic",
};

export function configureBrand(definition: BrandDefinition): void {
  brand = {
    config: definition.config,
    assets: definition.assets,
    themes: createThemes(definition.theme),
    translations: definition.translations ?? {},
    intro: definition.intro ?? "classic",
  };
}

/** The active app config. Safe to call from non-React modules. */
export function getConfig(): AppConfig {
  return brand.config;
}

/** Which opening animation this brand plays. */
export function getIntroVariant(): IntroVariant {
  return brand.intro;
}

/** The brand's per-language copy overrides. */
export function getBrandTranslations(): BrandTranslations {
  return brand.translations;
}

/** Both runtime themes for the active brand. */
export function getThemes(): { dark: RuntimeTheme; light: RuntimeTheme } {
  return brand.themes;
}

/**
 * The brand's images.
 *
 * Throws if the app never called `configureBrand`, because there is no
 * sensible neutral fallback for "the customer's logo" — a silent blank
 * image would ship to the store looking like a rendering bug.
 */
export function getBrandAssets(): BrandAssets {
  if (!brand.assets) {
    throw new Error(
      "Brand assets are not configured. Call configureBrand({ theme, config, assets }) " +
        "from the app entry point before rendering.",
    );
  }
  return brand.assets;
}

/**
 * Namespaces a persisted-storage key by tenant.
 *
 * Every AsyncStorage / SecureStore key in the app goes through this. Two
 * white-label builds are separate binaries with separate sandboxes today,
 * so this is belt-and-braces — but it also means a single build could host
 * more than one tenant later without silently serving one customer's cached
 * catalogue to another.
 */
export function storageKey(name: string): string {
  return `${brand.config.tenantId}:${name}`;
}
