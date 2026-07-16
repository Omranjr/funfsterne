import { z } from "zod";
import type { FastifyInstance } from "fastify";
import {
  requestMagicLink,
  verifyMagicLink,
} from "../services/user-auth.service.js";
import { PlatformSchema } from "@funfsterne/shared-types";

const RequestMagicLinkSchema = z.object({
  email: z.string().email(),
});

const VerifyMagicLinkSchema = z.object({
  token: z.string().min(1),
  pushToken: z
    .object({
      token: z.string().min(1),
      platform: PlatformSchema,
    })
    .optional(),
});

export async function userAuthRoutes(app: FastifyInstance) {
  app.post("/magic-link/request", async (request, reply) => {
    const parse = RequestMagicLinkSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid email" });
    }

    const result = await requestMagicLink(app, parse.data.email);
    return result;
  });

  app.post("/magic-link/verify", async (request, reply) => {
    const parse = VerifyMagicLinkSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid payload" });
    }

    const user = await verifyMagicLink(
      app,
      parse.data.token,
      parse.data.pushToken,
    );

    if (!user) {
      return reply.status(400).send({ error: "Invalid or expired magic link" });
    }

    const pushTokens = await app.prisma.pushToken.findMany({
      where: { userId: user.id },
    });

    return { user, tokens: pushTokens.map((t) => t.token) };
  });
}
