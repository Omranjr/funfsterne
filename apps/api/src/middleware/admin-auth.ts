import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireAdmin } from "../plugins/jwt.js";

export async function adminAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const admin = await requireAdmin(request);
    request.admin = admin;
  } catch (err) {
    reply.status(401).send({ error: "Unauthorized" });
    return;
  }
}

declare module "fastify" {
  interface FastifyRequest {
    admin?: import("../plugins/jwt.js").AdminJwtPayload;
  }
}
