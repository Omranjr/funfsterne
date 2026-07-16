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

export function signAdminToken(
  app: FastifyInstance,
  payload: AdminJwtPayload,
): string {
  return app.jwt.sign(payload);
}
