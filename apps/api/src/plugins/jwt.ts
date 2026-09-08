import jwt from "@fastify/jwt";
import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest } from "fastify";

export const jwtPlugin = fp(async function jwtPlugin(app: FastifyInstance) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }

  await app.register(jwt, {
    secret,
    cookie: {
      cookieName: "adminToken",
      signed: false,
    },
  });
});

export interface AdminJwtPayload {
  sub: string;
  email: string;
  role: "admin";
  /**
   * The tenant this token was issued for.
   *
   * Checked against the request's resolved tenant on every guarded route.
   * Without it, a valid token from one shop would authenticate against
   * another shop simply by changing the `x-tenant-id` header -- the
   * signature would still verify, because both shops are signed by the same
   * secret. The `role` claim alone does not cover this: it separates admin
   * from consumer, not customer from customer.
   */
  tid: string;
}

export async function requireAdmin(
  request: FastifyRequest,
): Promise<AdminJwtPayload> {
  await request.jwtVerify();
  const payload = request.user as AdminJwtPayload;
  if (payload.role !== "admin") {
    throw { statusCode: 403, message: "Forbidden" };
  }
  return payload;
}

export interface ConsumerJwtPayload {
  sub: string;
  username: string;
  role: "consumer";
  /** See AdminJwtPayload.tid. */
  tid: string;
}

// Sharing one @fastify/jwt instance (one secret) with the admin token above
// is safe: the `role` claim is checked on every guard, so a consumer token
// can never pass requireAdmin and vice versa -- there's no route that
// accepts either role interchangeably.
export async function requireConsumer(
  request: FastifyRequest,
): Promise<ConsumerJwtPayload> {
  await request.jwtVerify();
  const payload = request.user as ConsumerJwtPayload;
  if (payload.role !== "consumer") {
    throw { statusCode: 403, message: "Forbidden" };
  }
  return payload;
}
