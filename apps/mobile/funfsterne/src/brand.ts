import type { BrandDefinition } from "@funfsterne/core";
import { theme } from "./theme";
import { config } from "./config";

/**
 * Everything that makes this build Fünf Sterne rather than any other
 * customer, in one object handed to `createAppRoot`.
 *
 * The images are `require()`d here, in the app package, because Metro
 * resolves an asset relative to the file that requires it — `packages/core`
 * has no assets directory and must not have one.
 */
export const brand: BrandDefinition = {
  theme,
  config,
  assets: {
    icon: require("../assets/icon.png"),
    hero: require("../assets/splash-owner.png"),
  },
  // Only the strings that are actually this shop's. Everything else comes
  // from the shared bundles in @funfsterne/core, including strings added by
  // a later core release.
  translations: {
    en: {
      home: {
        tagline: "Premium Barber Products",
        heroEyebrow: "BARBER · SINCE 2020",
      },
    },
    de: {
      home: {
        tagline: "Premium Barbierprodukte",
        heroEyebrow: "FRISEUR · SEIT 2020",
      },
    },
    ar: {
      home: {
        tagline: "منتجات حلاقة فاخرة",
        heroEyebrow: "حلاقة · منذ 2020",
      },
    },
  },
};
