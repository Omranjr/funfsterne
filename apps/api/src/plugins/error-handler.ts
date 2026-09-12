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

    // Anything that already carries a 4xx is a client error someone has
    // deliberately labelled -- Fastify's own body-parser failures, and our
    // JSON parser rejecting malformed input. Reporting those as 500 is wrong
    // twice over: the caller is told the server broke when the request was at
    // fault, and a genuine outage is impossible to spot in a log full of
    // other people's typos.
    //
    // Only 4xx is trusted. A thrown 5xx gets the generic treatment below,
    // because its message may carry internals worth not leaking.
    const status = (error as { statusCode?: number }).statusCode;
    if (typeof status === "number" && status >= 400 && status < 500) {
      request.log.warn({ err: error }, "client error");
      return reply
        .status(status)
        .send({ error: error.message || "Bad request" });
    }

    request.log.error(error);
    return reply.status(500).send({ error: "Internal server error" });
  });
});
