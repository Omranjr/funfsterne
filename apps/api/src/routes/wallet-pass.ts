import type { FastifyInstance } from "fastify";
import { consumerAuthMiddleware } from "../middleware/consumer-auth.js";
import type { WalletPassJwtPayload } from "../plugins/jwt.js";
import { buildWalletPass } from "../services/wallet-pass.service.js";

/**
 * Issuing and serving the Apple Wallet loyalty pass.
 *
 * The two routes are split for one reason: the pass is handed to iOS by opening
 * its URL, and whatever opens it -- Safari, or the in-app browser -- does not
 * carry the app's session. So the download cannot sit behind
 * `consumerAuthMiddleware` the way every other loyalty route does.
 *
 * Instead the app asks for a short-lived, single-purpose token while it *is*
 * authenticated, and that token travels in the URL.
 */

/**
 * Deliberately short. The app mints this and opens it immediately, so the
 * window only has to cover one redirect on a slow connection -- not a session.
 *
 * Not single-use, which would need a store to track spent tokens: iOS may
 * legitimately fetch the URL more than once while adding a pass, so
 * invalidating on first read would break the feature to close a gap that a
 * five-minute expiry already closes in practice.
 */
const PASS_TOKEN_TTL = "5m";

export async function walletPassRoutes(app: FastifyInstance) {
  /**
   * Mints the download token. Requires a real consumer session.
   */
  app.post(
    "/token",
    { preHandler: consumerAuthMiddleware },
    async (request) => {
      const userId = request.consumer!.sub;

      // `role` is the same discriminator every other token on this instance
      // carries, and every guard checks it. A wallet token therefore cannot
      // pass requireConsumer or requireAdmin even though all three are signed
      // with the same secret.
      const payload: WalletPassJwtPayload = {
        sub: userId,
        role: "wallet-pass",
      };

      const token = app.jwt.sign(payload, { expiresIn: PASS_TOKEN_TTL });

      return { token, expiresIn: PASS_TOKEN_TTL };
    },
  );

  /**
   * Serves the signed .pkpass. Authorised solely by the token above.
   */
  app.get("/", async (request, reply) => {
    const { token } = request.query as { token?: string };
    if (!token) {
      return reply.status(401).send({ error: "Missing pass token" });
    }

    let payload: WalletPassJwtPayload;
    try {
      payload = app.jwt.verify<WalletPassJwtPayload>(token);
    } catch {
      // Covers both a tampered token and an expired one. They are not
      // distinguished on purpose -- the client's recovery is identical, and
      // saying which is which tells an attacker whether a forgery was
      // structurally valid.
      return reply.status(401).send({ error: "Invalid or expired pass token" });
    }

    if (payload.role !== "wallet-pass") {
      return reply.status(403).send({ error: "Forbidden" });
    }

    const customer = await app.prisma.consumerUser.findUnique({
      where: { id: payload.sub },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!customer) {
      // The account was deleted between minting the token and opening it.
      return reply.status(404).send({ error: "Account not found" });
    }

    const result = await buildWalletPass(customer);

    if (!result.ok) {
      // Logged at error level because both failure modes are operational, not
      // user error: the certificates are missing, or they are wrong. Neither
      // is something the customer can act on, and neither should be silent.
      request.log.error(
        { errorCode: result.errorCode, detail: result.detail },
        "wallet pass generation failed",
      );
      return reply
        .status(503)
        .send({ error: "Wallet pass unavailable", errorCode: result.errorCode });
    }

    return reply
      .header("Content-Type", "application/vnd.apple.pkpass")
      .header(
        "Content-Disposition",
        'attachment; filename="funfsterne-treuekarte.pkpass"',
      )
      // The pass embeds an account identifier. It must not sit in a shared
      // cache, and re-fetching is cheap.
      .header("Cache-Control", "no-store")
      .send(result.buffer);
  });
}
