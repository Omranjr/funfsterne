import type { FastifyReply, FastifyRequest } from "fastify";
import { requireAdmin } from "../plugins/jwt.js";

export async function adminAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const admin = await requireAdmin(request);

    // A token is only good for the tenant it was issued for. Answering 401
    // rather than 403 is deliberate: to this tenant, a credential belonging
    // to a different one is simply not a credential, and saying "forbidden"
    // would confirm the token is valid somewhere.
    if (request.tenant && admin.tid !== request.tenant.id) {
      reply.status(401).send({ error: "Unauthorized" });
      return;
    }

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
