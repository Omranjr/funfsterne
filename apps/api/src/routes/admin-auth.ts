import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import type { FastifyInstance } from "fastify";
import {
  authenticateAdmin,
  signAdminToken,
} from "../services/admin-auth.service.js";
import { resolveTenant, tenantId } from "../middleware/tenant.js";

const LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function adminAuthRoutes(app: FastifyInstance) {
  // The dashboard sends x-tenant-id with the login request, because which
  // shop is being signed into cannot be inferred from the email address --
  // one owner may run several.
  app.addHook("preHandler", resolveTenant);

  // Same reasoning as consumer-auth.ts: scoped to this plugin so it only
  // throttles admin login, not the rest of the admin API.
  await app.register(rateLimit, {
    max: 10,
    timeWindow: "5 minutes",
  });

  app.post("/login", async (request, reply) => {
    const parse = LoginBodySchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid login payload" });
    }

    const admin = await authenticateAdmin(app, {
      ...parse.data,
      tenantId: tenantId(request),
    });
    if (!admin) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const token = signAdminToken(app, admin);
    return {
      token,
      admin: { id: admin.sub, email: admin.email },
      tenant: request.tenant,
    };
  });
}
