import {
  ProductCategorySchema,
  ProductSchema,
} from "@funfsterne/shared-types";
import { z } from "zod";
import type { FastifyInstance } from "fastify";

const ProductQuerySchema = z.object({
  category: ProductCategorySchema.optional(),
  branchId: z.string().optional(),
});

export async function publicRoutes(app: FastifyInstance) {
  app.get("/branches", async () => {
    return app.prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  });

  app.get("/products", async (request) => {
    const query = ProductQuerySchema.safeParse(request.query);
    if (!query.success) {
      return { error: "Invalid query parameters" };
    }

    const { category, branchId } = query.data;

    return app.prisma.product.findMany({
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

    return product;
  });
}
