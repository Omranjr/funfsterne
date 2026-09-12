import type { FastifyInstance } from "fastify";

/**
 * Replaces Fastify's built-in JSON body parser with one that tolerates an
 * empty body and reports bad JSON as a client error.
 *
 * The default parser runs whenever a request declares `application/json` and
 * throws on an empty string, before the route is ever reached. A client that
 * sends that header on a POST with no payload -- easy to do, since most HTTP
 * helpers set it unconditionally -- therefore got a 500, which reads as a
 * server fault and sends you looking in entirely the wrong place. That is
 * exactly what broke the Wallet pass token request: the route was correct and
 * deployed, and the failure happened before it ran.
 *
 * An absent body becomes `{}` so the route's own validation decides what to do
 * with it, and malformed JSON becomes a 400 rather than a 500, because in both
 * cases it is the request that is wrong, not the server.
 *
 * Not wrapped in fastify-plugin: a content type parser registered on the root
 * instance already applies to every route, and encapsulation would scope it to
 * a child.
 */
export function registerJsonBodyParser(app: FastifyInstance): void {
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (_request, body, done) => {
      const raw = typeof body === "string" ? body.trim() : "";

      if (raw === "") {
        done(null, {});
        return;
      }

      try {
        done(null, JSON.parse(raw));
      } catch {
        const err = new Error("Invalid JSON body") as Error & {
          statusCode?: number;
        };
        err.statusCode = 400;
        done(err, undefined);
      }
    },
  );
}
