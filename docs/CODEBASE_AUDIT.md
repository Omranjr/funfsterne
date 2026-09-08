# Codebase Audit Report — Phase 0

Scanned: every non-`node_modules` file in the repository (172 files).
Date: 2026-09-06. Branch: `feature/monorepo_restructure`.

---

## 0. Headline finding: this is not a barber *booking* app

The brief describes "a finished barber booking application" with bookings,
appointments, staff, services and payments. **None of those exist here.**

What actually exists is **FünfSterne** — a German barbershop's *customer
loyalty and offers* app:

| Brief assumes | Reality |
|---|---|
| Bookings / Appointments | ✗ none |
| Staff / Barbers | ✗ none |
| Services | ✗ none — there are **Products** (retail: hair, skin care, beard, tools) |
| Payments / Transactions | ✗ none (`StripePlaceholder.tsx` is a stub) |
| — | ✓ **Branches** (multi-location shop) |
| — | ✓ **Discount codes** + per-device/per-account redemption |
| — | ✓ **Loyalty points** ledger + euro-value vouchers |
| — | ✓ **Push notifications** with customer targeting |

Every phase below is executed against the models that *do* exist. Where the
brief names a table that does not exist, that item is reported as N/A rather
than invented.

**Second headline: the repo is already a monorepo.** It is a Turborepo +
npm-workspaces layout (`apps/{mobile,admin,api}`, `packages/shared-types`)
on branch `feature/monorepo_restructure`. Phase 1 is therefore a *re-shape*
of an existing monorepo, not a greenfield one.

---

## 1. App structure

**Current folder structure**

```
funfsterne/
├── apps/
│   ├── mobile/          @funfsterne/mobile   — Expo app (11 routes, 20 components)
│   ├── admin/           @funfsterne/admin    — Next.js 14 dashboard (11 pages)
│   └── api/             @funfsterne/api      — Fastify 4 API + Prisma schema
├── packages/
│   └── shared-types/    @funfsterne/shared-types — Zod schemas, the API contract
├── package.json         workspaces: apps/*, packages/*
├── turbo.json
└── Home and Coupon Reference.html   (1.7 MB design reference, not code)
```

- **Workflow**: **Expo managed** (SDK ~54, `expo-router` entry, no `ios/`
  or `android/` directories, EAS-built). `expo-updates` is installed.
- **Navigation**: **expo-router ~6.0.24** (file-based). `app/_layout.tsx`
  declares a 5-tab `<Tabs>`; 4 further routes are hidden with `href: null`.
  `@react-navigation/native` is used only for `useIsFocused` (transitive).
- **State management**: **React Context + TanStack Query v5**. Two contexts
  (`AuthContext`, `ThemeContext`), one `QueryClient` with an AsyncStorage
  persister. No Redux, no Zustand.
- **Styling**: **`StyleSheet.create` + a token object from a theme context.**
  NativeWind 4 / Tailwind / `global.css` are installed and wired into babel
  and metro, **but zero `className=` props exist in the source** — the
  Tailwind stack is dead weight today.
- **Entry point**: `"main": "expo-router/entry"` → `app/_layout.tsx`.
  There is **no `App.tsx`**.

**Admin**: Next.js 14 App Router, shadcn-style components on `@base-ui/react`,
Tailwind v3, `next-themes`, `recharts`, i18next (en/de/ar).

---

## 2. Hardcoded values to extract

### 2a. Hardcoded colours

**Finding: the mobile app is already fully themed.** A regex sweep for
`#rrggbb` / `rgb()` / `rgba()` across `app/`, `components/`, `hooks/`,
`lib/`, `contexts/` returns **five hits, all of which are string *templates*
in colour-maths helpers** (`Ground.tsx:40,53`, `HeroBanner.tsx:286,294,307`),
not literal brand colours.

Every literal colour lives in exactly **three** places:

