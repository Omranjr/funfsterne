import type { FastifyInstance } from "fastify";

export async function publicRoutes(app: FastifyInstance) {
  app.get("/branches", async () => {
    return app.prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  });

  app.get("/products", async () => {
    return app.prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  });

  app.get("/products/:id", async (request) => {
    const { id } = request.params as { id: string };
    return app.prisma.product.findUnique({ where: { id } });
  });
}
