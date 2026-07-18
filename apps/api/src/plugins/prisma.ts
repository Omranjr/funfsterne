import { PrismaClient } from "@prisma/client";
import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";

export const prisma = new PrismaClient();

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
