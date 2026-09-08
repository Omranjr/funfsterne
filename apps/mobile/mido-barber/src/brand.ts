import type { BrandDefinition } from "@funfsterne/core";
import { theme } from "./theme";
import { config } from "./config";

/**
 * Everything that makes this build Mido Barber rather than any other shop.
 *
 * The images are `require()`d here, in the app package, because Metro
 * resolves an asset relative to the file that requires it — `packages/core`
 * has no assets directory and must not have one.
 */
export const brand: BrandDefinition = {
  theme,
  config,

  /**
   * The premium typographic opening, not the photographic one Fünf Sterne
   * uses. See `EditorialIntro` in @funfsterne/core: monogram rule, wordmark
   * rising into place, tracked tagline, hairline boot indicator.
   *
   * It is type-led on purpose, which is also why it already looks finished
   * with the placeholder artwork below — dropping in a real photograph adds
   * depth without changing the layout.
   */
  intro: "editorial",

  assets: {
    // ── PLACEHOLDER ARTWORK ──────────────────────────────────────────
    // Flat grey PNGs at the correct dimensions. See assets/README.md for
    // the full list and sizes. Deliberately NOT Fünf Sterne's artwork:
    // shipping another shop's owner portrait inside this app would be
    // worse than shipping a grey rectangle.
    icon: require("../assets/icon.png"),
    hero: require("../assets/splash-owner.png"),
  },

  // Only the strings that are actually this shop's. Everything else comes
  // from the shared bundles in @funfsterne/core, including strings added by
  // a later core release.
  translations: {
    en: {
      home: {
        tagline: "Sharp, every time",
        heroEyebrow: "BARBER · MIDO",
      },
    },
    de: {
      home: {
        tagline: "Immer scharf",
        heroEyebrow: "FRISEUR · MIDO",
      },
    },
    ar: {
      home: {
        tagline: "حلاقة دقيقة في كل مرة",
        heroEyebrow: "حلاقة · ميدو",
      },
    },
  },
};
