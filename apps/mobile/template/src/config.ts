import type { AppConfig } from "@funfsterne/core";

/**
 * TEMPLATE — customer app config.
 *
 * The scaffold script fills in the slug and the app name; everything
 * still marked TODO below is a manual step.
 */
export const config: AppConfig = {
  // Must match a Tenant.slug row in the database. The scaffold script prints
  // the SQL that creates it.
  tenantId: "CUSTOMER_SLUG",
  appName: "APP_NAME",
  appTagline: "TODO: customer tagline",

  apiUrl:
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    "https://funfsterne-admin.onrender.com",

  currency: "EUR", // TODO: update if not the Eurozone
  currencySymbol: "€", // TODO
  locale: "de-DE", // TODO
  countryCode: "+49", // TODO
  timeZone: "Europe/Berlin", // TODO: must match the API's BUSINESS_TIMEZONE

  // Server-enforced; these are for rendering copy only. Keep them in step
  // with @funfsterne/shared-types.
  pointsPerVisit: 10,
  pointsPerCurrencyUnit: 10,
  minRedeemPoints: 100,

  // Switching a feature off hides its tab. The routes stay deep-linkable.
  features: {
    discountCodes: true,
    loyaltyPoints: true,
    productCatalogue: true,
    multiBranch: true,
    notifications: true,
    languageSwitcher: true,
    onlinePayment: false,
  },

  // TODO: the customer's real contact details. Leaving these unset disables
  // the Instagram and WhatsApp buttons on the product detail screen rather
  // than opening a dead link.
  supportPhone: undefined,
  supportPhoneDisplay: undefined,
  instagramUrl: undefined,

  // TODO: required before App Store review — Apple rejects apps that collect
  // an account with no reachable privacy policy.
  privacyPolicyUrl: undefined,
};
