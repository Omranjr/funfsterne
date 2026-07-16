import crypto from "crypto";
import type { FastifyInstance } from "fastify";
import { sendMagicLink } from "./email.service.js";

const MAGIC_LINK_TTL_MINUTES = 15;

export async function requestMagicLink(app: FastifyInstance, email: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60 * 1000);

  await app.prisma.magicLink.create({
    data: { email: email.toLowerCase().trim(), token, expiresAt },
  });

  await sendMagicLink(email, token);

  return { sent: true };
}

export async function verifyMagicLink(
  app: FastifyInstance,
  token: string,
  pushToken?: { token: string; platform: "IOS" | "ANDROID" },
) {
  const link = await app.prisma.magicLink.findUnique({
    where: { token },
  });

  if (!link || link.used || link.expiresAt < new Date()) {
    return null;
  }

  await app.prisma.magicLink.update({
    where: { id: link.id },
    data: { used: true },
  });

  let user = await app.prisma.user.findUnique({
    where: { email: link.email },
  });

  if (!user) {
    user = await app.prisma.user.create({
      data: { email: link.email },
    });
  }

  if (pushToken) {
    await app.prisma.pushToken.upsert({
      where: { token: pushToken.token },
      create: { userId: user.id, token: pushToken.token, platform: pushToken.platform },
      update: { userId: user.id, platform: pushToken.platform },
    });
  }

  return user;
}
