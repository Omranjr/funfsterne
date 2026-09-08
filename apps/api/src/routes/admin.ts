import {
  BranchSchema,
  CreateBranchSchema,
  CreateProductSchema,
  CreateDiscountCodeSchema,
  CreateNotificationSchema,
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
import { serializePrisma } from "../serializers.js";
import { resolveTenant, tenantId } from "../middleware/tenant.js";

export async function adminRoutes(app: FastifyInstance) {
  // Order matters: resolveTenant runs first so adminAuthMiddleware can check
  // the token's tenant claim against the resolved tenant. Both are plugin
  // hooks rather than per-route preHandlers, which is what makes it
  // impossible to add a route to this file and forget either one.
  app.addHook("preHandler", resolveTenant);
  app.addHook("preHandler", adminAuthMiddleware);

  app.get("/me", async (request) => {
    // The tenant is included so the dashboard can show which shop the
    // session is signed into -- with one email able to administer several,
    // the email alone no longer answers that.
    return { ...request.admin, tenant: request.tenant };
  });

  // ── Branches ─────────────────────────────────────────────────────────────

  app.get("/branches", async (request) => {
    const branches = await app.prisma.branch.findMany({
      where: { tenantId: tenantId(request) },
      orderBy: { name: "asc" },
    });
    return serializePrisma(branches);
  });

  app.post("/branches", async (request, reply) => {
    const parse = CreateBranchSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid branch payload" });
    }
    return serializePrisma(
      await app.prisma.branch.create({
        data: { ...parse.data, tenantId: tenantId(request) },
      }),
    );
  });

  app.get("/branches/:id", async (request, reply) => {
    const id = BranchSchema.shape.id.parse(
      (request.params as { id: string }).id,
    );
    const branch = await app.prisma.branch.findFirst({
      where: { id, tenantId: tenantId(request) },
    });
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
    // updateMany/deleteMany rather than update/delete throughout this file:
    // they take a full `where`, so the tenant filter is enforced by the
    // write itself. `update({ where: { id } })` would happily modify another
    // tenant's row if an id were ever guessed or leaked.
    const { count } = await app.prisma.branch.updateMany({
      where: { id, tenantId: tenantId(request) },
      data: parse.data,
    });
    if (count === 0) return reply.status(404).send({ error: "Branch not found" });
    // Safe to read back by id alone: the updateMany above matched exactly
    // this tenant's row, so ownership is already proven for this request.
    return serializePrisma(
      await app.prisma.branch.findUniqueOrThrow({ where: { id } }),
    );
  });

  app.delete("/branches/:id", async (request, reply) => {
    const id = BranchSchema.shape.id.parse(
      (request.params as { id: string }).id,
    );
    const { count } = await app.prisma.branch.deleteMany({
      where: { id, tenantId: tenantId(request) },
    });
    if (count === 0) return reply.status(404).send({ error: "Branch not found" });
    return reply.status(204).send();
  });

  // ── Products ─────────────────────────────────────────────────────────────

  app.get("/products", async (request) => {
    const products = await app.prisma.product.findMany({
      where: { tenantId: tenantId(request) },
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
      await app.prisma.product.create({
        data: { ...parse.data, tenantId: tenantId(request) },
      }),
    );
  });

  app.get("/products/:id", async (request, reply) => {
    const id = ProductSchema.shape.id.parse(
      (request.params as { id: string }).id,
    );
    const product = await app.prisma.product.findFirst({
      where: { id, tenantId: tenantId(request) },
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
    const { count } = await app.prisma.product.updateMany({
      where: { id, tenantId: tenantId(request) },
      data: parse.data,
    });
    if (count === 0) return reply.status(404).send({ error: "Product not found" });
    // See the branch PATCH above: the tenant-scoped updateMany already
    // proved this id belongs here.
    return serializePrisma(
      await app.prisma.product.findUniqueOrThrow({ where: { id } }),
    );
  });

  app.delete("/products/:id", async (request, reply) => {
    const id = ProductSchema.shape.id.parse(
      (request.params as { id: string }).id,
    );
    const { count } = await app.prisma.product.deleteMany({
      where: { id, tenantId: tenantId(request) },
    });
    if (count === 0) return reply.status(404).send({ error: "Product not found" });
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

    const tid = tenantId(request);

    // Both parents are checked against the tenant, which is also what stops
    // a join row pairing this tenant's product with another tenant's branch.
    const product = await app.prisma.product.findFirst({
      where: { id: productId, tenantId: tid },
    });
    if (!product) {
      return reply.status(404).send({ error: "Product not found" });
    }

    const branch = await app.prisma.branch.findFirst({
      where: { id: branchId, tenantId: tid },
    });
    if (!branch) {
      return reply.status(404).send({ error: "Branch not found" });
    }

    return serializePrisma(
      await app.prisma.productBranchAvailability.upsert({
        where: { productId_branchId: { productId, branchId } },
        create: { tenantId: tid, productId, branchId, inStock, priceOverride },
        update: { inStock, priceOverride },
      }),
    );
  });

  // ── Discount codes ───────────────────────────────────────────────────────

  app.get("/discount-codes", async (request) => {
    const codes = await app.prisma.discountCode.findMany({
      where: { tenantId: tenantId(request) },
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
      await app.prisma.discountCode.create({
        data: { ...parse.data, tenantId: tenantId(request) },
      }),
    );
  });

  app.get("/discount-codes/:id", async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const discount = await app.prisma.discountCode.findFirst({
      where: { id, tenantId: tenantId(request) },
      include: { scopeBranch: true, redemptions: true },
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
    const { count } = await app.prisma.discountCode.updateMany({
      where: { id, tenantId: tenantId(request) },
      data: parse.data,
    });
    if (count === 0) {
      return reply.status(404).send({ error: "Discount code not found" });
    }
    return serializePrisma(
      await app.prisma.discountCode.findUniqueOrThrow({ where: { id } }),
    );
  });

  app.delete("/discount-codes/:id", async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const { count } = await app.prisma.discountCode.deleteMany({
      where: { id, tenantId: tenantId(request) },
    });
    if (count === 0) {
      return reply.status(404).send({ error: "Discount code not found" });
    }
    return reply.status(204).send();
  });

  // ── Category images ─────────────────────────────────────────────────────

  // Returns one entry per fixed ProductCategory, even if no image has been
  // set yet. The mobile app's GET /public/category-images returns only the
  // rows that exist; this admin endpoint synthesises the full 5-row list so
  // the dashboard can render an upload slot for every category.
  app.get("/category-images", async (request) => {
    const existing = await app.prisma.categoryImage.findMany({
      where: { tenantId: tenantId(request) },
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

    const tid = tenantId(request);

    if (imageUrl === "") {
      await app.prisma.categoryImage.deleteMany({
        where: { tenantId: tid, category },
      });
      return { category, imageUrl: null, deleted: true };
    }

    const row = await app.prisma.categoryImage.upsert({
      where: { tenantId_category: { tenantId: tid, category } },
      create: { tenantId: tid, category, imageUrl },
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
      where: { tenantId: tenantId(request), category: categoryParse.data },
    });
    return reply.status(204).send();
  });

  // ── Notifications ────────────────────────────────────────────────────────

  app.get("/notifications", async (request) => {
    const notifications = await app.prisma.notification.findMany({
      where: { tenantId: tenantId(request) },
      orderBy: { sentAt: "desc" },
    });
    return serializePrisma(notifications);
  });

  // Lets the admin see how many devices a broadcast will actually reach
  // before confirming send, rather than sending blind.
  app.get("/notifications/recipient-count", async (request) => {
    const count = await app.prisma.pushToken.count({
      where: { tenantId: tenantId(request) },
    });
    return { count };
  });

  app.post("/notifications", async (request, reply) => {
    const parse = CreateNotificationSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid notification payload" });
    }
    return serializePrisma(
      await app.prisma.notification.create({
        data: { ...parse.data, tenantId: tenantId(request) },
      }),
    );
  });

  app.post("/notifications/send", async (request, reply) => {
    const parse = SendNotificationSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid notification payload" });
    }

    const { title, body, discountCodeId, target, userIds } = parse.data;
    const tid = tenantId(request);

    if (discountCodeId) {
      const discount = await app.prisma.discountCode.findFirst({
        where: { id: discountCodeId, tenantId: tid },
      });
      if (!discount) {
        return reply.status(404).send({ error: "Discount code not found" });
      }
    }

    // A targeted send resolves to the push tokens owned by the chosen
    // customers. Customers with no registered token simply contribute none,
    // which is why the response reports `recipients` (devices actually
    // messaged) separately from how many customers were picked.
    // The tenant filter on BOTH branches is the single most important line
    // in this file. Before it, "target: all" meant every push token in the
    // table, so the second customer's first broadcast would have reached the
    // first customer's entire user base. The targeted branch needs it too:
    // userIds arrive in the request body, so an id belonging to another
    // tenant would otherwise resolve to that tenant's device.
    const pushTokens =
      target === "users"
        ? await app.prisma.pushToken.findMany({
            where: { tenantId: tid, userId: { in: userIds ?? [] } },
          })
        : await app.prisma.pushToken.findMany({ where: { tenantId: tid } });

    const tokens = pushTokens.map((pt) => pt.token);
    const { sent, failed } = await sendPushNotifications(
      tokens,
      title,
      body,
      discountCodeId ? { discountCodeId } : undefined,
    );

    const notification = await app.prisma.notification.create({
      data: {
        tenantId: tid,
        title,
        body,
        discountCodeId,
        audience: target === "users" ? "SEGMENT" : "ALL",
        sentAt: new Date(),
        sentToCount: sent.length,
      },
    });

    return {
      notification: serializePrisma(notification),
      sent: sent.length,
      failed: failed.length,
    };
  });

  app.get("/discount-codes/:id/redemptions", async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const discount = await app.prisma.discountCode.findFirst({
      where: { id, tenantId: tenantId(request) },
    });
    if (!discount) {
      return reply.status(404).send({ error: "Discount code not found" });
    }

    const redemptions = await app.prisma.discountCodeRedemption.findMany({
      where: { discountCodeId: id, tenantId: tenantId(request) },
      include: { branch: true },
      orderBy: { redeemedAt: "desc" },
    });

    return {
      discount: serializePrisma(discount),
      redemptions: serializePrisma(redemptions),
    };
  });

  // ── Consumer users ───────────────────────────────────────────────────────
  // Read + password-reset only. Full visit-history analytics is a separate,
  // later feature -- this is deliberately just enough to support the
  // admin-assisted "forgot password" flow (the app collects no email/phone,
  // so there's no self-service reset path).

  app.get("/consumer-users", async (request) => {
    const users = await app.prisma.consumerUser.findMany({
      where: { tenantId: tenantId(request) },
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

      const tid = tenantId(request);

      const user = await app.prisma.consumerUser.findFirst({
        where: { id, tenantId: tid },
      });
      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      const ok = await resetConsumerPassword(
        app,
        tid,
        id,
        parse.data.newPassword,
      );
      // The row was there a moment ago, so a miss here means it was deleted
      // in between -- report it as gone rather than as a silent success.
      if (!ok) {
        return reply.status(404).send({ error: "User not found" });
      }
      return reply.status(204).send();
    },
  );

  // ── Loyalty program ──────────────────────────────────────────────────────

  app.post("/loyalty/scan", async (request, reply) => {
    const parse = LoyaltyScanSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid scan payload" });
    }

    const tid = tenantId(request);

    // The branch is checked before any points are awarded: branchId comes
    // from the dashboard's own state, but a stale one from a shop the staff
    // member no longer works at would otherwise attribute a visit to another
    // tenant's location.
    const branch = await app.prisma.branch.findFirst({
      where: { id: parse.data.branchId, tenantId: tid },
      select: { id: true },
    });
    if (!branch) {
      return reply.status(404).send({ error: "Branch not found" });
    }

    const result = await awardLoyaltyPoints(app, { ...parse.data, tenantId: tid });
    if (!result.ok) {
      const status = result.errorCode === "USER_NOT_FOUND" ? 404 : 409;
      return reply
        .status(status)
        .send({ error: "Could not award points", errorCode: result.errorCode });
    }

    const [user, activeRewards] = await Promise.all([
      app.prisma.consumerUser.findFirst({
        where: { id: parse.data.userId, tenantId: tid },
        select: { firstName: true, lastName: true },
      }),
      app.prisma.loyaltyReward.findMany({
        where: { userId: parse.data.userId, tenantId: tid, status: "ACTIVE" },
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

      const tid = tenantId(request);

      const branch = await app.prisma.branch.findFirst({
        where: { id: parse.data.branchId, tenantId: tid },
        select: { id: true },
      });
      if (!branch) {
        return reply.status(404).send({ error: "Branch not found" });
      }

      const result = await redeemLoyaltyReward(app, {
        tenantId: tid,
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
      tenantId: tenantId(request),
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

    return serializePrisma(
      await getCustomerVisitSummary(app, {
        tenantId: tenantId(request),
        period,
      }),
    );
  });
}
