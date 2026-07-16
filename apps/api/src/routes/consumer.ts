import { RegisterPushTokenSchema } from "@funfsterne/shared-types";
import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { consumerAuthMiddleware } from "../middleware/consumer-auth.js";

const RedeemBodySchema = z.object({
  code: z.string().min(1),
});

export async function consumerRoutes(app: FastifyInstance) {
  app.addHook("preHandler", consumerAuthMiddleware);

  app.get("/me", async (request) => {
    return app.prisma.user.findUnique({
      where: { id: request.consumer!.userId },
      include: { preferredBranch: true },
    });
  });

  app.post("/me/push-token", async (request, reply) => {
    const parse = RegisterPushTokenSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid push token payload" });
    }

    const { token, platform } = parse.data;
    const userId = request.consumer!.userId;

    const pushToken = await app.prisma.pushToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform },
    });

    return pushToken;
  });

  app.get("/me/discount-codes", async (request) => {
    const userId = request.consumer!.userId;

    const user = await app.prisma.user.findUnique({
      where: { id: userId },
      include: { preferredBranch: true },
    });

    const codes = await app.prisma.discountCode.findMany({
      where: {
        isActive: true,
        OR: [
          { scopeBranchId: null },
          { scopeBranchId: user?.preferredBranchId ?? undefined },
        ],
      },
      include: { scopeBranch: true },
      orderBy: { code: "asc" },
    });

    const redeemedIds = new Set(
      (
        await app.prisma.discountCodeRedemption.findMany({
          where: { userId },
          select: { discountCodeId: true },
        })
      ).map((r) => r.discountCodeId),
    );

    return codes.map((code) => ({
      ...code,
      redeemed: redeemedIds.has(code.id),
    }));
  });

  app.post("/discount-codes/redeem", async (request, reply) => {
    const parse = RedeemBodySchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid payload" });
    }

    const { code } = parse.data;
    const consumer = request.consumer!;

    const discount = await app.prisma.discountCode.findUnique({
      where: { code },
    });

    if (!discount || !discount.isActive) {
      return reply.status(404).send({ error: "Discount code not found" });
    }

    if (discount.expiresAt && discount.expiresAt < new Date()) {
      return reply.status(400).send({ error: "Discount code expired" });
    }

    if (
      discount.maxRedemptions !== null &&
      discount.currentRedemptions >= discount.maxRedemptions
    ) {
      return reply.status(400).send({ error: "Discount code fully redeemed" });
    }

    if (
      discount.scopeBranchId &&
      discount.scopeBranchId !== consumer.preferredBranchId
    ) {
      return reply
        .status(400)
        .send({ error: "Discount code not valid for your preferred branch" });
    }

    const existingRedemption = await app.prisma.discountCodeRedemption.findUnique({
      where: {
        userId_discountCodeId: {
          userId: consumer.userId,
          discountCodeId: discount.id,
        },
      },
    });

    if (existingRedemption) {
      return reply
        .status(400)
        .send({ error: "Discount code already redeemed by this user" });
    }

    const [updated, redemption] = await app.prisma.$transaction([
      app.prisma.discountCode.update({
        where: { id: discount.id },
        data: { currentRedemptions: { increment: 1 } },
      }),
      app.prisma.discountCodeRedemption.create({
        data: {
          userId: consumer.userId,
          discountCodeId: discount.id,
        },
      }),
    ]);

    return { success: true, discount: updated, redemption };
  });
}
