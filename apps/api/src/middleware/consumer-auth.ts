import type { FastifyReply, FastifyRequest } from "fastify";
import { requireConsumer } from "../plugins/jwt.js";

export async function consumerAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const consumer = await requireConsumer(request);

    // See admin-auth.ts: a token is only good for the tenant it was issued
    // for, and the shared signing secret means the signature alone cannot
    // tell the two apart.
    if (request.tenant && consumer.tid !== request.tenant.id) {
      reply.status(401).send({ error: "Unauthorized" });
      return;
    }

    request.consumer = consumer;
  } catch (err) {
    reply.status(401).send({ error: "Unauthorized" });
    return;
  }
}

declare module "fastify" {
  interface FastifyRequest {
    consumer?: import("../plugins/jwt.js").ConsumerJwtPayload;
  }
}
