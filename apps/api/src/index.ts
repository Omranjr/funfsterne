import "dotenv/config";
import Fastify from "fastify";
import { corsPlugin } from "./plugins/cors.js";
import { prismaPlugin } from "./plugins/prisma.js";
import { jwtPlugin } from "./plugins/jwt.js";
import { uploadPlugin } from "./plugins/upload.js";
import { errorHandlerPlugin } from "./plugins/error-handler.js";
import { healthRoutes } from "./routes/health.js";
import { adminAuthRoutes } from "./routes/admin-auth.js";
import { adminRoutes } from "./routes/admin.js";
import { publicRoutes } from "./routes/public.js";
import { consumerAuthRoutes } from "./routes/consumer-auth.js";
import { loyaltyRoutes } from "./routes/loyalty.js";
import { uploadRoutes } from "./routes/upload.js";

const app = Fastify({
  logger: true,
});

async function main() {
  await app.register(errorHandlerPlugin);
  await app.register(corsPlugin);
  await app.register(prismaPlugin);
  await app.register(jwtPlugin);
  await app.register(uploadPlugin);

  // Public routes
  await app.register(healthRoutes, { prefix: "/health" });
  await app.register(publicRoutes, { prefix: "/public" });
  await app.register(consumerAuthRoutes, { prefix: "/public/auth" });
  await app.register(loyaltyRoutes, { prefix: "/public/loyalty" });

  // Admin auth + admin-only routes
  await app.register(adminAuthRoutes, { prefix: "/admin/auth" });
  await app.register(adminRoutes, { prefix: "/admin" });
  await app.register(uploadRoutes, { prefix: "/admin/upload" });

  const port = Number(process.env.PORT) || 4000;
  const host = process.env.HOST || "0.0.0.0";

  await app.listen({ port, host });
}

main().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
