import {
  BranchSchema,
  CreateBranchSchema,
  CreateProductSchema,
  CreateDiscountCodeSchema,
  ProductCategorySchema,
  ProductSchema,
  SendNotificationSchema,
  UpdateBranchSchema,
  UpdateProductSchema,
  UpsertCategoryImageSchema,
  UpsertProductBranchAvailabilitySchema,
  AdminResetConsumerPasswordSchema,
  LoyaltyScanSchema,
  LoyaltyRewardRedeemSchema,
} from "@funfsterne/shared-types";
import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { adminAuthMiddleware } from "../middleware/admin-auth.js";
import { sendPushNotifications } from "../services/push.service.js";
import { resetConsumerPassword } from "../services/consumer-auth.service.js";
import {
  awardLoyaltyPoints,
  redeemLoyaltyReward,
  getLoyaltyVisitStats,
  getCustomerVisitSummary,
  type VisitStatsGranularity,
  type EngagementPeriod,
} from "../services/loyalty.service.js";
import { runRetentionCleanup } from "../services/retention.service.js";
import {
  checkPendingReceipts,
  encodeTicket,
} from "../services/notification-delivery.service.js";
import { serializePrisma } from "../serializers.js";

export async function adminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", adminAuthMiddleware);

  app.get("/me", async (request) => {
    return request.admin;
  });

  // ── Branches ─────────────────────────────────────────────────────────────

  app.get("/branches", async () => {
    const branches = await app.prisma.branch.findMany({ orderBy: { name: "asc" } });
    return serializePrisma(branches);
  });

  app.post("/branches", async (request, reply) => {
    const parse = CreateBranchSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid branch payload" });
    }
    return serializePrisma(
      await app.prisma.branch.create({ data: parse.data }),
    );
  });

  app.get("/branches/:id", async (request, reply) => {
    const id = BranchSchema.shape.id.parse(
      (request.params as { id: string }).id,
    );
    const branch = await app.prisma.branch.findUnique({ where: { id } });
    if (!branch) return reply.status(404).send({ error: "Branch not found" });
    return serializePrisma(branch);
  });

  app.patch("/branches/:id", async (request, reply) => {
    const id = BranchSchema.shape.id.parse(
      (request.params as { id: string }).id,
    );
    const parse = UpdateBranchSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid branch payload" });
    }
    return serializePrisma(
      await app.prisma.branch.update({ where: { id }, data: parse.data }),
    );
  });

  app.delete("/branches/:id", async (request, reply) => {
    const id = BranchSchema.shape.id.parse(
      (request.params as { id: string }).id,
    );

    // Availability rows cascade with the branch. Since "no availability row"
    // means "not carried here", deleting a branch quietly erases which
    // products it stocked -- unrecoverable, and invisible until someone
    // reopens the shop and finds the catalogue empty.
    //
    // Deactivating hides a branch from customers (the public endpoint
    // filters on isActive) while keeping all of that intact.
    const stocked = await app.prisma.productBranchAvailability.count({
      where: { branchId: id },
    });
    if (stocked > 0) {
      return reply.status(409).send({
        errorCode: "BRANCH_IN_USE",
        error:
          "This branch still has product availability set. Deactivate it instead -- deleting would erase which products it stocks.",
        products: stocked,
      });
    }

    await app.prisma.branch.delete({ where: { id } });
    return reply.status(204).send();
  });

  // ── Products ─────────────────────────────────────────────────────────────

  app.get("/products", async () => {
    const products = await app.prisma.product.findMany({
      orderBy: { name: "asc" },
      include: { availabilities: { include: { branch: true } } },
    });
    return serializePrisma(products);
  });

  app.post("/products", async (request, reply) => {
    const parse = CreateProductSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid product payload" });
    }
    return serializePrisma(
      await app.prisma.product.create({ data: parse.data }),
    );
  });

  app.get("/products/:id", async (request, reply) => {
    const id = ProductSchema.shape.id.parse(
      (request.params as { id: string }).id,
    );
    const product = await app.prisma.product.findUnique({
      where: { id },
      include: { availabilities: { include: { branch: true } } },
    });
    if (!product) return reply.status(404).send({ error: "Product not found" });
    return serializePrisma(product);
  });

  app.patch("/products/:id", async (request, reply) => {
    const id = ProductSchema.shape.id.parse(
      (request.params as { id: string }).id,
    );
    const parse = UpdateProductSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid product payload" });
    }
    return serializePrisma(
      await app.prisma.product.update({ where: { id }, data: parse.data }),
    );
  });

  app.delete("/products/:id", async (request, reply) => {
    const id = ProductSchema.shape.id.parse(
      (request.params as { id: string }).id,
    );
    await app.prisma.product.delete({ where: { id } });
    return reply.status(204).send();
  });

  // ── Product availability per branch ──────────────────────────────────────

  app.put("/products/:id/availability", async (request, reply) => {
    const productId = ProductSchema.shape.id.parse(
      (request.params as { id: string }).id,
    );
    const parse = UpsertProductBranchAvailabilitySchema.safeParse(request.body);
    if (!parse.success) {
      return reply
        .status(400)
        .send({ error: "Invalid availability payload" });
    }

    const { branchId, inStock, priceOverride } = parse.data;

    const product = await app.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      return reply.status(404).send({ error: "Product not found" });
    }

    const branch = await app.prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!branch) {
      return reply.status(404).send({ error: "Branch not found" });
    }

    return serializePrisma(
      await app.prisma.productBranchAvailability.upsert({
        where: { productId_branchId: { productId, branchId } },
        create: { productId, branchId, inStock, priceOverride },
        update: { inStock, priceOverride },
      }),
    );
  });

  // ── Discount codes ───────────────────────────────────────────────────────

  app.get("/discount-codes", async () => {
    const codes = await app.prisma.discountCode.findMany({
      orderBy: { code: "asc" },
      include: { scopeBranch: true },
    });
    return serializePrisma(codes);
  });

  app.post("/discount-codes", async (request, reply) => {
    const parse = CreateDiscountCodeSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid discount code payload" });
    }
    return serializePrisma(
      await app.prisma.discountCode.create({ data: parse.data }),
    );
  });

  app.get("/discount-codes/:id", async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const discount = await app.prisma.discountCode.findUnique({
      where: { id },
      include: {
        scopeBranch: true,
        // Counted, not listed. The rows carry `deviceId` and `userId` for
        // every customer who used the code, and nothing needs them here --
        // the redemption report has its own endpoint that returns the
        // branch and timestamp without the identifiers.
        _count: { select: { redemptions: true } },
      },
    });
    if (!discount) {
      return reply.status(404).send({ error: "Discount code not found" });
    }
    return serializePrisma(discount);
  });

  app.patch("/discount-codes/:id", async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const parse = CreateDiscountCodeSchema.partial().safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid discount code payload" });
    }
    return serializePrisma(
      await app.prisma.discountCode.update({ where: { id }, data: parse.data }),
    );
  });

  app.delete("/discount-codes/:id", async (request, reply) => {
    const id = (request.params as { id: string }).id;

    // Redemption rows cascade with the code, and those rows are the only
    // thing enforcing one claim per customer. Delete a used code, recreate
    // it under the same name, and everyone who already claimed it can claim
    // it again -- real money, given away silently.
    //
    // Switching a code off (`isActive: false`) achieves what deleting is
    // usually reaching for: customers stop seeing it, and the history that
    // protects the offer survives.
    const used = await app.prisma.discountCodeRedemption.count({
      where: { discountCodeId: id },
    });
    if (used > 0) {
      return reply.status(409).send({
        errorCode: "CODE_HAS_REDEMPTIONS",
        error:
          "This code has been redeemed and cannot be deleted. Deactivate it instead so customers stop seeing it while its history is kept.",
        redemptions: used,
      });
    }

    await app.prisma.discountCode.delete({ where: { id } });
    return reply.status(204).send();
  });

  // ── Category images ─────────────────────────────────────────────────────

  // Returns one entry per fixed ProductCategory, even if no image has been
  // set yet. The mobile app's GET /public/category-images returns only the
  // rows that exist; this admin endpoint synthesises the full 5-row list so
  // the dashboard can render an upload slot for every category.
  app.get("/category-images", async () => {
    const existing = await app.prisma.categoryImage.findMany({
      orderBy: { category: "asc" },
    });
    const byCategory = new Map(existing.map((row) => [row.category, row]));
    const all = ProductCategorySchema.options.map((category) => {
      const row = byCategory.get(category);
      return row
        ? {
            category: row.category,
            imageUrl: row.imageUrl,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          }
        : {
            category,
            imageUrl: null,
            createdAt: null,
            updatedAt: null,
          };
    });
    return serializePrisma(all);
  });

  // Upsert the image URL for a single fixed category. The category comes from
  // the route param (validated against the enum); only the URL is in the body.
  // An empty-string imageUrl is treated as a "clear" — the row is deleted so
  // the public endpoint returns that category as missing (and the mobile app
  // falls back to its placeholder design).
  app.put("/category-images/:category", async (request, reply) => {
    const categoryParse = ProductCategorySchema.safeParse(
      (request.params as { category: string }).category,
    );
    if (!categoryParse.success) {
      return reply.status(400).send({ error: "Invalid category" });
    }

    const bodyParse = UpsertCategoryImageSchema.safeParse(request.body);
    if (!bodyParse.success) {
      return reply.status(400).send({ error: "Invalid category image payload" });
    }

    const category = categoryParse.data;
    const { imageUrl } = bodyParse.data;

    if (imageUrl === "") {
      await app.prisma.categoryImage.deleteMany({ where: { category } });
      return { category, imageUrl: null, deleted: true };
    }

    const row = await app.prisma.categoryImage.upsert({
      where: { category },
      create: { category, imageUrl },
      update: { imageUrl },
    });

    return serializePrisma(row);
  });

  // Delete the image for a single fixed category. Returns 204 whether or not
  // a row existed, so the admin UI can treat it as an idempotent operation.
  app.delete("/category-images/:category", async (request, reply) => {
    const categoryParse = ProductCategorySchema.safeParse(
      (request.params as { category: string }).category,
    );
    if (!categoryParse.success) {
      return reply.status(400).send({ error: "Invalid category" });
    }

    await app.prisma.categoryImage.deleteMany({
      where: { category: categoryParse.data },
    });
    return reply.status(204).send();
  });

  // ── Notifications ────────────────────────────────────────────────────────

  app.get("/notifications", async () => {
    const notifications = await app.prisma.notification.findMany({
      orderBy: { sentAt: "desc" },
    });
    return serializePrisma(notifications);
  });

  // Lets the admin see how many devices a broadcast will actually reach
  // before confirming send, rather than sending blind.
  app.get("/notifications/recipient-count", async () => {
    const count = await app.prisma.pushToken.count();
    return { count };
  });

  app.post("/notifications/send", async (request, reply) => {
    const parse = SendNotificationSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid notification payload" });
    }

    const { title, body, discountCodeId, target, userIds } = parse.data;

    if (discountCodeId) {
      const discount = await app.prisma.discountCode.findUnique({
        where: { id: discountCodeId },
      });
      if (!discount) {
        return reply.status(404).send({ error: "Discount code not found" });
      }
    }

    // A targeted send resolves to the push tokens owned by the chosen
    // customers. Customers with no registered token simply contribute none,
    // which is why the response reports `recipients` (devices actually
    // messaged) separately from how many customers were picked.
    const pushTokens =
      target === "users"
        ? await app.prisma.pushToken.findMany({
            where: { userId: { in: userIds ?? [] } },
          })
        : await app.prisma.pushToken.findMany();

    const tokens = pushTokens.map((pt) => pt.token);
    const { queued, failed, tickets, transportError } =
      await sendPushNotifications(
        tokens,
        title,
        body,
        discountCodeId ? { discountCodeId } : undefined,
      );

    const notification = await app.prisma.notification.create({
      data: {
        title,
        body,
        discountCodeId,
        audience: target === "users" ? "SEGMENT" : "ALL",
        sentAt: new Date(),
        // Queued, not delivered -- `deliveredCount` is filled in later by
        // the receipt check.
        sentToCount: queued.length,
        ticketIds: tickets.map(encodeTicket),
        // A transport failure is knowable immediately and is almost always
        // a misconfiguration (bad EXPO_ACCESS_TOKEN), so record it now
        // rather than waiting for a receipt that will never come.
        deliveryErrors: transportError ? ["TransportError"] : [],
      },
    });

    return {
      notification: serializePrisma(notification),
      // `queued` is deliberately not called `sent`: Expo accepting a message
      // says nothing about Apple or Google delivering it.
      queued: queued.length,
      failed: failed.length,
      transportError,
    };
  });

  app.get("/discount-codes/:id/redemptions", async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const discount = await app.prisma.discountCode.findUnique({
      where: { id },
    });
    if (!discount) {
      return reply.status(404).send({ error: "Discount code not found" });
    }

    const redemptions = await app.prisma.discountCodeRedemption.findMany({
      where: { discountCodeId: id },
      include: { branch: true },
      orderBy: { redeemedAt: "desc" },
    });

    return {
      discount: serializePrisma(discount),
      redemptions: serializePrisma(redemptions),
    };
  });

  // ── Data retention ───────────────────────────────────────────────────────
  // The sweep runs on a timer; these exist so it can be inspected and proven
  // rather than taken on trust -- and so a pass can be forced without waiting
  // for the next tick.

  // Dry run: reports exactly what a real pass would touch, and writes nothing.
  app.get("/retention/preview", async () => {
    const report = await runRetentionCleanup(app, { dryRun: true });
    return { ...report, cutoff: report.cutoff.toISOString() };
  });

  // Forces the receipt check instead of waiting for the next tick. Receipts
  // are only meaningful ~15 minutes after a send, so this mostly matters when
  // debugging a delivery problem.
  app.post("/notifications/check-delivery", async () => {
    return checkPendingReceipts(app);
  });

  app.post("/retention/run", async () => {
    const report = await runRetentionCleanup(app);
    return { ...report, cutoff: report.cutoff.toISOString() };
  });

  // ── Consumer users ───────────────────────────────────────────────────────
  // Read + password-reset only. Full visit-history analytics is a separate,
  // later feature -- this is deliberately just enough to support the
  // admin-assisted "forgot password" flow (the app collects no email/phone,
  // so there's no self-service reset path).

  app.get("/consumer-users", async () => {
    const users = await app.prisma.consumerUser.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        createdAt: true,
        updatedAt: true,
        // passwordHash intentionally excluded
      },
    });
    return serializePrisma(users);
  });

  app.patch(
    "/consumer-users/:id/reset-password",
    async (request, reply) => {
      const id = (request.params as { id: string }).id;
      const parse = AdminResetConsumerPasswordSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({ error: "Invalid password payload" });
      }

      const user = await app.prisma.consumerUser.findUnique({ where: { id } });
      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      await resetConsumerPassword(app, id, parse.data.newPassword);
      return reply.status(204).send();
    },
  );

  // ── Loyalty program ──────────────────────────────────────────────────────

  app.post("/loyalty/scan", async (request, reply) => {
    const parse = LoyaltyScanSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid scan payload" });
    }

    const result = await awardLoyaltyPoints(app, parse.data);
    if (!result.ok) {
      const status = result.errorCode === "USER_NOT_FOUND" ? 404 : 409;
      return reply
        .status(status)
        .send({ error: "Could not award points", errorCode: result.errorCode });
    }

    const [user, activeRewards] = await Promise.all([
      app.prisma.consumerUser.findUnique({
        where: { id: parse.data.userId },
        select: { firstName: true, lastName: true },
      }),
      app.prisma.loyaltyReward.findMany({
        where: { userId: parse.data.userId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      customer: user,
      balance: result.balance,
      activeRewards: serializePrisma(activeRewards),
    };
  });

  app.post(
    "/loyalty/rewards/:id/redeem",
    async (request, reply) => {
      const id = (request.params as { id: string }).id;
      const parse = LoyaltyRewardRedeemSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({ error: "Invalid redeem payload" });
      }

      const result = await redeemLoyaltyReward(app, {
        rewardId: id,
        branchId: parse.data.branchId,
      });

      if (!result.ok) {
        const status = result.errorCode === "NOT_FOUND" ? 404 : 409;
        return reply
          .status(status)
          .send({ error: "Could not redeem reward", errorCode: result.errorCode });
      }

      return reply.status(204).send();
    },
  );

  app.get("/loyalty/stats", async (request) => {
    const query = request.query as { granularity?: string; userId?: string };
    const granularity: VisitStatsGranularity =
      query.granularity === "month" || query.granularity === "year"
        ? query.granularity
        : "day";

    return getLoyaltyVisitStats(app, {
      granularity,
      userId: query.userId || undefined,
    });
  });

  // Powers both the Analytics engagement card and the notification
  // targeting picker -- one shape serving both keeps "who the owner sees"
  // and "who actually gets the push" from drifting apart.
  app.get("/loyalty/customer-visits", async (request) => {
    const query = request.query as { period?: string };
    const period: EngagementPeriod =
      query.period === "halfYear" || query.period === "year" ? query.period : "month";

    return serializePrisma(await getCustomerVisitSummary(app, { period }));
  });
}
