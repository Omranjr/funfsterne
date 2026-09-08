import type { AppConfig } from "@funfsterne/core";

/**
 * Mido Barber — app config.
 *
 * `tenantId` must match a `Tenant.slug` row in the database. It is sent as
 * `x-tenant-id` on every API request and namespaces every persisted storage
 * key, so changing it after launch orphans both the server data and the
 * on-device cache. The row is created by `tenant.sql` in this folder.
 */
export const config: AppConfig = {
  tenantId: "mido-barber",
  appName: "Mido Barber",
  appTagline: "Sharp, every time",

  // Same platform API as Fünf Sterne — one backend, many shops. The tenant
  // header is what separates the data, not the URL.
  apiUrl:
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    "https://funfsterne-admin.onrender.com",

  currency: "EUR",
  currencySymbol: "€",
  locale: "de-DE",
  countryCode: "+49",
  timeZone: "Europe/Berlin",

  // Mirrors the server's constants in @funfsterne/shared-types. The API is
  // what enforces them; these are here to render copy without a round trip.
  pointsPerVisit: 10,
  pointsPerCurrencyUnit: 10,
  minRedeemPoints: 100,

  features: {
    discountCodes: true,
    loyaltyPoints: true,
    productCatalogue: true,
    multiBranch: true,
    notifications: true,
    languageSwitcher: true,
    onlinePayment: false,
  },

  // ── PLACEHOLDER ─────────────────────────────────────────────────────
  // Left undefined rather than filled with Fünf Sterne's details. Undefined
  // is the safe state: the product-detail screen hides the Instagram and
  // WhatsApp buttons instead of opening someone else's profile, and the
  // Account screen hides the privacy link rather than pointing at the wrong
  // shop's policy.
  //
  // Fill these in before any real user sees the app:
  supportPhone: undefined, // TODO: E.164, e.g. "+49..."
  supportPhoneDisplay: undefined, // TODO: human-readable form of the same
  supportEmail: undefined, // TODO
  instagramUrl: undefined, // TODO: full profile URL
  // TODO: required before App Store review — Apple rejects an app that
  // creates accounts without a reachable privacy policy.
  privacyPolicyUrl: undefined,
};
