import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import type { AdminJwtPayload } from "../plugins/jwt.js";

export interface AdminLoginInput {
  email: string;
  password: string;
}

export async function authenticateAdmin(
  app: FastifyInstance,
  input: AdminLoginInput,
): Promise<AdminJwtPayload | null> {
  const admin = await app.prisma.adminUser.findUnique({
    where: { email: input.email },
  });

  if (!admin) return null;

  const valid = await bcrypt.compare(input.password, admin.passwordHash);
  if (!valid) return null;

  return { sub: admin.id, email: admin.email, role: "admin" };
}

/**
 * Admin session length.
 *
 * Matches the 7-day expiry the admin app already sets on its `adminToken`
 * cookie, so this is not a change in how long a session lasts — it is the
 * server enforcing what the client was only suggesting. Without an `exp`
 * claim the token itself stayed valid forever, so one captured out of a
 * browser kept working long after the cookie holding it had gone, with no
 * way to revoke it short of rotating JWT_SECRET.
 */
const ADMIN_TOKEN_TTL = "7d";

export function signAdminToken(
  app: FastifyInstance,
  payload: AdminJwtPayload,
): string {
  return app.jwt.sign(payload, { expiresIn: ADMIN_TOKEN_TTL });
}
