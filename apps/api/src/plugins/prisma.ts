import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
// The schema and the generated client live in packages/db, so any future
// worker or platform tool shares one migration history with the API.
import { prisma } from "@funfsterne/db";

export { prisma };

export const prismaPlugin = fp(async function prismaPlugin(app: FastifyInstance) {
  app.decorate("prisma", prisma);

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
});

declare module "fastify" {
  interface FastifyInstance {
    prisma: typeof prisma;
  }
}
