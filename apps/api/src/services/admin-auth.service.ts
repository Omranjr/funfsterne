import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import type { AdminJwtPayload } from "../plugins/jwt.js";

/**
 * A real bcrypt hash of a value nobody knows, compared against when the
 * account does not exist.
 *
 * Without it, a miss returned immediately while a wrong password spent
 * ~150ms hashing -- so response time alone told an attacker whether an
 * identifier was real. Burning the same time on both paths removes that
 * signal.
 *
 * It is a genuine hash rather than a placeholder string on purpose: bcrypt
 * rejects a malformed one straight away, which would leave the timing gap
 * exactly as it was.
 */
const ABSENT_ACCOUNT_HASH =
  "$2b$10$3wQJheRSNsXjWCm.SyqFReOFkCDj9fVdUvExi3ReEY2sHw2xctm0G";


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

  if (!admin) {
    // Spend the same time as a real check before answering. See the note on
    // ABSENT_ACCOUNT_HASH.
    await bcrypt.compare(input.password, ABSENT_ACCOUNT_HASH);
    return null;
  }

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