| Location | Count | Notes |
|---|---|---|
| `apps/mobile/constants/theme.ts` | ~60 tokens | `SHARED_TOKENS` (17) + `darkTheme` (28) + `lightTheme` (28). Heavily commented with measured WCAG contrast ratios. |
| `apps/mobile/app.json` | 3 | `#0A0A0A` adaptive-icon bg, `#0A0A0A` splash bg (×2), `#C9A84C` notification colour |
| `apps/mobile/tailwind.config.js` | 7 | `background/primary/secondary/surface/muted/text/text-muted` — **stale duplicates** of the real tokens and unused (no `className`) |

Brand-defining values: `gold #C9A84C`, `goldLight #D4B660`, `goldText`
(`#C9A84C` dark / `#8F6D25` light), `ground #0E0B08` / `#FAF8F4`,
`groundDeep #0B0906` / `#F2EDE4`, `text #F5F0E6` / `#1A1917`.

### 2b. Hardcoded brand strings

| Value | File:line |
|---|---|
| `"Fünf Sterne"` (app name) | `apps/mobile/app.json:3` |
| `"FÜNF STERNE"` (splash wordmark) | `apps/mobile/components/AnimatedSplash.tsx:259` |
| `"BARBER · SINCE 2020"` / `"FRISEUR · SEIT 2020"` | `locales/{en,de,ar}.json` → `home.heroEyebrow` |
| `"Premium Barber Products"` (tagline) | `locales/*.json` → `home.tagline` |
| `+49 2823 4198333` (support phone, in copy) | `locales/{en,de,ar}.json` → `productDetail.linkFailedContact` |
| `"+4928234198333"` (`SHOP_PHONE`, dialled) | `apps/mobile/app/products/[id].tsx:27` |
| `https://instagram.com/mido.barbar7` (`SHOP_INSTAGRAM`) | `apps/mobile/app/products/[id].tsx:26` |
| `funfsterne:loyalty:` (QR payload prefix) | `apps/mobile/app/loyalty.tsx:39` |
| `funfsterne_device_id` (SecureStore key) | `apps/mobile/lib/device-id.ts:3` |
| `funfsterne-language` (AsyncStorage key) | `apps/mobile/lib/i18n.ts:22` |
| `funfsterne-query-cache` (AsyncStorage key) | `apps/mobile/lib/persist-client.ts:4` |
| `funfsterne-theme-mode` (AsyncStorage key) | `apps/mobile/contexts/ThemeContext.tsx:14` |
| `com.funfsterne.mobile` (iOS + Android bundle id) | `apps/mobile/app.json:12,21` |
| `funfsterne` (URL scheme) | `apps/mobile/app.json:8` |
| `omm` (Expo slug), `omran808s-team` (owner), EAS `projectId` | `apps/mobile/app.json:4,66,60` |
| `uniresqq@gmail.com`, `ascAppId`, `appleTeamId` | `apps/mobile/eas.json:32-35` |
| `webcredentials:funfsterne-admin-eight.vercel.app` | `apps/mobile/app.json:17` |
| `"FünfSterne Admin"`, `"Fünf Sterne"` | `apps/admin/src/app/layout.tsx:15-16`, `components/app-shell.tsx:43` |
| `noreply@funfsterne.de`, `"Dein Login-Link für Fünf Sterne"` | `apps/api/src/services/email.service.ts:14,20` |
| `admin@funfsterne.dev`, `"FünfSterne Mitte"` | `apps/api/prisma/seed.ts` |

### 2c. Hardcoded API / base URLs

| Value | File:line |
|---|---|
| `https://funfsterne-admin.onrender.com` | `apps/mobile/lib/api.ts:11` (fallback), `app.json:63` (`extra.apiBaseUrl`), `eas.json:11,20,26` (×3 build profiles) |
| `https://funfsterne-admin-eight.vercel.app/privacy` | `apps/mobile/app/account.tsx:13`, `app/index.tsx:35` (duplicated) |
| `http://localhost:4000` | `apps/admin/src/lib/api.ts:4`, `src/lib/auth.tsx:28` (duplicated), `apps/api/src/services/email.service.ts:14` |

### 2d. Hardcoded currency / locale

