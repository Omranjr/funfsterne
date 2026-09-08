/**
 * Which shop this dashboard build administers.
 *
 * The API rejects any request without `x-tenant-id`, and there is no default
 * on the server side, so this has to be set for the dashboard to work at
 * all. One deployment per customer, each with its own
 * `NEXT_PUBLIC_TENANT_ID` — the same shape as the mobile apps, where each
 * customer gets their own build rather than a tenant switcher.
 *
 * The literal fallback keeps `npm run dev` working against a seeded local
 * database without a `.env.local`. It is deliberately the founding tenant's
 * slug and not something like "default": a wrong-but-real slug fails
 * visibly on the first request against a real deployment, where a
 * made-up one would 404 with a message that reads like the API is down.
 */
export const TENANT_ID =
  process.env.NEXT_PUBLIC_TENANT_ID ?? "funfsterne";
