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

  const lastEarn = await app.prisma.loyaltyTransaction.findFirst({
    where: { userId: args.userId, type: "EARN" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const now = new Date();
  if (lastEarn && businessDateKey(lastEarn.createdAt) === businessDateKey(now)) {
    return { ok: false, errorCode: "ALREADY_SCANNED_TODAY" };
  }

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