| Value | File:line |
|---|---|
| `€` literal, prefixed to prices | `app/products/[id].tsx:219`, `components/ProductCard.tsx:88,192` |
| `€` inside translated strings | `locales/{en,de,ar}.json` — `offers.euroOff`, `loyalty.redeemButton`, `loyalty.voucher`, `loyalty.redeemConfirmMessage` |
| `"Europe/Berlin"` (`BUSINESS_TIMEZONE`) | `apps/api/src/services/loyalty.service.ts:5` |
| `"en-CA"` / `"en-US"` `Intl` locales for chart labels | `apps/api/src/services/loyalty.service.ts:20,168,180` |
| `POINTS_PER_EURO = 10`, `POINTS_PER_VISIT = 10`, `MIN_REDEEM_POINTS = 100` | `packages/shared-types/src/index.ts:347-349` |
| `eurosValue` **column name** (currency baked into the schema) | `prisma/schema.prisma` → `LoyaltyReward.eurosValue` |
| Supported languages `en/de/ar` + flags 🇬🇧🇩🇪🇪🇬 | `apps/mobile/lib/i18n.ts:16-21` |

### 2e. Brand-specific asset imports

| Asset | Referenced from |
|---|---|
| `assets/splash-owner.png` (3.7 MB — a photo of the shop owner) | `AnimatedSplash.tsx:224`, `HeroBanner.tsx:99`, `app.json` splash (×2) |
| `assets/icon.png` (2.5 MB) | `LogInScreen.tsx:67`, `SignUpScreen.tsx:164`, `app.json:7` |
| `assets/android-icon-foreground.png`, `android-icon-monochrome.png` | `app.json:24-25` |
| `assets/favicon.png` | `app.json:30` |
| `assets/splash-icon.png`, `assets/splash-logo.png` | **unreferenced — dead assets** |

---

## 3. API & Database

- **Framework**: **Fastify 4.28**, ESM (`"type": "module"`, `.js` import
  specifiers), TypeScript, `tsx` for dev. 6 plugins (cors, helmet, prisma,
  jwt, upload/Supabase, error-handler), all correctly wrapped in
  `fastify-plugin` with comments explaining why.
- **ORM**: **Prisma 5.16**, schema at `apps/api/prisma/schema.prisma`.
- **Database**: **PostgreSQL** (Supabase, pooled `DATABASE_URL` +
  `DIRECT_URL`). 3 migrations on disk. Storage is Supabase Storage.
- **Auth**: two JWT roles over one secret — `admin` (7 d) and `consumer`
  (180 d), separated by a `role` claim check on every guard.
- **`tenantId` or similar multi-tenant field: DOES NOT EXIST ANYWHERE.**
  The database is single-tenant throughout. There is no `Tenant` model, no
  `organizationId`, no `shopId`. `Branch` is a *location within one shop*,
  not a tenant boundary — every `Branch` row today belongs to FünfSterne.

### Database models

| Model | Customer data? | Needs `tenantId` | Note |
|---|---|---|---|
| `Branch` | ✔ | **yes** | shop locations |
| `Product` | ✔ | **yes** | retail catalogue |
| `ProductBranchAvailability` | ✔ | **yes** (denormalised) | join row; implied via both parents, but denormalising keeps queries and the unique index honest |
| `DiscountCode` | ✔ | **yes** | `@@unique([code])` is **global** → must become `@@unique([tenantId, code])` |
| `DiscountCodeRedemption` | ✔ | **yes** | 2 unique indexes, both already scoped by `discountCodeId` |
| `PushToken` | ✔ | **yes** | `@@unique([token])` stays global (Expo tokens are globally unique); `@@unique([deviceId, token])` → add tenant |
| `Notification` | ✔ | **yes** | |
| `ConsumerUser` | ✔ | **yes** | `@@unique([username])` is **global** → must become `@@unique([tenantId, username])`. Two shops must each be able to have a `mohamed`. |
| `LoyaltyTransaction` | ✔ | **yes** | |
| `LoyaltyReward` | ✔ | **yes** | real-money liability — isolation is critical |
| `CategoryImage` | ✔ | **yes** | `@@unique([category])` is **global** → `@@unique([tenantId, category])`. Currently one image per category *platform-wide*. |
| `AdminUser` | ✔ | **yes** | `@@unique([email])` global → `@@unique([tenantId, email])`; a platform operator would need a separate super-admin path |
| `Tenant` (new) | — | **no** | is the tenant |
| **Enums** (`ProductCategory`, `DiscountCodeType`, `Platform`, `LoyaltyTransactionType`, `LoyaltyRewardStatus`, `NotificationAudience`) | — | **no** | reference values, not tables |

