-- Multi-tenancy.
--
-- Order matters here. Adding a NOT NULL column to a table that already has
-- rows fails outright, so every table goes through the same three steps:
-- add the column nullable, backfill it to the founding tenant, then tighten
-- it to NOT NULL. Doing it in one `ADD COLUMN ... NOT NULL DEFAULT ...`
-- would work too, but would leave a default behind that quietly assigns
-- every future insert to Fünf Sterne if a query ever forgets its tenantId --
-- which is precisely the bug this migration exists to make impossible.
--
-- NOTE ON DRIFT: the migrations in this folder predate ConsumerUser,
-- LoyaltyTransaction, LoyaltyReward, Notification.audience and
-- ConsumerUser.loyaltyPoints -- those reached the live database by some
-- route other than `prisma migrate`. This migration is written against the
-- schema as it actually stands (which is what the running app proves the
-- database looks like), not against what this folder replays to. See
-- packages/db/README.md before running it.

-- ── The tenant table ──────────────────────────────────────────────────────

CREATE TYPE "TenantPlan" AS ENUM ('BASIC', 'PRO', 'ENTERPRISE');

CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" "TenantPlan" NOT NULL DEFAULT 'BASIC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE INDEX "Tenant_isActive_idx" ON "Tenant"("isActive");

-- The founding tenant. Every row that exists today is theirs. The id is a
-- fixed literal rather than a generated one so the backfill below, the seed
-- script, and anyone reading this migration all name the same row.
INSERT INTO "Tenant" ("id", "slug", "name", "plan", "isActive", "createdAt", "updatedAt")
VALUES ('tnt_funfsterne', 'funfsterne', 'Fünf Sterne', 'ENTERPRISE', true, NOW(), NOW());

-- ── Step 1: add the column, nullable ──────────────────────────────────────

ALTER TABLE "Branch"                    ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Product"                   ADD COLUMN "tenantId" TEXT;
ALTER TABLE "ProductBranchAvailability" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "DiscountCode"              ADD COLUMN "tenantId" TEXT;
ALTER TABLE "PushToken"                 ADD COLUMN "tenantId" TEXT;
ALTER TABLE "DiscountCodeRedemption"    ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Notification"              ADD COLUMN "tenantId" TEXT;
ALTER TABLE "AdminUser"                 ADD COLUMN "tenantId" TEXT;
ALTER TABLE "ConsumerUser"              ADD COLUMN "tenantId" TEXT;
ALTER TABLE "LoyaltyTransaction"        ADD COLUMN "tenantId" TEXT;
ALTER TABLE "LoyaltyReward"             ADD COLUMN "tenantId" TEXT;
ALTER TABLE "CategoryImage"             ADD COLUMN "tenantId" TEXT;

-- ── Step 2: backfill ──────────────────────────────────────────────────────

UPDATE "Branch"                    SET "tenantId" = 'tnt_funfsterne';
UPDATE "Product"                   SET "tenantId" = 'tnt_funfsterne';
UPDATE "ProductBranchAvailability" SET "tenantId" = 'tnt_funfsterne';
UPDATE "DiscountCode"              SET "tenantId" = 'tnt_funfsterne';
UPDATE "PushToken"                 SET "tenantId" = 'tnt_funfsterne';
UPDATE "DiscountCodeRedemption"    SET "tenantId" = 'tnt_funfsterne';
UPDATE "Notification"              SET "tenantId" = 'tnt_funfsterne';
UPDATE "AdminUser"                 SET "tenantId" = 'tnt_funfsterne';
UPDATE "ConsumerUser"              SET "tenantId" = 'tnt_funfsterne';
UPDATE "LoyaltyTransaction"        SET "tenantId" = 'tnt_funfsterne';
UPDATE "LoyaltyReward"             SET "tenantId" = 'tnt_funfsterne';
UPDATE "CategoryImage"             SET "tenantId" = 'tnt_funfsterne';

-- ── Step 3: tighten to NOT NULL ───────────────────────────────────────────

ALTER TABLE "Branch"                    ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Product"                   ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ProductBranchAvailability" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "DiscountCode"              ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "PushToken"                 ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "DiscountCodeRedemption"    ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Notification"              ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "AdminUser"                 ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ConsumerUser"              ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "LoyaltyTransaction"        ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "LoyaltyReward"             ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "CategoryImage"             ALTER COLUMN "tenantId" SET NOT NULL;

-- ── CategoryImage gains a surrogate key ───────────────────────────────────
--
-- `category` was this table's only unique column, and therefore its
-- identity: one image per category for the entire platform. The second
-- tenant to upload a BEARD tile would have collided with the first.
ALTER TABLE "CategoryImage" ADD COLUMN "id" TEXT;
UPDATE "CategoryImage" SET "id" = 'cat_' || "tenantId" || '_' || "category"::text;
ALTER TABLE "CategoryImage" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "CategoryImage" ADD CONSTRAINT "CategoryImage_pkey" PRIMARY KEY ("id");

