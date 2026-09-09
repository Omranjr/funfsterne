/**
 * Wipes customer data while leaving the shop's own catalogue intact.
 *
 * Written for the pre-launch clean-out: the accounts, visits, coupons and
 * notification history accumulated during testing go, while products,
 * images, branches and the admin login stay exactly as they are.
 *
 *   npm run reset:user-data --workspace=apps/api              # dry run
 *   npm run reset:user-data --workspace=apps/api -- --confirm # actually delete
 *
 * A dry run is the default on purpose: this is irreversible, and Supabase's
 * free tier has no point-in-time restore to fall back on. Every real run
 * writes a JSON backup of everything it is about to remove *before* removing
 * it, so a change of heart is recoverable.
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

const CONFIRM = process.argv.includes("--confirm");

/**
 * Tables this script is allowed to empty.
 *
 * Order matters: children before parents, so nothing is ever deleted out
 * from under a foreign key. `LoyaltyTransaction` is listed explicitly rather
 * than left to the `ConsumerUser` cascade because that relation is
 * `SetNull` -- deleting the account alone would leave 38 anonymous visit
 * rows behind, which is not what "delete the visits" means.
 */
const TARGETS = [
  "loyaltyTransaction",
  "loyaltyReward",
  "discountCodeRedemption",
  "notification",
  "discountCode",
  "pushToken",
  "consumerUser",
] as const;

/** Named so a future edit to TARGETS cannot quietly take the catalogue with it. */
const PROTECTED = [
  "product",
  "productBranchAvailability",
  "categoryImage",
  "branch",
  "adminUser",
] as const;

type Target = (typeof TARGETS)[number];

/** Prisma Decimal and Date do not survive JSON.stringify usefully on their own. */
function replacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value && typeof value === "object" && "toFixed" in value) return String(value);
  return value;
}

async function main() {
  const host = (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? "").hostname;
    } catch {
      return "(unknown)";
    }
  })();

  console.log(`\n  database : ${host}`);
  console.log(`  mode     : ${CONFIRM ? "DELETE (irreversible)" : "dry run — nothing will be written"}\n`);

  const counts = {} as Record<Target, number>;
  for (const t of TARGETS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    counts[t] = await (prisma as any)[t].count();
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log("  to delete:");
  for (const t of TARGETS) console.log(`    ${t.padEnd(24)} ${counts[t]}`);
  console.log(`    ${"TOTAL".padEnd(24)} ${total}\n`);

  console.log("  keeping:");
  for (const t of PROTECTED) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.log(`    ${t.padEnd(24)} ${await (prisma as any)[t].count()}`);
  }
  console.log();

  if (!CONFIRM) {
    console.log("  Dry run only. Re-run with --confirm to delete.\n");
    return;
  }

  if (total === 0) {
    console.log("  Nothing to delete.\n");
    return;
  }

  // Back up before touching anything -- if the write fails, so does the run.
  const dir = join(process.cwd(), "backups");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `user-data-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);

  const backup: Record<string, unknown[]> = {};
  for (const t of TARGETS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    backup[t] = await (prisma as any)[t].findMany();
  }
  writeFileSync(file, JSON.stringify({ takenAt: new Date().toISOString(), host, data: backup }, replacer, 2));
  console.log(`  backup written: ${file}\n`);

  // One transaction: either the whole wipe lands or none of it does, so a
  // failure halfway cannot leave visits pointing at deleted accounts.
  const results = await prisma.$transaction(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TARGETS.map((t) => (prisma as any)[t].deleteMany({})),
  );

  console.log("  deleted:");
  TARGETS.forEach((t, i) => console.log(`    ${t.padEnd(24)} ${results[i].count}`));
  console.log("\n  Done. Catalogue untouched.\n");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
