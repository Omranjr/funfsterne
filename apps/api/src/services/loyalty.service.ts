import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { POINTS_PER_VISIT, POINTS_PER_EURO } from "@funfsterne/shared-types";

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
  args: { userId: string; branchId: string },
): Promise<AwardPointsResult> {
  const user = await app.prisma.consumerUser.findUnique({
    where: { id: args.userId },
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
  //   where: { userId: args.userId, type: "EARN" },
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
        userId: args.userId,
        branchId: args.branchId,
        points: POINTS_PER_VISIT,
        type: "EARN",
      },
    }),
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
  args: { userId: string; points: number },
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
      where: { id: args.userId, loyaltyPoints: { gte: args.points } },
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
        data: { userId: args.userId, points: -args.points, type: "REDEEM" },
      }),
    ]);

    const reward = await tx.loyaltyReward.create({
      data: { userId: args.userId, eurosValue, pointsSpent: args.points },
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
  args: { granularity: VisitStatsGranularity; userId?: string },
): Promise<VisitStatsResult> {
  const from = new Date(Date.now() - GRANULARITY_WINDOW_DAYS[args.granularity] * 86_400_000);

  const transactions = await app.prisma.loyaltyTransaction.findMany({
    where: {
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

export type RedeemRewardResult =
  | { ok: true }
  | { ok: false; errorCode: "NOT_FOUND" | "ALREADY_REDEEMED" };

export async function redeemLoyaltyReward(
  app: FastifyInstance,
  args: { rewardId: string; branchId: string },
): Promise<RedeemRewardResult> {
  const reward = await app.prisma.loyaltyReward.findUnique({
    where: { id: args.rewardId },
  });

  if (!reward) {
    return { ok: false, errorCode: "NOT_FOUND" };
  }
  if (reward.status === "REDEEMED") {
    return { ok: false, errorCode: "ALREADY_REDEEMED" };
  }

  await app.prisma.loyaltyReward.update({
    where: { id: args.rewardId },
    data: {
      status: "REDEEMED",
      redeemedAt: new Date(),
      redeemedByBranchId: args.branchId,
    },
  });

  return { ok: true };
}
