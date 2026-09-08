import type { BrandDefinition } from "@funfsterne/core";
import { theme } from "./theme";
import { config } from "./config";

/**
 * TEMPLATE — everything that makes this build one customer's app.
 *
 * The images are require()d here, in the app package, because Metro
 * resolves an asset relative to the file that requires it.
 */
export const brand: BrandDefinition = {
  theme,
  config,
  assets: {
    // TODO: replace with the customer's own artwork.
    icon: require("../assets/icon.png"),
    hero: require("../assets/splash-owner.png"),
  },
  // Only the strings that are this customer's. Everything else comes from
  // the shared bundles in @funfsterne/core.
  translations: {
    en: {
      home: {
        tagline: "TODO: customer tagline",
        heroEyebrow: "TODO: HERO EYEBROW",
      },
    },
  },
};
