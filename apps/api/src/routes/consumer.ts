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

    const updated = await app.prisma.discountCode.update({
      where: { id: discount.id },
      data: { currentRedemptions: { increment: 1 } },
    });

    return { success: true, discount: updated };
  });
}
