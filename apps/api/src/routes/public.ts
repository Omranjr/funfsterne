import {
  ProductCategorySchema,
  ProductSchema,
  RegisterPushTokenSchema,
} from "@funfsterne/shared-types";
import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { serializePrisma } from "../serializers.js";
import { consumerAuthMiddleware } from "../middleware/consumer-auth.js";

const ProductQuerySchema = z.object({
  category: ProductCategorySchema.optional(),
  branchId: z.string().optional(),
});

const RedeemDiscountCodeSchema = z.object({
  deviceId: z.string().min(1),
  branchId: z.string().optional(),
});

export async function publicRoutes(app: FastifyInstance) {
  app.get("/branches", async () => {
    return app.prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  });

  // Returns the admin-set category images as an array. The mobile app renders
  // a fallback for any category that isn't in the result (or whose imageUrl is
  // null/empty), so the response is intentionally the raw "what's in the DB"
  // rather than always 5 entries.
  app.get("/category-images", async () => {
    const images = await app.prisma.categoryImage.findMany({
      orderBy: { category: "asc" },
    });
    return serializePrisma(images);
  });

  app.get("/products", async (request) => {
    const query = ProductQuerySchema.safeParse(request.query);
    if (!query.success) {
      return { error: "Invalid query parameters" };
    }

    const { category, branchId } = query.data;

    const products = await app.prisma.product.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
        ...(branchId
          ? { availabilities: { some: { branchId, inStock: true } } }
          : {}),
      },
      include: {
        availabilities: branchId ? { where: { branchId } } : false,
      },
      orderBy: { name: "asc" },
    });

    return serializePrisma(products);
  });

  app.get("/products/:id", async (request, reply) => {
    const parse = ProductSchema.shape.id.safeParse(
      (request.params as { id: string }).id,
    );
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid product id" });
    }

    const product = await app.prisma.product.findUnique({
      where: { id: parse.data, isActive: true },
      include: { availabilities: { include: { branch: true } } },
    });

    if (!product) {
      return reply.status(404).send({ error: "Product not found" });
    }

    return serializePrisma(product);
  });

  app.post(
    "/push-tokens",
    { preHandler: consumerAuthMiddleware },
    async (request, reply) => {
      const parse = RegisterPushTokenSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({ error: "Invalid push token payload" });
      }

      const { deviceId, token, platform } = parse.data;
      // userId always comes from the verified JWT, never the request body --
      // a client-supplied userId would let anyone attribute a push token to
      // someone else's account.
      const userId = request.consumer!.sub;

      const pushToken = await app.prisma.pushToken.upsert({
        where: { token },
        create: { deviceId, userId, token, platform },
        update: { deviceId, userId, platform },
      });

      return pushToken;
    },
  );

  app.get("/discount-codes/active", async () => {
    const now = new Date();

    const codes = await app.prisma.discountCode.findMany({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: { scopeBranch: true },
      orderBy: { code: "asc" },
    });

    return serializePrisma(codes);
  });

  app.post(
    "/discount-codes/:code/redeem",
    { preHandler: consumerAuthMiddleware },
    async (request, reply) => {
      const code = (request.params as { code: string }).code;
      const parse = RedeemDiscountCodeSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({ error: "Invalid redemption payload" });
      }

      const { deviceId, branchId } = parse.data;
      // Same reasoning as push-tokens: userId comes from the verified JWT,
      // never the request body.
      const userId = request.consumer!.sub;

      const discount = await app.prisma.discountCode.findUnique({
        where: { code },
      });

      if (!discount) {
        return reply.status(404).send({ errorCode: "NOT_FOUND", error: "Discount code not found" });
      }

      if (!discount.isActive) {
        return reply.status(400).send({ errorCode: "INACTIVE", error: "Discount code is inactive" });
      }

      if (discount.expiresAt && discount.expiresAt < new Date()) {
        return reply.status(400).send({ errorCode: "EXPIRED", error: "Discount code expired" });
      }

      if (
        discount.maxRedemptions !== null &&
        discount.currentRedemptions >= discount.maxRedemptions
      ) {
        return reply.status(400).send({ errorCode: "MAX_REDEMPTIONS_REACHED", error: "Discount code fully redeemed" });
      }

      const [existingByDevice, existingByUser] = await Promise.all([
        app.prisma.discountCodeRedemption.findUnique({
          where: {
            deviceId_discountCodeId: { deviceId, discountCodeId: discount.id },
          },
        }),
        app.prisma.discountCodeRedemption.findUnique({
          where: {
            userId_discountCodeId: { userId, discountCodeId: discount.id },
          },
        }),
      ]);

      if (existingByDevice) {
        return reply.status(400).send({ errorCode: "ALREADY_REDEEMED_BY_DEVICE", error: "Discount code already redeemed on this device" });
      }

      if (existingByUser) {
        return reply.status(400).send({ errorCode: "ALREADY_REDEEMED_BY_USER", error: "Discount code already redeemed on this account" });
      }

      // The checks above are a fast path for good error messages; they are
      // not what enforces the limits. Two requests for the last remaining
      // use of a code can both pass a plain read, so the increment itself
      // is gated on the cap and Postgres decides the winner at write time.
      // (Per-user and per-device limits are enforced by the unique indexes
      // on the redemption row, which is why P2002 is a "someone else got
      // there first" answer rather than a 500.)
      const maxRedemptions = discount.maxRedemptions;

      const result = await app.prisma
        .$transaction(async (tx) => {
          const { count } = await tx.discountCode.updateMany({
            where: {
              id: discount.id,
              isActive: true,
              ...(maxRedemptions !== null
                ? { currentRedemptions: { lt: maxRedemptions } }
                : {}),
            },
            data: { currentRedemptions: { increment: 1 } },
          });

          if (count === 0) return null;

          const [updated, redemption] = await Promise.all([
            tx.discountCode.findUniqueOrThrow({ where: { id: discount.id } }),
            tx.discountCodeRedemption.create({
              data: {
                deviceId,
                userId,
                branchId: branchId ?? null,
                discountCodeId: discount.id,
              },
            }),
          ]);

          return { updated, redemption };
        })
        .catch((err: unknown) => {
          if (
            typeof err === "object" &&
            err !== null &&
            (err as { code?: string }).code === "P2002"
          ) {
            return "DUPLICATE" as const;
          }
          throw err;
        });

      if (result === "DUPLICATE") {
        return reply.status(400).send({
          errorCode: "ALREADY_REDEEMED_BY_USER",
          error: "Discount code already redeemed on this account",
        });
      }

      if (!result) {
        return reply.status(400).send({
          errorCode: "MAX_REDEMPTIONS_REACHED",
          error: "Discount code fully redeemed",
        });
      }

      return {
        success: true,
        discount: serializePrisma(result.updated),
        redemption: serializePrisma(result.redemption),
      };
    },
  );
}
