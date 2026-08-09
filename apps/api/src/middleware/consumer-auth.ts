import type { FastifyReply, FastifyRequest } from "fastify";
import { requireConsumer } from "../plugins/jwt.js";

export async function consumerAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const consumer = await requireConsumer(request);
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