**Every single table in the schema holds customer data.** There are no
lookup tables.

### API endpoints (37) and tenant-scoping need

| Method | Path | Auth | Tenant scope |
|---|---|---|---|
| GET | `/health` | — | **no** (liveness) |
| GET | `/public/branches` | — | **yes** |
| GET | `/public/category-images` | — | **yes** |
| GET | `/public/products` | — | **yes** |
| GET | `/public/products/:id` | — | **yes** |
| POST | `/public/push-tokens` | consumer | **yes** |
| GET | `/public/discount-codes/active` | consumer | **yes** |
| POST | `/public/discount-codes/:code/redeem` | consumer | **yes** (`:code` is only unique *per tenant* after the change) |
| POST | `/public/auth/register` | — | **yes** (username uniqueness is per-tenant) |
| POST | `/public/auth/login` | — | **yes** (must not authenticate across tenants) |
| GET | `/public/auth/me` | consumer | **yes** |
| DELETE | `/public/auth/account` | consumer | **yes** |
| GET | `/public/loyalty/me` | consumer | **yes** |
| POST | `/public/loyalty/redeem` | consumer | **yes** |
| POST | `/admin/auth/login` | — | **yes** (admin email uniqueness is per-tenant) |
| GET | `/admin/me` | admin | no query, but tenant must be present |
| GET/POST | `/admin/branches` | admin | **yes** |
| GET/PATCH/DELETE | `/admin/branches/:id` | admin | **yes** |
| GET/POST | `/admin/products` | admin | **yes** |
| GET/PATCH/DELETE | `/admin/products/:id` | admin | **yes** |
| PUT | `/admin/products/:id/availability` | admin | **yes** |
| GET/POST | `/admin/discount-codes` | admin | **yes** |
| GET/PATCH/DELETE | `/admin/discount-codes/:id` | admin | **yes** |
| GET | `/admin/discount-codes/:id/redemptions` | admin | **yes** |
| GET | `/admin/category-images` | admin | **yes** |
| PUT/DELETE | `/admin/category-images/:category` | admin | **yes** |
| GET/POST | `/admin/notifications` | admin | **yes** |
| GET | `/admin/notifications/recipient-count` | admin | **yes** (counts **all** push tokens today) |
| POST | `/admin/notifications/send` | admin | **yes — highest risk**: today it broadcasts to every token in the table |
| GET | `/admin/consumer-users` | admin | **yes** |
| PATCH | `/admin/consumer-users/:id/reset-password` | admin | **yes** |
| POST | `/admin/loyalty/scan` | admin | **yes** |
| POST | `/admin/loyalty/rewards/:id/redeem` | admin | **yes** |
| GET | `/admin/loyalty/stats` | admin | **yes** |
| GET | `/admin/loyalty/customer-visits` | admin | **yes** |
| POST | `/admin/upload/image` | admin | **yes** (bucket prefix per tenant) |
| GET | `/.well-known/apple-app-site-association` | — | Next.js route, not Fastify |

**Only `/health` is genuinely tenant-free.**

---

## 4. Shared vs customer-specific

**Identical for every customer (→ `packages/core`)**

All 11 routes and all 20 components. Nothing in them is FünfSterne-specific
except the values catalogued in §2:

- Screens: `index` (home), `products`, `products/[id]`, `discount-codes`,
  `loyalty`, `account`, `branches`, `language`, `notifications/permission`
