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
