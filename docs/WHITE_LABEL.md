# White-label platform

One codebase, one API, one database — and one App Store listing, one brand
and one isolated island of data per customer.

## Layout

```
funfsterne/
├── apps/
│   ├── mobile/
│   │   ├── template/        the master template; copied for each new customer
│   │   └── funfsterne/      customer #1 (the original app)
│   ├── api/                 Fastify API, tenant-scoped
│   └── admin/               Next.js dashboard, one deployment per customer
├── packages/
│   ├── core/                every screen, component, hook and API call
│   ├── db/                  Prisma schema + migrations
│   └── shared-types/        Zod schemas: the API contract
├── scripts/
└── docs/
```

## The three seams

A customer app owns exactly three things. Everything else is `packages/core`.

| File | What it holds |
|---|---|
| `src/theme.ts` | colours, fonts, spacing, radii |
| `src/config.ts` | tenant id, API URL, currency, locale, feature switches, contact details |
| `src/brand.ts` | ties those together and adds the images + any copy overrides |

Plus `assets/` (five images) and `app.json` / `eas.json` (store identity).

`app/_layout.tsx` is one line:

```tsx
export default createAppRoot(brand);
```

The `app/` directory's other files are one-line re-exports, because
expo-router needs a file per route:

```tsx
export { HomeScreen as default } from "@funfsterne/core";
```

## Adding customer #2

```bash
./scripts/new-customer.sh marco-salon "Marco's Salon"
```

Then, in order:

1. Run the SQL in `apps/mobile/marco-salon/tenant.sql` against the database.
   Until that `Tenant` row exists, every request from the app answers
   `404 TENANT_NOT_FOUND`.
2. Replace the five placeholder images in `apps/mobile/marco-salon/assets/`
   (sizes are in that folder's README).
3. Fill in the `TODO`s in `src/theme.ts`, `src/config.ts` and `src/brand.ts`.
4. Add the customer's dashboard origin to `ALLOWED_ORIGINS` on the API.
5. `npm install` — links the new workspace.
6. `npm run check` — brand-free check plus typecheck, everywhere.
7. `cd apps/mobile/marco-salon && eas init && eas build --platform all`

## How theming works

A brand supplies an `AppTheme` per mode — about twenty colours plus the
spacing and radius scales. `createThemes` derives the ~40 tokens the
components actually render against: ground washes, hairlines, scrims,
placeholder stripes, and so on, each one the brand's own colour put through
a fixed transform.

`AppTheme.tokens` overrides any derived value. That escape hatch is what
made migrating the original app provably safe: `apps/mobile/funfsterne`
passes the exact token set it shipped before the restructure, so its
appearance is byte-identical rather than approximately right. A brand-new
customer omits `tokens` entirely.

Components never see `AppTheme`. They call `useTheme()` and get the derived
`RuntimeTheme`.

### What is NOT per-customer

- **The spacing and radius scales in `packages/core/src/theme/tokens.ts`.**
  These are the layout system every core screen is built against, not brand
  identity. `AppTheme` carries its own copies for components that want them
  off the theme, but the module constants are what the `StyleSheet.create`
  blocks use.
- **Font families.** `AppTheme.fontFamily` names them and they reach
  components via `useTheme()`, but the type scale in `typography` is bound
  at module scope, and the fonts themselves are npm packages loaded by
  `useAppFonts()`. Genuinely rebranding the type means: swap the
  `@expo-google-fonts/*` dependencies, update `useAppFonts`, and build the
  scale with `createTypography(...)`. It is a bundle-level change, not a
  runtime one, and no architecture makes it otherwise.
- **`ProductCategory`** (`HAIR`, `BEARD`, `SKIN_CARE`, `TOOLS`, `OTHER`).
  A Postgres enum, therefore platform-wide. It caps how far from
  "barbershop" a customer can be.
- **`BUSINESS_TIMEZONE`** in `apps/api/src/services/loyalty.service.ts`
  (`Europe/Berlin`). It sets the loyalty day boundary and the analytics
  buckets. Making it per-tenant is a `Tenant` column and a lookup in three
  functions — the right change the day a customer opens in another timezone.

## Feature switches

`config.features` hides a tab when a customer does not want that feature:

```ts
features: {
  discountCodes: true,
  loyaltyPoints: true,
  productCatalogue: true,
  multiBranch: true,
  notifications: true,
  languageSwitcher: true,
  onlinePayment: false,   // reserved; the payment component is a stub
}
```

A hidden tab's route stays reachable by deep link — expo-router still needs
a `<Tabs.Screen>` for every route file, and `href: null` is how it is told
to keep the route but leave it out of the bar.

## Copy

`packages/core/src/i18n/locales/{en,de,ar}.json` holds every shared string.
A customer overrides only the handful that are theirs, in
`brand.translations`, and inherits everything else — including strings added
by a later core release:

```ts
translations: {
  de: { home: { tagline: "…", heroEyebrow: "…" } },
}
```

Values that vary per customer are interpolations, not literals:
`{{symbol}}` for the currency (its *position* differs by language — English
writes `€10`, German writes `10 €`), `{{phone}}` for support.

## Multi-tenancy

**The client** sends `x-tenant-id: <slug>` on every request, from
`config.tenantId`.

**The API** resolves it in `resolveTenant` (`apps/api/src/middleware/tenant.ts`),
registered as a plugin-level `preHandler` on every route group that touches
customer data. There is no default tenant: a missing header is `400
MISSING_TENANT`, an unknown or inactive one is `404 TENANT_NOT_FOUND`.

**Tokens** carry a `tid` claim. Both auth middlewares check it against the
resolved tenant, because one signing secret serves every tenant — without
that check a valid token from one shop would authenticate against another
simply by changing the header.

**Queries** filter on `tenantId`. Writes that target a row by id use
`updateMany`/`deleteMany` rather than `update`/`delete`, so the tenant
filter is part of the write itself rather than a check that precedes it.

**Storage** keys on the device are namespaced by tenant (`storageKey()`),
and Supabase uploads are written under a `<slug>/` prefix.

`npm run check:core` fails the build if a brand colour, URL, phone number,
email or shop name appears anywhere in `packages/core`. It runs in CI before
anything is built.

## Builds

`scripts/build-changed.js` decides what a change affects: anything under
`packages/` or a root config file rebuilds every customer; otherwise only
the customers whose own directory changed. It errs towards rebuilding —
a missed rebuild ships one customer an app without a fix everyone else has,
and nobody finds out until they report it.

```bash
npm run build:changed          # print the affected slugs as JSON
npm run build:all              # queue an EAS build for every customer
npm run build:all preview      # ...on the preview profile
```

CI (`.github/workflows/build.yml`) runs the same logic on push to `master`,
with `fail-fast: false` — one customer's expired credentials must not block
another customer's release.