- Components: `Button`, `Card`, `CardWash`, `Badge`, `Input`, `BranchPill`,
  `ProductCard`, `LoadingSkeletons`, `EmptyState`, `CachedImage`,
  `ScreenWrapper`, `ThemeToggle`, `Ground`, `StripePlaceholder`,
  `BranchPicker`, `ErrorBoundary`, `SignUpScreen`, `LogInScreen`,
  `AnimatedSplash`, `BrandedIntroGate`, `HeroBanner`

**Likely to differ per customer**

- `AnimatedSplash` — the wordmark text, the owner photo, and the
  scissors/star motif are brand identity
- `HeroBanner` — hard-codes the owner portrait
- `index.tsx` — the fixed 5-category strip mirrors `ProductCategory`, which
  is a *barber* enum (`HAIR`/`BEARD`/…). A salon or a café would need a
  different set
- `products/[id].tsx` — Instagram + WhatsApp contact block
- Feature presence: not every customer will want loyalty, or offers, or push

**Purely presentational, zero business logic** (safest to move first):
`Button`, `Card`, `CardWash`, `Badge`, `Input`, `EmptyState`, `Skeleton`
family, `ScreenWrapper`, `Ground`, `StripePlaceholder`, `BranchPill`

**Hooks carrying business logic that must stay shared**:
`usePublicData` (all 7 queries), `useNotifications`, `usePushTokenSync`,
`useFonts`, `useReduceMotion`, `useSlowOperation`

---

## 5. Dependencies

**Root**: `turbo ^2.0.0`. npm workspaces, `packageManager: npm@10`.
An `overrides` block pins `react`/`react-native`/`reanimated`/`worklets`
inside `nativewind`.

**`apps/mobile` (42 runtime deps)** — React Native **0.81.5**, React
**19.1.0**, **Expo SDK ~54.0.36**.

- *Expo-specific (17)*: `expo`, `expo-router`, `expo-blur`,
  `expo-constants`, `expo-font`, `expo-haptics`, `expo-image`,
  `expo-linear-gradient`, `expo-linking`, `expo-localization`,
  `expo-notifications`, `expo-secure-store`, `expo-splash-screen`,
  `expo-status-bar`, `expo-updates`, `babel-preset-expo`, and the four
  `@expo-google-fonts/*` families
- *General React Native (10)*: `react-native-gesture-handler`,
  `react-native-reanimated`, `react-native-safe-area-context`,
  `react-native-screens`, `react-native-svg`, `react-native-qrcode-svg`,
  `react-native-worklets`, `react-native-css-interop`, `nativewind`,
  `@react-native-async-storage/async-storage`
- *Platform-agnostic (7)*: `@tanstack/react-query` (+2 persist packages),
  `i18next`, `react-i18next`, `lucide-react-native`,
  `@funfsterne/shared-types`

**`apps/api` (14)**: `fastify`, 5 `@fastify/*` plugins, `fastify-plugin`,
`@prisma/client`, `@supabase/supabase-js`, `bcryptjs`, `dotenv`,
`expo-server-sdk`, `nodemailer`, `zod-to-json-schema`.

**`apps/admin` (18)**: `next@14.2.35`, `react@^18` *(note: React 18 here vs
19 in mobile — fine, separate bundles)*, `@base-ui/react`, `recharts`,
`js-cookie`, `@zxing/browser`, `react-dropzone`, `sonner`, `next-themes`,
Tailwind v3.

**`packages/shared-types`**: `zod ^4.4.3`, built with `tsup`.

**⚠ `node_modules` is not installed** anywhere in this checkout, and there
is **no `.env`** in `apps/api` — only `.env.example`. So no `DATABASE_URL`.

---

## 6. Current pain points

**Circular imports**: none in mobile or api. One was found *and already
fixed* in admin — `admin-token.ts` was split out of `auth.tsx` precisely to
break an `api.ts ↔ auth.tsx` cycle (documented in the file header).

**Files over 300 lines (14)** — candidates for splitting:

