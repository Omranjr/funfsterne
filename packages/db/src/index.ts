/**
 * @funfsterne/db — the Prisma schema, its migrations, and one shared client.
 *
 * The schema lives here rather than inside apps/api so that any workspace
 * that needs database access (the API today; a background worker or a
 * platform-admin tool later) depends on one generated client and one
 * migration history, instead of each owning a copy that can drift.
 */
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export * from "@prisma/client";
export { PrismaClient };

/**
 * The founding tenant's id, as written by the `add_multi_tenancy`
 * migration. Exported so the seed script and any backfill can name the same
 * row the migration created rather than looking it up by slug and hoping.
 */
export const FOUNDING_TENANT_ID = "tnt_funfsterne";
export const FOUNDING_TENANT_SLUG = "funfsterne";
