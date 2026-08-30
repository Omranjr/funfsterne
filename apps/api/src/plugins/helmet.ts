import helmet from "@fastify/helmet";
import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";

/**
 * Response security headers.
 *
 * Wrapped with fastify-plugin for the same reason as CORS: registered on a
 * child context, the hook would not run for Fastify's own error responses
 * (404s, body-parser 400s), leaving exactly the replies an attacker probes
 * without headers.
 *
 * The Content-Security-Policy default is deliberately off. This process
 * serves JSON to a React Native app and a Next.js dashboard on other
 * origins — it renders no HTML of its own, so a CSP here protects nothing
 * while being one more thing that can silently break a response. The
 * dashboard's own CSP is Vercel's to set.
 *
 * HSTS is on, which is safe: Render terminates TLS in front of this and
 * redirects HTTP itself, so there is no plain-HTTP origin to lock out.
 */
export const helmetPlugin = fp(async function helmetPlugin(app: FastifyInstance) {
  await app.register(helmet, {
    contentSecurityPolicy: false,
    // Lets the admin dashboard on Vercel read responses cross-origin; the
    // default ("same-origin") would have CORS succeed and the browser still
    // discard the body.
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
      maxAge: 60 * 60 * 24 * 180, // 180 days
      includeSubDomains: true,
    },
    referrerPolicy: { policy: "no-referrer" },
  });
});
