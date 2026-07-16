import type { FastifyReply, FastifyRequest } from "fastify";

export async function consumerAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const header = request.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;

  if (!token) {
    reply.status(401).send({ error: "Missing consumer token" });
    return;
  }

  const user = await request.server.prisma.user.findFirst({
    where: { pushTokens: { some: { token } } },
    include: { preferredBranch: true },
  });

  if (!user) {
    reply.status(401).send({ error: "Invalid consumer token" });
    return;
  }

  request.consumer = {
    userId: user.id,
    token,
    preferredBranchId: user.preferredBranchId,
  };
}

declare module "fastify" {
  interface FastifyRequest {
    consumer?: {
      userId: string;
      token: string;
      preferredBranchId: string | null;
    };
  }
}