| Lines | File |
|---|---|
| 801 | `apps/mobile/app/discount-codes.tsx` ← **by far the worst** |
| 532 | `apps/api/src/routes/admin.ts` (one file, 24 routes, 8 resources) |
| 530 | `apps/admin/src/app/notifications/page.tsx` |
| 518 | `apps/admin/src/app/analytics/page.tsx` |
| 465 | `apps/mobile/app/index.tsx` |
| 464 | `apps/mobile/app/loyalty.tsx` |
| 429 | `apps/mobile/components/AnimatedSplash.tsx` |
| 421 | `apps/admin/src/app/discount-codes/page.tsx` |
| 415 | `apps/mobile/app/products/[id].tsx` |
| 403 | `apps/mobile/components/HeroBanner.tsx` |
| 375 | `apps/api/src/services/loyalty.service.ts` |
| 372 | `apps/mobile/components/SignUpScreen.tsx` |
| 337 | `apps/mobile/app/products.tsx` |
| 335 | `apps/admin/src/app/branches/page.tsx` |

**Duplicated logic**

1. `PRIVACY_URL` — the same literal in `app/account.tsx:13` and
   `app/index.tsx:35`
2. `API_BASE_URL` fallback `http://localhost:4000` — `admin/src/lib/api.ts:4`
   and `admin/src/lib/auth.tsx:28`
3. `apps/mobile/lib/api.ts` has **two** near-identical fetch wrappers,
   `apiFetch` and `publicApiFetch`, differing only in error shape
4. `tailwind.config.js` colours duplicate — and have drifted from —
   `constants/theme.ts` (`#0A0A0A` vs the real `#0D0D0C`/`#0E0B08`)
5. `apps/{api,admin,mobile}` each re-declare an `UnauthorizedHandler`
   module-level singleton with the same shape

**Missing TypeScript types / `any` usage**

**Zero.** A whole-word `any` grep across every `.ts`/`.tsx` in mobile, api,
admin and shared-types returns only prose inside comments. `strict: true`
is on in all four tsconfigs. This is genuinely well-typed code.

Minor type smells that are *not* `any`:
- `request.params as { id: string }` casts repeated ~15× in the API routes
- `request.query as { granularity?: string; userId?: string }` (unvalidated)
- `PermissionResponseShape` in `useNotifications.ts` is a hand-written
  contract working around unstable upstream Expo types (documented)

**Other observations worth recording**

- `awardLoyaltyPoints` has its **daily scan limit commented out** for QA
  (`loyalty.service.ts:31-42`). Shipping multi-tenant with this off means
  every tenant's staff can award unlimited points.
- `email.service.ts` (`sendMagicLink`) is **dead code** — magic-link auth was
  removed in the `20250718120000_remove_user_accounts` migration and nothing
  imports it.
- `apps/mobile/assets/splash-icon.png` and `splash-logo.png` are unreferenced.
- `Home and Coupon Reference.html` (1.7 MB) is a design reference checked
  into the repo root.
- CORS fails **closed** when unconfigured — correct, and worth preserving
  when tenants get their own origins.

---

## 7. What this audit means for the restructure

1. **Theming is already solved** — better than the brief's `AppTheme`. The
   work is not "extract colours from components" (there are none); it is
   "make the token *sets* a per-customer input".
2. **Multi-tenancy is 100% greenfield.** Not one row, column, header or
   query is tenant-aware today. This is the bulk of the risk.
3. **Three global unique constraints will collide between tenants** the day
   a second customer signs up: `DiscountCode.code`, `ConsumerUser.username`,
   `CategoryImage.category` (and `AdminUser.email`).
4. **`POST /admin/notifications/send` currently pushes to every token in the
   table.** Un-scoped, tenant #2's first broadcast reaches tenant #1's
   customers. This is the single highest-severity finding.
5. **The `ProductCategory` enum is barber-specific** (`HAIR`, `BEARD`,
   `SKIN_CARE`, `TOOLS`, `OTHER`) and is a Postgres enum, so it is
   *platform-wide*, not per-tenant. Left as-is (out of scope), but it caps
   how far from "barbershop" a white-label customer can be.
