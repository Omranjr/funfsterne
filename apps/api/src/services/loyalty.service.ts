import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { POINTS_PER_VISIT, POINTS_PER_EURO } from "@funfsterne/shared-types";

// The business day boundary for the "one scan per calendar day" rule and
// the analytics buckets.
//
// Platform-wide, not per tenant: making it per tenant means a Tenant column
// and a lookup in every one of these functions, which is the right change
// the day a customer opens outside this timezone. Recorded in
// docs/WHITE_LABEL.md as a known limit rather than left implicit.
const BUSINESS_TIMEZONE = "Europe/Berlin";

// "YYYY-MM-DD" as seen in the business's local timezone. Used to compare
// two timestamps for "same calendar day" without pulling in a date library
// -- Intl.DateTimeFormat's en-CA locale formats dates in that exact order.
function businessDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export type AwardPointsResult =
  | { ok: true; balance: number }
  | { ok: false; errorCode: "ALREADY_SCANNED_TODAY" | "USER_NOT_FOUND" };

export async function awardLoyaltyPoints(
  app: FastifyInstance,
  args: { tenantId: string; userId: string; branchId: string },
): Promise<AwardPointsResult> {
  // findFirst with the tenant filter, not findUnique on the id: this is a
  // staff-triggered write driven by a scanned QR code, so the id arrives
  // from outside and must be proved to belong to this shop before points
  // are awarded against it.
  const user = await app.prisma.consumerUser.findFirst({
    where: { id: args.userId, tenantId: args.tenantId },
    select: { id: true },
  });
  if (!user) {
    return { ok: false, errorCode: "USER_NOT_FOUND" };
  }

  // Daily scan limit is temporarily disabled for testing so staff can
  // award points repeatedly during QA / demos. Re-enable by uncommenting
  // the block below once testing is complete.
  //
  // const lastEarn = await app.prisma.loyaltyTransaction.findFirst({
  //   where: { userId: args.userId, tenantId: args.tenantId, type: "EARN" },
  //   orderBy: { createdAt: "desc" },
  //   select: { createdAt: true },
  // });
  //
  // const now = new Date();
  // if (lastEarn && businessDateKey(lastEarn.createdAt) === businessDateKey(now)) {
  //   return { ok: false, errorCode: "ALREADY_SCANNED_TODAY" };
  // }

  const [, updated] = await app.prisma.$transaction([
    app.prisma.loyaltyTransaction.create({
      data: {
        tenantId: args.tenantId,
        userId: args.userId,
        branchId: args.branchId,
        points: POINTS_PER_VISIT,
        type: "EARN",
      },
    }),
    // By id alone, and deliberately `update` rather than `updateMany`: the
    // findFirst at the top of this function already proved the account
    // belongs to this tenant, and only `update` returns the new balance,
    // which the caller needs.
    app.prisma.consumerUser.update({
      where: { id: args.userId },
      data: { loyaltyPoints: { increment: POINTS_PER_VISIT } },
      select: { loyaltyPoints: true },
    }),
  ]);

  return { ok: true, balance: updated.loyaltyPoints };
}

export type RedeemPointsResult =
  | { ok: true; reward: { id: string; eurosValue: string }; balance: number }
  | { ok: false; errorCode: "INSUFFICIENT_POINTS" };

export async function redeemLoyaltyPoints(
  app: FastifyInstance,
  args: { tenantId: string; userId: string; points: number },
): Promise<RedeemPointsResult> {
  const eurosValue = new Prisma.Decimal(args.points).div(POINTS_PER_EURO);

  return app.prisma.$transaction(async (tx) => {
    // Conditional update rather than "read balance, then decide, then
    // write": this is customer-facing and converts points directly into
    // spendable euros, so it needs to be safe against two redeem requests
    // firing concurrently for the same account. Gating the decrement
    // itself on loyaltyPoints >= points (checked atomically by Postgres at
    // write time, not by a separate earlier read) means at most one of two
    // simultaneous requests can ever succeed -- closing the double-spend
    // race a "check then write" version would have.
    const { count } = await tx.consumerUser.updateMany({
      where: {
        id: args.userId,
        tenantId: args.tenantId,
        loyaltyPoints: { gte: args.points },
      },
      data: { loyaltyPoints: { decrement: args.points } },
    });

    if (count === 0) {
      return { ok: false, errorCode: "INSUFFICIENT_POINTS" };
    }

    const [user] = await Promise.all([
      tx.consumerUser.findUniqueOrThrow({
        where: { id: args.userId },
        select: { loyaltyPoints: true },
      }),
      tx.loyaltyTransaction.create({
        data: {
          tenantId: args.tenantId,
          userId: args.userId,
          points: -args.points,
          type: "REDEEM",
        },
      }),
    ]);

    const reward = await tx.loyaltyReward.create({
      data: {
        tenantId: args.tenantId,
        userId: args.userId,
        eurosValue,
        pointsSpent: args.points,
      },
    });

    return {
      ok: true,
      reward: { id: reward.id, eurosValue: reward.eurosValue.toString() },
      balance: user.loyaltyPoints,
    };
  });
}

