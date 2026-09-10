import type { FastifyInstance } from "fastify";
import { fetchPushReceipts } from "./push.service.js";

/**
 * How long to wait after sending before asking Expo what happened.
 *
 * Expo's own guidance is to leave at least 15 minutes: a receipt requested
 * too early simply is not there yet, and burning the ticket ids on an empty
 * answer is worse than waiting.
 */
const RECEIPT_DELAY_MS = 15 * 60 * 1000;

/**
 * Expo drops receipts after 24 hours. Past that the outcome is unknowable,
 * so the row is marked checked with whatever is known and the ticket ids are
 * released rather than being retried forever.
 */
const RECEIPT_EXPIRY_MS = 24 * 60 * 60 * 1000;

/** How often the sweep runs. */
const CHECK_INTERVAL_MS = 10 * 60 * 1000;

/**
 * `Notification.ticketIds` stores "<ticketId>|<pushToken>" so a receipt can
 * be traced back to the device it was for. Expo tokens look like
 * `ExponentPushToken[xxx]` and contain no "|", so a single split is safe.
 */
export function encodeTicket(t: { id: string; token: string }): string {
  return `${t.id}|${t.token}`;
}

function decodeTicket(entry: string): { id: string; token: string } {
  const sep = entry.indexOf("|");
  // Rows written before the token was stored have no separator; they still
  // yield a usable ticket id, just no dead-token pruning.
  if (sep === -1) return { id: entry, token: "" };
  return { id: entry.slice(0, sep), token: entry.slice(sep + 1) };
}

export type DeliveryCheckReport = {
  checked: number;
  delivered: number;
  failed: number;
  deadTokensRemoved: number;
  errors: string[];
};

/**
 * Turns tickets into a delivery verdict for every notification old enough
 * to have one.
 *
 * Without this the dashboard reports what Expo queued, which is not what
 * anybody wants to know: an expired APNs key produces a perfect-looking
 * "sent to 1 device" while Apple rejects every message with a 403. The
 * error codes recorded here are what make that visible.
 */
export async function checkPendingReceipts(
  app: FastifyInstance,
): Promise<DeliveryCheckReport> {
  const now = Date.now();

  const pending = await app.prisma.notification.findMany({
    where: {
      deliveryCheckedAt: null,
      ticketIds: { isEmpty: false },
      sentAt: { lt: new Date(now - RECEIPT_DELAY_MS) },
    },
    select: { id: true, sentAt: true, ticketIds: true },
    orderBy: { sentAt: "asc" },
    take: 50,
  });

  const report: DeliveryCheckReport = {
    checked: 0,
    delivered: 0,
    failed: 0,
    deadTokensRemoved: 0,
    errors: [],
  };

  for (const notification of pending) {
    const expired =
      now - notification.sentAt.getTime() > RECEIPT_EXPIRY_MS;

    if (expired) {
      // Nothing left to learn -- close the row out so it stops being picked
      // up, and free the ticket ids.
      await app.prisma.notification.update({
        where: { id: notification.id },
        data: {
          deliveryCheckedAt: new Date(),
          ticketIds: [],
          deliveryErrors: ["ReceiptsExpired"],
        },
      });
      report.checked += 1;
      if (!report.errors.includes("ReceiptsExpired")) {
        report.errors.push("ReceiptsExpired");
      }
      continue;
    }

    const outcome = await fetchPushReceipts(
      notification.ticketIds.map(decodeTicket),
    );

    await app.prisma.notification.update({
      where: { id: notification.id },
      data: {
        deliveryCheckedAt: new Date(),
        deliveredCount: outcome.delivered,
        failedCount: outcome.failed,
        deliveryErrors: outcome.errors,
        ticketIds: [],
      },
    });

    // A `DeviceNotRegistered` token belongs to an app that was uninstalled
    // or whose token rotated. It will never deliver again, so drop it --
    // otherwise it inflates every future recipient count and quietly drags
    // the failure rate down forever.
    if (outcome.deadTokens.length > 0) {
      const { count } = await app.prisma.pushToken.deleteMany({
        where: { token: { in: outcome.deadTokens } },
      });
      report.deadTokensRemoved += count;
    }

    report.checked += 1;
    report.delivered += outcome.delivered;
    report.failed += outcome.failed;
    for (const e of outcome.errors) {
      if (!report.errors.includes(e)) report.errors.push(e);
    }
  }

  return report;
}

/**
 * Starts the recurring receipt check.
 *
 * Same shape as the retention schedule: timers rather than a platform cron,
 * `unref`'d so they never hold a shutdown open, and failures logged rather
 * than thrown, because a reporting job must not be able to take the API down.
 */
export function startDeliveryCheckSchedule(app: FastifyInstance): void {
  const run = () => {
    void checkPendingReceipts(app)
      .then((report) => {
        if (report.checked > 0) {
          app.log.info(report, "push receipt check complete");
        }
        if (report.errors.length > 0) {
          app.log.warn(
            { errors: report.errors },
            "push delivery errors reported by Expo",
          );
        }
      })
      .catch((err) => {
        app.log.error({ err }, "push receipt check failed");
      });
  };

  setTimeout(run, 2 * 60 * 1000).unref();
  setInterval(run, CHECK_INTERVAL_MS).unref();
}
