import rateLimit from "@fastify/rate-limit";
import {
  RegisterConsumerUserSchema,
  LoginConsumerUserSchema,
} from "@funfsterne/shared-types";
import type { FastifyInstance } from "fastify";
import {
  registerConsumer,
  authenticateConsumer,
  signConsumerToken,
  deleteConsumerAccount,
} from "../services/consumer-auth.service.js";
import { consumerAuthMiddleware } from "../middleware/consumer-auth.js";
import { resolveTenant, tenantId } from "../middleware/tenant.js";

export async function consumerAuthRoutes(app: FastifyInstance) {
  // Registering, signing in and reading a profile are all per-tenant, so
  // the tenant is resolved before any of them -- including register/login,
  // which have no token to carry it.
  app.addHook("preHandler", resolveTenant);

  // Registered inside this plugin function (not globally) so it only ever
  // throttles /public/auth/* -- real credentials are at stake here, unlike
  // the rest of the public API, so this is where brute-force protection
  // actually matters.
  await app.register(rateLimit, {
    max: 10,
    timeWindow: "5 minutes",
  });

  app.post("/register", async (request, reply) => {
    const parse = RegisterConsumerUserSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid registration payload" });
    }

    const result = await registerConsumer(app, {
      ...parse.data,
      tenantId: tenantId(request),
    });
    if (!result.ok) {
      return reply
        .status(409)
        .send({ error: "Username already taken", errorCode: result.errorCode });
    }

    const token = signConsumerToken(app, result.payload);
    return { token, user: result.profile };
  });

  app.post("/login", async (request, reply) => {
    const parse = LoginConsumerUserSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid login payload" });
    }

    const result = await authenticateConsumer(app, {
      ...parse.data,
      tenantId: tenantId(request),
    });
    if (!result) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const token = signConsumerToken(app, result.payload);
    return { token, user: result.profile };
  });

  // Lets a client with a stored token recover the full profile (first/last
  // name aren't in the JWT payload, only id/username/role) and, just as
  // importantly, detect a token whose account no longer exists -- the JWT
  // signature alone can't tell a client that, since deleting the account
  // doesn't revoke already-issued tokens.
  app.get(
    "/me",
    { preHandler: consumerAuthMiddleware },
    async (request, reply) => {
      const consumer = request.consumer!;
      const user = await app.prisma.consumerUser.findFirst({
        where: { id: consumer.sub, tenantId: tenantId(request) },
        select: { id: true, firstName: true, lastName: true, username: true },
      });
      if (!user) {
        return reply.status(404).send({ error: "Account no longer exists" });
      }
      return user;
    },
  );

  app.delete(
    "/account",
    { preHandler: consumerAuthMiddleware },
    async (request, reply) => {
      const consumer = request.consumer!;
      await deleteConsumerAccount(app, tenantId(request), consumer.sub);
      return reply.status(204).send();
    },
  );
}
