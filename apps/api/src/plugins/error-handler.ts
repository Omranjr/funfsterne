import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

// Several admin routes validate :id params with schema.parse(...) (throwing)
// rather than safeParse, and Prisma throws its own errors for e.g. deleting
// a row that no longer exists. Without a global handler both surface as raw
// 500s to the client. This normalizes them to well-formed 400/404 responses.
export const errorHandlerPlugin = fp(async function errorHandlerPlugin(
  app: FastifyInstance,
) {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({ error: "Invalid request" });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return reply.status(404).send({ error: "Not found" });
      }
      if (error.code === "P2002") {
        return reply.status(409).send({ error: "Already exists" });
      }
    }

    request.log.error(error);
    return reply.status(500).send({ error: "Internal server error" });
  });
});
