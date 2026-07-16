import {
  BranchSchema,
  CreateBranchSchema,
  CreateProductSchema,
  CreateDiscountCodeSchema,
  CreateNotificationSchema,
  ProductSchema,
  UpdateBranchSchema,
  UpdateProductSchema,
  UpsertProductBranchAvailabilitySchema,
} from "@funfsterne/shared-types";
import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { adminAuthMiddleware } from "../middleware/admin-auth.js";

export async function adminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", adminAuthMiddleware);

  app.get("/me", async (request) => {
    return request.admin;
  });

  // ── Branches ─────────────────────────────────────────────────────────────

  app.get("/branches", async () => {
    return app.prisma.branch.findMany({ orderBy: { name: "asc" } });
  });

  app.post("/branches", async (request, reply) => {
    const parse = CreateBranchSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid branch payload" });
    }
    return app.prisma.branch.create({ data: parse.data });
  });

  app.get("/branches/:id", async (request, reply) => {
    const id = BranchSchema.shape.id.parse(
      (request.params as { id: string }).id,
    );
    const branch = await app.prisma.branch.findUnique({ where: { id } });
    if (!branch) return reply.status(404).send({ error: "Branch not found" });
    return branch;
  });

  app.patch("/branches/:id", async (request, reply) => {
    const id = BranchSchema.shape.id.parse(
      (request.params as { id: string }).id,
    );
    const parse = UpdateBranchSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid branch payload" });
    }
    return app.prisma.branch.update({ where: { id }, data: parse.data });
  });

  app.delete("/branches/:id", async (request, reply) => {
    const id = BranchSchema.shape.id.parse(
      (request.params as { id: string }).id,
    );
    await app.prisma.branch.delete({ where: { id } });
    return reply.status(204).send();
  });

  // ── Products ─────────────────────────────────────────────────────────────

  app.get("/products", async () => {
    return app.prisma.product.findMany({
      orderBy: { name: "asc" },
      include: { availabilities: { include: { branch: true } } },
    });
  });

  app.post("/products", async (request, reply) => {
    const parse = CreateProductSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid product payload" });
    }
    return app.prisma.product.create({ data: parse.data });
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
    return product;
  });

  app.patch("/products/:id", async (request, reply) => {
    const id = ProductSchema.shape.id.parse(
      (request.params as { id: string }).id,
    );
    const parse = UpdateProductSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid product payload" });
    }
    return app.prisma.product.update({ where: { id }, data: parse.data });
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

    return app.prisma.productBranchAvailability.upsert({
      where: { productId_branchId: { productId, branchId } },
      create: { productId, branchId, inStock, priceOverride },
      update: { inStock, priceOverride },
    });
  });

  // ── Discount codes ───────────────────────────────────────────────────────

  app.get("/discount-codes", async () => {
    return app.prisma.discountCode.findMany({
      orderBy: { code: "asc" },
      include: { scopeBranch: true },
    });
  });

  app.post("/discount-codes", async (request, reply) => {
    const parse = CreateDiscountCodeSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid discount code payload" });
    }
    return app.prisma.discountCode.create({ data: parse.data });
  });

  app.get("/discount-codes/:id", async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const discount = await app.prisma.discountCode.findUnique({
      where: { id },
      include: { scopeBranch: true, redemptions: true },
    });
    if (!discount) {
      return reply.status(404).send({ error: "Discount code not found" });
    }
    return discount;
  });

  app.patch("/discount-codes/:id", async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const parse = CreateDiscountCodeSchema.partial().safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid discount code payload" });
    }
    return app.prisma.discountCode.update({ where: { id }, data: parse.data });
  });

  app.delete("/discount-codes/:id", async (request, reply) => {
    const id = (request.params as { id: string }).id;
    await app.prisma.discountCode.delete({ where: { id } });
    return reply.status(204).send();
  });

  // ── Notifications ────────────────────────────────────────────────────────

  app.get("/notifications", async () => {
    return app.prisma.notification.findMany({ orderBy: { sentAt: "desc" } });
  });

  app.post("/notifications", async (request, reply) => {
    const parse = CreateNotificationSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid notification payload" });
    }
    return app.prisma.notification.create({ data: parse.data });
  });
}