export type VisitStatsGranularity = "day" | "month" | "year";

export type VisitStatsBucket = {
  bucket: string;
  label: string;
  visits: number;
};

export type VisitStatsResult = {
  granularity: VisitStatsGranularity;
  series: VisitStatsBucket[];
  totalVisits: number;
  uniqueCustomers: number;
};

// How far back each granularity looks by default -- chosen so the chart
// always shows a reasonable number of bars (about 30/12/6) rather than
// requiring a date-range picker the admin UI doesn't have yet.
const GRANULARITY_WINDOW_DAYS: Record<VisitStatsGranularity, number> = {
  day: 30,
  month: 365,
  year: 365 * 5,
};

function bucketKeyAndLabel(
  date: Date,
  granularity: VisitStatsGranularity,
): { bucket: string; label: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;

  if (granularity === "year") {
    return { bucket: year, label: year };
  }
  if (granularity === "month") {
    const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    return { bucket: `${year}-${month}`, label };
  }
  const label = new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric" },
  );
  return { bucket: `${year}-${month}-${day}`, label };
}

// Builds every bucket in [from, now] up front, zero-filled, so the chart
// always renders a continuous, evenly-spaced timeline -- a bar chart that
// only plots buckets with activity would silently compress "no visits that
// week" into a gap that reads as a shorter time span, not a real zero.
function enumerateBuckets(
  from: Date,
  granularity: VisitStatsGranularity,
): { bucket: string; label: string }[] {
  const buckets: { bucket: string; label: string }[] = [];
  const now = new Date();

  if (granularity === "day") {
    const cursor = new Date(from);
    while (cursor <= now) {
      buckets.push(bucketKeyAndLabel(cursor, "day"));
      cursor.setDate(cursor.getDate() + 1);
    }
  } else if (granularity === "month") {
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    while (cursor <= end) {
      buckets.push(bucketKeyAndLabel(cursor, "month"));
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else {
    const cursor = new Date(from.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 0, 1);
    while (cursor <= end) {
      buckets.push(bucketKeyAndLabel(cursor, "year"));
      cursor.setFullYear(cursor.getFullYear() + 1);
    }
  }
  return buckets;
}

export async function getLoyaltyVisitStats(
  app: FastifyInstance,
  args: { tenantId: string; granularity: VisitStatsGranularity; userId?: string },
): Promise<VisitStatsResult> {
  const from = new Date(Date.now() - GRANULARITY_WINDOW_DAYS[args.granularity] * 86_400_000);

  const transactions = await app.prisma.loyaltyTransaction.findMany({
    where: {
      tenantId: args.tenantId,
      type: "EARN",
      createdAt: { gte: from },
      ...(args.userId ? { userId: args.userId } : {}),
    },
    select: { createdAt: true, userId: true },
  });

  const buckets = new Map<string, VisitStatsBucket>(
    enumerateBuckets(from, args.granularity).map((b) => [b.bucket, { ...b, visits: 0 }]),
  );
  const uniqueCustomers = new Set<string>();

  for (const tx of transactions) {
    const { bucket } = bucketKeyAndLabel(tx.createdAt, args.granularity);
    const entry = buckets.get(bucket);
    if (entry) entry.visits += 1;
    if (tx.userId) uniqueCustomers.add(tx.userId);
  }

  return {
    granularity: args.granularity,
    series: Array.from(buckets.values()),
    totalVisits: transactions.length,
    uniqueCustomers: uniqueCustomers.size,
  };
}

// ── Customer engagement leaderboard ───────────────────────────────────────

export type EngagementPeriod = "month" | "halfYear" | "year";

const ENGAGEMENT_WINDOW_DAYS: Record<EngagementPeriod, number> = {
  month: 30,
  halfYear: 182,
  year: 365,
};

export type CustomerVisitSummary = {
  userId: string;
  firstName: string;
  lastName: string;
  username: string;
  visits: number;
  lastVisitAt: Date | null;
  joinedAt: Date;
  reachable: boolean;
};

/**
 * Every registered customer, with their visit count inside the window.
 *
 * Deliberately built by starting from ConsumerUser and LEFT-joining visits
 * in memory, rather than aggregating LoyaltyTransaction directly. A customer
 * who hasn't visited at all in the window has NO transaction rows, so a
 * transaction-first query would omit them entirely -- and those are exactly
 * the "least motivated" customers this endpoint exists to surface. Returning
 * them with `visits: 0` is the whole point.
 *
 * The merge is done in JS rather than SQL because the row count here is the
 * shop's total customer list (hundreds, realistically), so the simplicity
 * and portability is worth more than pushing it into a raw query.
 */
export async function getCustomerVisitSummary(
  app: FastifyInstance,
  args: { tenantId: string; period: EngagementPeriod },
): Promise<{ period: EngagementPeriod; from: Date; customers: CustomerVisitSummary[] }> {
  const from = new Date(Date.now() - ENGAGEMENT_WINDOW_DAYS[args.period] * 86_400_000);

  const [users, visitGroups, tokenGroups] = await Promise.all([
    app.prisma.consumerUser.findMany({
      where: { tenantId: args.tenantId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        createdAt: true,
      },
    }),
    app.prisma.loyaltyTransaction.groupBy({
      by: ["userId"],
      where: {
        tenantId: args.tenantId,
        type: "EARN",
        createdAt: { gte: from },
        userId: { not: null },
      },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    app.prisma.pushToken.groupBy({
      by: ["userId"],
      where: { tenantId: args.tenantId, userId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const visitsByUser = new Map(
    visitGroups.flatMap((g) =>
      g.userId
        ? [[g.userId, { visits: g._count._all, lastVisitAt: g._max.createdAt }] as const]
        : [],
    ),
  );
  const reachableUsers = new Set(
    tokenGroups.flatMap((g) => (g.userId ? [g.userId] : [])),
  );

  const customers: CustomerVisitSummary[] = users.map((u) => {
    const stats = visitsByUser.get(u.id);
    return {
      userId: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      username: u.username,
      visits: stats?.visits ?? 0,
      lastVisitAt: stats?.lastVisitAt ?? null,
      joinedAt: u.createdAt,
      reachable: reachableUsers.has(u.id),
    };
  });

  // Most visits first. Ties broken by name so the order is stable between
  // requests rather than dependent on however Postgres returned the rows --
  // an unstable list visibly reshuffles on every refresh.
  customers.sort(
    (a, b) =>
      b.visits - a.visits ||
      a.firstName.localeCompare(b.firstName) ||
      a.lastName.localeCompare(b.lastName),
  );

  return { period: args.period, from, customers };
}

export type RedeemRewardResult =
  | { ok: true }
  | { ok: false; errorCode: "NOT_FOUND" | "ALREADY_REDEEMED" };

export async function redeemLoyaltyReward(
  app: FastifyInstance,
  args: { tenantId: string; rewardId: string; branchId: string },
): Promise<RedeemRewardResult> {
  const reward = await app.prisma.loyaltyReward.findFirst({
    where: { id: args.rewardId, tenantId: args.tenantId },
  });

  if (!reward) {
    return { ok: false, errorCode: "NOT_FOUND" };
  }
  if (reward.status === "REDEEMED") {
    return { ok: false, errorCode: "ALREADY_REDEEMED" };
  }

  // updateMany so the tenant filter is part of the write, and gated on
  // status so two staff members scanning the same voucher at once cannot
  // both mark it redeemed -- Postgres decides the winner.
  const { count } = await app.prisma.loyaltyReward.updateMany({
    where: { id: args.rewardId, tenantId: args.tenantId, status: "ACTIVE" },
    data: {
      status: "REDEEMED",
      redeemedAt: new Date(),
      redeemedByBranchId: args.branchId,
    },
  });

  if (count === 0) {
    return { ok: false, errorCode: "ALREADY_REDEEMED" };
  }

  return { ok: true };
}
