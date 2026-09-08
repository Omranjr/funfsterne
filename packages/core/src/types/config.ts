/**
 * Everything about an app that is the customer's, not the platform's.
 *
 * One of these lives in each `apps/mobile/<customer>/src/config.ts`. Core
 * reads it through `useConfig()` inside components and `getConfig()` in
 * plain modules; nothing in `packages/core` may hardcode any of it.
 */
export interface AppConfig {
  // ── Identity ─────────────────────────────────────────────────────────
  /**
   * The tenant slug. Sent as `x-tenant-id` on every API request and used to
   * namespace every persisted storage key. Must match a `Tenant.slug` row
   * in the database.
   */
  tenantId: string;
  /** Display name, as shown on the splash and in the app stores. */
  appName: string;
  appTagline?: string;

  // ── API ──────────────────────────────────────────────────────────────
  apiUrl: string;

  // ── Locale ───────────────────────────────────────────────────────────
  currency: string;
  currencySymbol: string;
  locale: string;
  /** Dialling prefix, e.g. "+49". */
  countryCode: string;
  /**
   * IANA timezone the business operates in. The API uses its own copy of
   * this for the loyalty day boundary; this one is for client-side dates.
   */
  timeZone: string;

  // ── Business rules ───────────────────────────────────────────────────
  /**
   * Loyalty economics. These have to agree with the server — the API
   * enforces them — so they are here to render copy ("100 points = €10"),
   * not to decide anything.
   */
  pointsPerVisit: number;
  pointsPerCurrencyUnit: number;
  minRedeemPoints: number;

  // ── Features (toggle per customer) ────────────────────────────────────
  features: {
    /** Show the Offers tab and the discount-code flow. */
    discountCodes: boolean;
    /** Show the Rewards tab, the QR code and the points ledger. */
    loyaltyPoints: boolean;
    /** Show the Shop tab and product detail. */
    productCatalogue: boolean;
    /** Show the branch picker. A single-location shop turns this off. */
    multiBranch: boolean;
    /** Ask for push permission and register tokens. */
    notifications: boolean;
    /** Show the in-app language switcher. */
    languageSwitcher: boolean;
    /** Reserved: online payment is a stub in this codebase today. */
    onlinePayment: boolean;
  };

  // ── Support / social ─────────────────────────────────────────────────
  /** E.164, used for the `tel:`/WhatsApp deep link. */
  supportPhone?: string;
  /** Human-readable form of the same number, for display in copy. */
  supportPhoneDisplay?: string;
  supportEmail?: string;
  /** Full Instagram profile URL, including the scheme and host. */
  instagramUrl?: string;

  // ── Legal ────────────────────────────────────────────────────────────
  privacyPolicyUrl?: string;
  termsUrl?: string;
}
