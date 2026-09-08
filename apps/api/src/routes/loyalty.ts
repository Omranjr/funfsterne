import { LoyaltyRedeemSchema } from "@funfsterne/shared-types";
import type { FastifyInstance } from "fastify";
import { redeemLoyaltyPoints } from "../services/loyalty.service.js";
import { consumerAuthMiddleware } from "../middleware/consumer-auth.js";
import { serializePrisma } from "../serializers.js";
import { resolveTenant, tenantId } from "../middleware/tenant.js";

export async function loyaltyRoutes(app: FastifyInstance) {
  // Order matters: resolveTenant must run first so consumerAuthMiddleware
  // can check the token's tenant claim against it.
  app.addHook("preHandler", resolveTenant);
  app.addHook("preHandler", consumerAuthMiddleware);

  app.get("/me", async (request, reply) => {
    const userId = request.consumer!.sub;
    const tid = tenantId(request);

    const user = await app.prisma.consumerUser.findFirst({
      where: { id: userId, tenantId: tid },
      select: { loyaltyPoints: true },
    });
    // The token verified and its tenant claim matched, so a missing row here
    // means the account was deleted after the token was issued. 404 tells
    // the app to clear the token, which is what its unauthorized handler
    // already does for /public/auth/me.
    if (!user) {
      return reply.status(404).send({ error: "Account no longer exists" });
    }

    const [transactions, rewards] = await Promise.all([
      app.prisma.loyaltyTransaction.findMany({
        where: { userId, tenantId: tid },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { branch: { select: { name: true } } },
      }),
      app.prisma.loyaltyReward.findMany({
        where: { userId, tenantId: tid },
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
      tenantId: tenantId(request),
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
