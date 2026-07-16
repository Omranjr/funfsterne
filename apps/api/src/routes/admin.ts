import type { FastifyInstance } from "fastify";
import { adminAuthMiddleware } from "../middleware/admin-auth.js";

export async function adminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", adminAuthMiddleware);

  app.get("/me", async (request) => {
    return request.admin;
  });

  app.get("/branches", async () => {
    return app.prisma.branch.findMany({ orderBy: { name: "asc" } });
  });

  app.get("/products", async () => {
    return app.prisma.product.findMany({ orderBy: { name: "asc" } });
  });

  app.get("/discount-codes", async () => {
    return app.prisma.discountCode.findMany({ orderBy: { code: "asc" } });
  });

  app.get("/notifications", async () => {
    return app.prisma.notification.findMany({ orderBy: { sentAt: "desc" } });
  });
}
