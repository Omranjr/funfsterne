import {
  ProductCategorySchema,
  ProductSchema,
  RegisterPushTokenSchema,
} from "@funfsterne/shared-types";
import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { serializePrisma } from "../serializers.js";

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

  app.post("/push-tokens", async (request, reply) => {
    const parse = RegisterPushTokenSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid push token payload" });
    }

    const { deviceId, token, platform } = parse.data;

    const pushToken = await app.prisma.pushToken.upsert({
      where: { token },
      create: { deviceId, token, platform },
      update: { deviceId, platform },
    });

    return pushToken;
  });

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

  app.post("/discount-codes/:code/redeem", async (request, reply) => {
    const code = (request.params as { code: string }).code;
    const parse = RedeemDiscountCodeSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid redemption payload" });
    }

    const { deviceId, branchId } = parse.data;

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

    const existingRedemption = await app.prisma.discountCodeRedemption.findUnique({
      where: {
        deviceId_discountCodeId: {
          deviceId,
          discountCodeId: discount.id,
        },
      },
    });

    if (existingRedemption) {
      return reply.status(400).send({ errorCode: "ALREADY_REDEEMED_BY_DEVICE", error: "Discount code already redeemed on this device" });
    }

    const [updated, redemption] = await app.prisma.$transaction([
      app.prisma.discountCode.update({
        where: { id: discount.id },
        data: { currentRedemptions: { increment: 1 } },
      }),
      app.prisma.discountCodeRedemption.create({
        data: {
          deviceId,
          branchId: branchId ?? null,
          discountCodeId: discount.id,
        },
      }),
    ]);

    return {
      success: true,
      discount: serializePrisma(updated),
      redemption: serializePrisma(redemption),
    };
  });
}
