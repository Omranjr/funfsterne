import type { AppConfig } from "../types/config";

/**
 * A brand-neutral fallback config.
 *
 * Exists so `packages/core` type-checks and runs standalone, and so a
 * customer app can spread it and override only what differs. It is *not* a
 * usable production config: `tenantId` is a placeholder the API will reject
 * with `TENANT_NOT_FOUND`, which is the correct loud failure for an app
 * that forgot to call `configureBrand`.
 */
export const defaultConfig: AppConfig = {
  tenantId: "unconfigured",
  appName: "App",
  apiUrl: "http://localhost:4000",

  currency: "EUR",
  currencySymbol: "€",
  locale: "en-GB",
  countryCode: "+49",
  timeZone: "Europe/Berlin",

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
};
