import "dotenv/config";
import Fastify from "fastify";
import { corsPlugin } from "./plugins/cors.js";
import { helmetPlugin } from "./plugins/helmet.js";
import { prismaPlugin } from "./plugins/prisma.js";
import { jwtPlugin } from "./plugins/jwt.js";
import { uploadPlugin } from "./plugins/upload.js";
import { errorHandlerPlugin } from "./plugins/error-handler.js";
import { registerJsonBodyParser } from "./plugins/json-body-parser.js";
import { healthRoutes } from "./routes/health.js";
import { adminAuthRoutes } from "./routes/admin-auth.js";
import { adminRoutes } from "./routes/admin.js";
import { publicRoutes } from "./routes/public.js";
import { consumerAuthRoutes } from "./routes/consumer-auth.js";
import { loyaltyRoutes } from "./routes/loyalty.js";
import { walletPassRoutes } from "./routes/wallet-pass.js";
import { uploadRoutes } from "./routes/upload.js";
import { startRetentionSchedule } from "./services/retention.service.js";
import { startDeliveryCheckSchedule } from "./services/notification-delivery.service.js";

/**
 * Query-string keys whose values must never reach a log file.
 *
 * Fastify logs `request.url` verbatim, so anything in a query string lands
 * in the application log and from there in the platform's log retention.
 * Identifiers do not belong there -- they are personal data, and log
 * retention is the one place the database cleanup cannot reach.
 *
 * `userId` reaches /admin/loyalty/stats when the owner filters the chart by
 * customer. A query parameter is the right shape for a filter, so it stays
 * one and is hidden here instead.
 *
 * `deviceId` no longer arrives this way at all -- it moved to the
 * X-Device-Id header, which is not logged. It is kept in this set as a
 * backstop: a build predating that change, or a future route that reaches
 * for the old parameter name, must not quietly start leaking again.
 */
const REDACTED_QUERY_KEYS = new Set(["deviceId", "userId", "token"]);

/**
 * The request path with sensitive query values replaced. Keys are kept so
 * the shape of a request is still legible when reading logs.
 */
function redactUrl(url: string): string {
  const split = url.indexOf("?");
  if (split === -1) return url;

  const path = url.slice(0, split);
  const params = new URLSearchParams(url.slice(split + 1));
  for (const key of params.keys()) {
    if (REDACTED_QUERY_KEYS.has(key)) params.set(key, "[redacted]");
  }
  return `${path}?${params.toString()}`;
}

const app = Fastify({
  logger: {
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: redactUrl(request.url),
          hostname: request.hostname,
          remoteAddress: request.ip,
          remotePort: request.socket?.remotePort,
        };
      },
    },
  },

  /**
   * Trust exactly one proxy hop.
   *
   * The API runs behind Render's load balancer, so the TCP peer is always
   * Render -- not the customer. Without this, `request.ip` is that one
   * proxy address for every request, and the rate limiters on the login and
   * registration routes key on it. The practical effect was a single shared
   * bucket: ten sign-in attempts per five minutes across the entire
   * customer base, after which everyone got 429s. Invisible while testing
   * alone; a growing problem the moment the shop has real traffic.
   *
   * Deliberately `1` rather than `true`. `true` trusts the whole
   * X-Forwarded-For chain and takes the leftmost entry -- which the client
   * writes, so anyone could rotate a header value and skip the rate limit
   * entirely. That would be worse than the bug it fixes. A hop count trusts
   * only the address nearest the server and reads the one before it, which
   * Render sets and a client cannot forge.
   *
   * If Render ever adds a hop, the symptom is a constant `request.ip` again
   * -- the limiter degrades to today's behaviour rather than becoming
   * unsafe.
   */
  trustProxy: 1,
});

async function main() {
  await app.register(errorHandlerPlugin);
  registerJsonBodyParser(app);
  // Registered before the routes so the headers land on every reply,
  // including the ones Fastify generates itself.
  await app.register(helmetPlugin);
  await app.register(corsPlugin);
  await app.register(prismaPlugin);
  await app.register(jwtPlugin);
  await app.register(uploadPlugin);

  // Public routes
  await app.register(healthRoutes, { prefix: "/health" });
  await app.register(publicRoutes, { prefix: "/public" });
  await app.register(consumerAuthRoutes, { prefix: "/public/auth" });
  await app.register(loyaltyRoutes, { prefix: "/public/loyalty" });
  await app.register(walletPassRoutes, { prefix: "/public/wallet-pass" });

  // Admin auth + admin-only routes
  await app.register(adminAuthRoutes, { prefix: "/admin/auth" });
  await app.register(adminRoutes, { prefix: "/admin" });
  await app.register(uploadRoutes, { prefix: "/admin/upload" });

  const port = Number(process.env.PORT) || 4000;
  const host = process.env.HOST || "0.0.0.0";

  await app.listen({ port, host });

  // The daily-earn limit is the only thing stopping an admin login from
  // minting vouchers by scanning one customer repeatedly, and points convert
  // straight into euros. Turning it off is a legitimate testing move, but
  // leaving it off is an open till -- and an environment variable set weeks
  // ago is invisible. Say so on every boot, loudly enough to notice.
  if (process.env.LOYALTY_DISABLE_DAILY_LIMIT === "1") {
    app.log.warn(
      "LOYALTY_DISABLE_DAILY_LIMIT=1 -- the once-per-day earn limit is OFF. " +
        "A customer can be scanned for points repeatedly. Fine for testing; " +
        "unset this before the shop goes live.",
    );
  }

  // Started only after the server is accepting requests, so housekeeping can
  // never delay or fail a boot.
  startRetentionSchedule(app);
  startDeliveryCheckSchedule(app);
}

main().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
