import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";

function parseOrigins(input: string | undefined): string[] | boolean {
  if (!input) return true;
  const origins = input
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return origins.length > 0 ? origins : true;
}

export async function corsPlugin(app: FastifyInstance) {
  const allowedOrigins = parseOrigins(process.env.ALLOWED_ORIGINS);

  await app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });
}
