import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import type { ConsumerJwtPayload } from "../plugins/jwt.js";

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
  // Fast path, for a clear answer without paying for a bcrypt hash first.
  // It is NOT what guarantees uniqueness -- see the catch below.
  const existing = await app.prisma.consumerUser.findUnique({
    where: { username: input.username },
  });
  if (existing) {
    return { ok: false, errorCode: "USERNAME_TAKEN" };
  }

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS);

  let user;
  try {
    user = await app.prisma.consumerUser.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        username: input.username,
        passwordHash,
      },
    });
  } catch (err) {
    // Two sign-ups racing for the same username both clear the read above --
    // there is a real gap between it and this write, widened by the bcrypt
    // hash in between. Postgres decides the winner at the unique index, and
    // the loser gets P2002.
    //
    // Caught here so it answers as USERNAME_TAKEN. Left to the global error
    // handler it became a generic 409 "Already exists" with no errorCode,
    // and the app -- which switches on errorCode -- showed "something went
    // wrong" for what is really just a taken name. A double-tap on Sign Up
    // is enough to hit this.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { ok: false, errorCode: "USERNAME_TAKEN" };
    }
    throw err;
  }

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

  if (!user) {
    // Same time spent whether or not the username exists. See the note on
    // ABSENT_ACCOUNT_HASH.
    await bcrypt.compare(input.password, ABSENT_ACCOUNT_HASH);
    return null;
  }

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

/**
 * Customer session length.
 *
 * Long deliberately: there is no email or phone on these accounts, so a
 * forgotten password needs the shop to reset it by hand. Expiring sessions
 * aggressively would turn a routine re-login into a support call. 180 days
 * keeps a stolen token from being useful forever without doing that.
 *
 * This is not revocable on its own — killing one session early still means
 * rotating JWT_SECRET, which signs everybody out. Proper per-session
 * revocation needs database-backed refresh tokens; that is a deliberate
 * post-launch piece of work, not an oversight.
 *
 * The app handles the expiry cleanly: a 401 on a request that carried a
 * token clears it and returns to the sign-in screen (see the unauthorized
 * handler in lib/api.ts).
 */
const CONSUMER_TOKEN_TTL = "180d";

export function signConsumerToken(
  app: FastifyInstance,
  payload: ConsumerJwtPayload,
): string {
  return app.jwt.sign(payload, { expiresIn: CONSUMER_TOKEN_TTL });
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
  // Push tokens go with the account. The schema's `SetNull` would otherwise
  // leave the row behind with a null userId, and a broadcast selects *every*
  // token row -- so someone who deleted their account carried on receiving
  // the shop's marketing on their phone, with no account left to turn it off
  // from and no remedy short of uninstalling. Deleting is also the honest
  // reading of what "delete my account" promises.
  //
  // Deliberately NOT extended to the other tables that reference the user:
  //
  //   DiscountCodeRedemption keeps its row (userId nulled). The deviceId on
  //   it is what stops a one-per-customer coupon being claimed again, so
  //   deleting these would turn "delete my account" into a way to farm
  //   offers. What identifies the person is dropped; what enforces the offer
  //   stays.
  //
  //   LoyaltyTransaction keeps its row (userId nulled) as anonymous visit
  //   history for the shop's own analytics -- see the note on the model.
  //
  //   LoyaltyReward cascades away, because an ACTIVE voucher with no account
  //   behind it cannot be verified in person anyway.
  //
  // One transaction so an account can never survive with its tokens already
  // gone, or vice versa.
  await app.prisma.$transaction([
    app.prisma.pushToken.deleteMany({ where: { userId } }),
    app.prisma.consumerUser.delete({ where: { id: userId } }),
  ]);
}
