import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import type { ConsumerJwtPayload } from "../plugins/jwt.js";

const PASSWORD_HASH_ROUNDS = 10;

export interface RegisterConsumerInput {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
}

export interface ConsumerLoginInput {
  username: string;
  password: string;
}

export interface ConsumerProfile {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
}

export type RegisterConsumerResult =
  | { ok: true; payload: ConsumerJwtPayload; profile: ConsumerProfile }
  | { ok: false; errorCode: "USERNAME_TAKEN" };

export async function registerConsumer(
  app: FastifyInstance,
  input: RegisterConsumerInput,
): Promise<RegisterConsumerResult> {
  const existing = await app.prisma.consumerUser.findUnique({
    where: { username: input.username },
  });
  if (existing) {
    return { ok: false, errorCode: "USERNAME_TAKEN" };
  }

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS);

  const user = await app.prisma.consumerUser.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      username: input.username,
      passwordHash,
    },
  });

  return {
    ok: true,
    payload: { sub: user.id, username: user.username, role: "consumer" },
    profile: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
    },
  };
}

export async function authenticateConsumer(
  app: FastifyInstance,
  input: ConsumerLoginInput,
): Promise<{ payload: ConsumerJwtPayload; profile: ConsumerProfile } | null> {
  const user = await app.prisma.consumerUser.findUnique({
    where: { username: input.username },
  });

  if (!user) return null;

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) return null;

  return {
    payload: { sub: user.id, username: user.username, role: "consumer" },
    profile: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
    },
  };
}

export function signConsumerToken(
  app: FastifyInstance,
  payload: ConsumerJwtPayload,
): string {
  return app.jwt.sign(payload);
}

// Sets a brand new password for a user. This is a RESET, not a recovery --
// the old password is a one-way bcrypt hash and can never be read back, by
// design. Used by the admin-initiated "forgot password" flow, since the
// app collects no email/phone to run a self-service reset through.
export async function resetConsumerPassword(
  app: FastifyInstance,
  userId: string,
  newPassword: string,
): Promise<boolean> {
  const passwordHash = await bcrypt.hash(newPassword, PASSWORD_HASH_ROUNDS);
  try {
    await app.prisma.consumerUser.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return true;
  } catch {
    return false;
  }
}

export async function deleteConsumerAccount(
  app: FastifyInstance,
  userId: string,
): Promise<void> {
  // PushToken/DiscountCodeRedemption rows are kept (onDelete: SetNull on the
  // userId relation) so the shop's aggregate usage stats survive -- only the
  // personally-identifying account (name, username, password) is removed,
  // matching what the account-deletion flow promises the user.
  await app.prisma.consumerUser.delete({ where: { id: userId } });
}
