import { LoyaltyRedeemSchema } from "@funfsterne/shared-types";
import type { FastifyInstance } from "fastify";
import { redeemLoyaltyPoints } from "../services/loyalty.service.js";
import { consumerAuthMiddleware } from "../middleware/consumer-auth.js";
import { serializePrisma } from "../serializers.js";

export async function loyaltyRoutes(app: FastifyInstance) {
  app.addHook("preHandler", consumerAuthMiddleware);

  app.get("/me", async (request) => {
    const userId = request.consumer!.sub;

    const [user, transactions, rewards] = await Promise.all([
      app.prisma.consumerUser.findUniqueOrThrow({
        where: { id: userId },
        select: { loyaltyPoints: true },
      }),
      app.prisma.loyaltyTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { branch: { select: { name: true } } },
      }),
      app.prisma.loyaltyReward.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      balance: user.loyaltyPoints,
      transactions: serializePrisma(transactions),
      rewards: serializePrisma(rewards),
    };
  });

  app.post("/redeem", async (request, reply) => {
    const parse = LoyaltyRedeemSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid redeem payload" });
    }

    const userId = request.consumer!.sub;
    const result = await redeemLoyaltyPoints(app, {
      userId,
      points: parse.data.points,
    });

    if (!result.ok) {
      return reply
        .status(400)
        .send({ error: "Not enough points", errorCode: result.errorCode });
    }

    return {
      reward: result.reward,
      balance: result.balance,
    };
  });
}
