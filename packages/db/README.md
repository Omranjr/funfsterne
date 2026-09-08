# @funfsterne/db

The Prisma schema, its migrations, and one shared `PrismaClient`.

Moved here from `apps/api` so that any workspace needing database access —
the API today, a background worker or a platform-admin tool later — shares
one generated client and one migration history rather than each owning a
copy that can drift.

```bash
npm run db:generate        # regenerate the client (also runs on postinstall)
npm run db:validate        # check the schema parses
npm run db:migrate         # create + apply a migration (dev)
npm run db:migrate:deploy  # apply pending migrations (prod)
npm run db:seed
```

Needs `DATABASE_URL` and `DIRECT_URL`. `prisma migrate` cannot run DDL
through Supabase's connection pooler, which is what `DIRECT_URL` is for.

---

## ⚠ Read this before running `prisma migrate`

**The migration history in this folder does not describe the live database.**

Four migrations exist:

| Migration | Covers |
|---|---|
| `20260718023013_init` | Branch, Product, ProductBranchAvailability, DiscountCode, PushToken, DiscountCodeRedemption, Notification, AdminUser, User |
| `20250718120000_remove_user_accounts` | drops User, adds `deviceId` |
| `20260718120000_add_category_image` | CategoryImage |
| `20260906120000_add_multi_tenancy` | **new** — Tenant, `tenantId` everywhere, re-scoped uniques |

Nothing in the first three creates `ConsumerUser`, `LoyaltyTransaction`,
`LoyaltyReward`, `LoyaltyRewardStatus`, `NotificationAudience`,
`ConsumerUser.loyaltyPoints` or `Notification.audience` — yet the running
app uses all of them. Those reached production by some route other than
`prisma migrate` (most likely `prisma db push`).

Consequences, in order of how soon they bite:

1. **`prisma migrate dev` will report drift** and offer to reset the
   database. Do not accept that against anything with real data.
2. **Replaying this folder onto an empty database produces the wrong
   schema** — the loyalty and consumer-account tables never get created, and
   `20260906120000_add_multi_tenancy` then fails on its first
   `ALTER TABLE "ConsumerUser"`.
3. `20260906120000_add_multi_tenancy` was therefore written against the
   schema **as `schema.prisma` describes it** — which is what the running
   app proves the database actually looks like — not against what this
   folder replays to.

### Fixing it

Baseline the history against the live database before doing anything else:

```bash
# 1. Snapshot what the live database ACTUALLY looks like, pre-tenancy.
#    (Run this from a checkout that predates the multi-tenancy commit, or
#    against a copy of production restored to that point.)
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --shadow-database-url "$SHADOW_DATABASE_URL" \
  --script > prisma/migrations/20260905000000_baseline_loyalty/migration.sql

# 2. Tell Prisma it is already applied in production.
npx prisma migrate resolve --applied 20260905000000_baseline_loyalty

# 3. Then apply the multi-tenancy migration normally.
npx prisma migrate deploy
```

Verify on a restored copy of production first. `20260906120000_add_multi_tenancy`
rewrites unique constraints on `DiscountCode`, `ConsumerUser`, `AdminUser`
and `CategoryImage` and adds a NOT NULL column to twelve tables; it is not a
migration to meet for the first time in production.

---

## What the multi-tenancy migration does

1. Creates `Tenant` and the `TenantPlan` enum, and inserts the founding
   tenant `tnt_funfsterne` / slug `funfsterne`.
2. For all twelve customer-data tables: adds `tenantId` **nullable**,
   backfills it to the founding tenant, then sets `NOT NULL`. Deliberately
   not `ADD COLUMN ... NOT NULL DEFAULT ...` — that would leave a default
   behind that silently assigns every future insert to Fünf Sterne if a
   query ever forgets its `tenantId`, which is exactly the bug the whole
   change exists to prevent.
3. Gives `CategoryImage` a surrogate `id`. `category` was its only unique
   column and therefore its identity, meaning one image per category for the
   entire platform.
4. Re-scopes the four globally-unique constraints that would have collided
   between tenants on day one:
   - `DiscountCode.code` → `(tenantId, code)`
   - `ConsumerUser.username` → `(tenantId, username)`
   - `AdminUser.email` → `(tenantId, email)`
   - `CategoryImage.category` → `(tenantId, category)`

   `PushToken.token` stays **global**: an Expo push token identifies one
   installed app on one device and can never legitimately belong to two
   tenants.

   `DiscountCodeRedemption`'s two unique indexes are left alone — both are
   keyed on `discountCodeId`, which already belongs to exactly one tenant,
   so adding `tenantId` could not change an outcome, only widen an index.
5. Indexes `tenantId` on every table (every read now filters on it) plus
   `(tenantId, createdAt)` on `LoyaltyTransaction` for the analytics window
   scans.
6. Foreign keys with `ON DELETE CASCADE`. Deleting a `Tenant` is the
   off-boarding path and must take the customer's data with it, rather than
   leaving rows no query can reach that still hold personal data.
