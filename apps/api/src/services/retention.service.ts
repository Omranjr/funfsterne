import type { FastifyInstance } from "fastify";

/**
 * How long personal data is kept after it stops being operationally needed.
 *
 * This is the single number the privacy policy quotes. Change it here and
 * update `apps/admin/src/app/privacy/page.tsx` to match -- the policy is a
 * legal statement about this constant, so the two must never drift.
 */
export const RETENTION_MONTHS = 12;

export type RetentionReport = {
  /** Anything older than this is in scope. */
  cutoff: Date;
  retentionMonths: number;
  dryRun: boolean;
  /** Push tokens deleted (or, when `dryRun`, that would be). */
  stalePushTokens: number;
  /** Redemption rows deleted (or that would be). */
  deletedRedemptions: number;
};

function retentionCutoff(now: Date): Date {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);
  return cutoff;
}

/**
 * Deletes push tokens we have not seen in the retention window.
 *
 * Safe to delete outright because nothing reads these rows historically. All
 * three readers -- the admin recipient count, the "reachable users" set in
 * the loyalty service, and the send itself -- ask who can be reached *now*,
 * and a token from a phone that has been silent for a year cannot be. Sweeping
 * them makes those numbers more accurate, not less.
 *
 * A device that comes back simply re-registers on next launch and gets a fresh
 * row, so this costs a returning customer nothing.
 */
async function sweepPushTokens(
  app: FastifyInstance,
  cutoff: Date,
  dryRun: boolean,
): Promise<number> {
  const where = { updatedAt: { lt: cutoff } };

  if (dryRun) {
    return app.prisma.pushToken.count({ where });
  }

  const { count } = await app.prisma.pushToken.deleteMany({ where });
  return count;
}

/**
 * Deletes redemption records once the offer they belong to is over.
 *
 * Only ever touches codes that are finished -- switched off, or past their
 * expiry. That restriction is not about how long the record stays
 * interesting; it is a correctness one. The unique indexes on
 * `[deviceId, discountCodeId]` and `[userId, discountCodeId]` are the *only*
 * thing enforcing one-redemption-per-person (see the comment in
 * `routes/public.ts`), so deleting a row for a code someone can still redeem
 * lets them redeem it a second time. While a code is live its redemption rows
 * are still doing a job, and needing them to enforce the offer is itself the
 * lawful basis for holding them.
 *
 * The code-level cap is unaffected either way: `DiscountCode.currentRedemptions`
 * is a counter in its own right and is deliberately not decremented here.
 *
 * Known edge: an admin who re-activates a code that has been dormant for over
 * a year gets a code its original redeemers can claim again. That is a
 * deliberate trade -- the alternative is holding the identifiers forever.
 */
async function sweepRedemptions(
  app: FastifyInstance,
  cutoff: Date,
  now: Date,
  dryRun: boolean,
): Promise<number> {
  const where = {
    redeemedAt: { lt: cutoff },
    discountCode: {
      OR: [{ isActive: false }, { expiresAt: { lt: now } }],
    },
  };

  if (dryRun) {
    return app.prisma.discountCodeRedemption.count({ where });
  }

  const { count } = await app.prisma.discountCodeRedemption.deleteMany({ where });
  return count;
}

/**
 * Runs one retention pass.
 *
 * Pass `dryRun` to get the same counts without writing anything -- which is
 * how you check what a real run would touch before letting it near live data.
 */
export async function runRetentionCleanup(
  app: FastifyInstance,
  { dryRun = false }: { dryRun?: boolean } = {},
): Promise<RetentionReport> {
  const now = new Date();
  const cutoff = retentionCutoff(now);

  // Sequential, not Promise.all: on a small instance this runs alongside real
  // traffic, and there is no reason for a housekeeping job to take two
  // connections when it is in no hurry.
  const stalePushTokens = await sweepPushTokens(app, cutoff, dryRun);
  const deletedRedemptions = await sweepRedemptions(app, cutoff, now, dryRun);

  return {
    cutoff,
    retentionMonths: RETENTION_MONTHS,
    dryRun,
    stalePushTokens,
    deletedRedemptions,
  };
}

/** Roughly a day, in milliseconds. */
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * How long after boot the first pass runs.
 *
 * The API sleeps when idle, so a cold start is already a customer waiting on a
 * request. This gets out of the way of that entirely rather than competing
 * with it for a connection.
 */
const FIRST_RUN_DELAY_MS = 60 * 1000;

/**
 * Starts the recurring cleanup.
 *
 * A timer rather than a platform cron job because the host's scheduler is a
 * paid feature and this does not warrant one. The trade-off is that passes
 * only happen while the process is awake -- on a plan where the service sleeps
 * this effectively becomes "shortly after each cold start", which for a job
 * whose deadline is measured in months is entirely sufficient. Running the
 * pass more often than needed is harmless: every sweep is idempotent, because
 * a deleted row cannot be deleted twice.
 *
 * Failures are logged and swallowed. Housekeeping must never take the API down
 * with it.
 */
export function startRetentionSchedule(app: FastifyInstance): void {
  const run = () => {
    void runRetentionCleanup(app)
      .then((report) => {
        if (report.stalePushTokens || report.deletedRedemptions) {
          app.log.info(
            {
              stalePushTokens: report.stalePushTokens,
              deletedRedemptions: report.deletedRedemptions,
              cutoff: report.cutoff.toISOString(),
            },
            "retention cleanup complete",
          );
        }
      })
      .catch((err) => {
        app.log.error({ err }, "retention cleanup failed");
      });
  };

  // `unref` on both so a pending timer never keeps the process alive during a
  // deploy or a shutdown.
  setTimeout(run, FIRST_RUN_DELAY_MS).unref();
  setInterval(run, CLEANUP_INTERVAL_MS).unref();
}