-- ── Re-scope the unique constraints that were global ──────────────────────
--
-- Each of these would have collided between tenants on day one: two shops
-- both running a "WELCOME10", two shops both with a customer called
-- "mohamed", one owner running two shops from one email address.

DROP INDEX "DiscountCode_code_key";
CREATE UNIQUE INDEX "DiscountCode_tenantId_code_key" ON "DiscountCode"("tenantId", "code");

DROP INDEX "PushToken_deviceId_token_key";
CREATE UNIQUE INDEX "PushToken_tenantId_deviceId_token_key" ON "PushToken"("tenantId", "deviceId", "token");
-- "PushToken_token_key" is deliberately left GLOBAL: an Expo push token
-- identifies one installed app on one device and can never legitimately
-- belong to two tenants at once.

DROP INDEX "AdminUser_email_key";
CREATE UNIQUE INDEX "AdminUser_tenantId_email_key" ON "AdminUser"("tenantId", "email");

DROP INDEX "ConsumerUser_username_key";
CREATE UNIQUE INDEX "ConsumerUser_tenantId_username_key" ON "ConsumerUser"("tenantId", "username");

DROP INDEX "CategoryImage_category_key";
CREATE UNIQUE INDEX "CategoryImage_tenantId_category_key" ON "CategoryImage"("tenantId", "category");

-- DiscountCodeRedemption's two unique indexes are left exactly as they were.
-- Both are keyed on discountCodeId, which already belongs to exactly one
-- tenant, so adding tenantId could not change any outcome -- only make the
-- indexes wider.

-- ── Indexes ───────────────────────────────────────────────────────────────
--
-- Every read is now filtered by tenantId, so every table needs it indexed or
-- the whole application gets slower as customers are added.

CREATE INDEX "Branch_tenantId_idx"                    ON "Branch"("tenantId");
CREATE INDEX "Product_tenantId_idx"                   ON "Product"("tenantId");
CREATE INDEX "ProductBranchAvailability_tenantId_idx" ON "ProductBranchAvailability"("tenantId");
CREATE INDEX "DiscountCode_tenantId_idx"              ON "DiscountCode"("tenantId");
CREATE INDEX "PushToken_tenantId_idx"                 ON "PushToken"("tenantId");
CREATE INDEX "DiscountCodeRedemption_tenantId_idx"    ON "DiscountCodeRedemption"("tenantId");
CREATE INDEX "Notification_tenantId_idx"              ON "Notification"("tenantId");
CREATE INDEX "AdminUser_tenantId_idx"                 ON "AdminUser"("tenantId");
CREATE INDEX "ConsumerUser_tenantId_idx"              ON "ConsumerUser"("tenantId");
CREATE INDEX "LoyaltyTransaction_tenantId_idx"        ON "LoyaltyTransaction"("tenantId");
CREATE INDEX "LoyaltyReward_tenantId_idx"             ON "LoyaltyReward"("tenantId");
CREATE INDEX "CategoryImage_tenantId_idx"             ON "CategoryImage"("tenantId");

-- The analytics endpoints scan EARN rows for one tenant over a date window.
CREATE INDEX "LoyaltyTransaction_tenantId_createdAt_idx" ON "LoyaltyTransaction"("tenantId", "createdAt");

-- ── Foreign keys ──────────────────────────────────────────────────────────
--
-- ON DELETE CASCADE throughout: removing a Tenant row is the off-boarding
-- path, and it must take the customer's data with it rather than leaving
-- orphaned rows that no query can reach but that still count against
-- storage and still contain personal data.

ALTER TABLE "Branch"                    ADD CONSTRAINT "Branch_tenantId_fkey"                    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Product"                   ADD CONSTRAINT "Product_tenantId_fkey"                   FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductBranchAvailability" ADD CONSTRAINT "ProductBranchAvailability_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscountCode"              ADD CONSTRAINT "DiscountCode_tenantId_fkey"              FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PushToken"                 ADD CONSTRAINT "PushToken_tenantId_fkey"                 FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscountCodeRedemption"    ADD CONSTRAINT "DiscountCodeRedemption_tenantId_fkey"    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification"              ADD CONSTRAINT "Notification_tenantId_fkey"              FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminUser"                 ADD CONSTRAINT "AdminUser_tenantId_fkey"                 FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsumerUser"              ADD CONSTRAINT "ConsumerUser_tenantId_fkey"              FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyTransaction"        ADD CONSTRAINT "LoyaltyTransaction_tenantId_fkey"        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyReward"             ADD CONSTRAINT "LoyaltyReward_tenantId_fkey"             FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CategoryImage"             ADD CONSTRAINT "CategoryImage_tenantId_fkey"             FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
