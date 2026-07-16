import { z } from "zod";
import type { FastifyInstance } from "fastify";
import {
  authenticateAdmin,
  signAdminToken,
} from "../services/admin-auth.service.js";

const LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function adminAuthRoutes(app: FastifyInstance) {
  app.post("/login", async (request, reply) => {
    const parse = LoginBodySchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid login payload" });
    }

    const admin = await authenticateAdmin(app, parse.data);
    if (!admin) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const token = signAdminToken(app, admin);
    return { token, admin: { id: admin.sub, email: admin.email } };
  });
}
