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
}

/**
 * Authorises exactly one thing: downloading a customer's Wallet pass.
 *
 * The pass is handed to iOS by opening a URL, and the browser that opens it
 * carries none of the app's session -- so this token travels in the query
 * string instead. That is why it is minted with a five-minute expiry and why
 * it gets its own role: a token that spends time in a URL must not be able to
 * do anything else if it leaks.
 */
export interface WalletPassJwtPayload {
  sub: string;
  role: "wallet-pass";
}

// Sharing one @fastify/jwt instance (one secret) with the admin token above
// is safe: the `role` claim is checked on every guard, so a consumer token
// can never pass requireAdmin and vice versa -- there's no route that
// accepts either role interchangeably. The same holds for `wallet-pass`.
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
