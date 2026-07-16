import "dotenv/config";
import Fastify from "fastify";
import { corsPlugin } from "./plugins/cors.js";
import { healthRoutes } from "./routes/health.js";

const app = Fastify({
  logger: true,
});

async function main() {
  await app.register(corsPlugin);
  await app.register(healthRoutes, { prefix: "/health" });

  const port = Number(process.env.PORT) || 4000;
  const host = process.env.HOST || "0.0.0.0";

  await app.listen({ port, host });
}

main().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
