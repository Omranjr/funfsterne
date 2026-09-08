import type { AppConfig } from "@funfsterne/core";

/**
 * Fünf Sterne — app config.
 *
 * `tenantId` must match a `Tenant.slug` row in the database. It is sent as
 * `x-tenant-id` on every API request and namespaces every persisted storage
 * key, so changing it after launch orphans both the server data and the
 * on-device cache.
 */
export const config: AppConfig = {
  tenantId: "funfsterne",
  appName: "Fünf Sterne",
  appTagline: "Premium Barber Products",

  // The build profile's env var wins so a preview build can point at a
  // staging API without editing this file; the literal is the production
  // origin and the fallback for a local `expo start`.
  apiUrl:
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    "https://funfsterne-admin.onrender.com",

  currency: "EUR",
  currencySymbol: "€",
  locale: "de-DE",
  countryCode: "+49",
  timeZone: "Europe/Berlin",

  // Mirrors the server's constants in @funfsterne/shared-types. The API is
  // what enforces them; these are here so copy like "100 points = €10" can
  // be rendered without a round trip.
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

  // E.164 for the deep link; the display form is what appears in copy.
  supportPhone: "+4928234198333",
  supportPhoneDisplay: "+49 2823 4198333",
  instagramUrl: "https://instagram.com/mido.barbar7",

  privacyPolicyUrl: "https://funfsterne-admin-eight.vercel.app/privacy",
};
