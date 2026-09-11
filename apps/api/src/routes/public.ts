import {
  ProductCategorySchema,
  ProductSchema,
  RegisterPushTokenSchema,
} from "@funfsterne/shared-types";
import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { serializePrisma } from "../serializers.js";
import { consumerAuthMiddleware } from "../middleware/consumer-auth.js";

/**
 * The header the app sends its install identifier in.
 *
 * Deliberately a header and not a query parameter. The device id is a stable
 * per-install value kept in the phone's Keychain or Keystore; in a URL it is
 * written verbatim into the application log, the platform's log retention,
 * and any proxy in the path. A header appears in none of those by default.
 *
 * It identifies a device, not a person, and it is never a credential -- the
 * account always comes from the verified JWT. Its only job is to recognise
 * redemptions made before accounts existed, and to stop one person claiming
 * the same coupon twice from two accounts on one handset.
 */
const DEVICE_ID_HEADER = "x-device-id";

/** Matches the v4 UUID the app generates. */
const DEVICE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Reads the device id, or null when it is absent or not the shape we issue.
 *
 * Ignoring a malformed value rather than rejecting the request: a client
 * with a corrupted id should still see its coupons, just without the
 * device-level matching. Validating the shape keeps anything arbitrary out
 * of the database query and out of anywhere it might later be written.
 */
function readDeviceId(request: { headers: Record<string, unknown> }): string | null {
  const raw = request.headers[DEVICE_ID_HEADER];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return null;
  return DEVICE_ID_PATTERN.test(value) ? value : null;
}

const ProductQuerySchema = z.object({
  category: ProductCategorySchema.optional(),
  branchId: z.string().optional(),
});

const RedeemDiscountCodeSchema = z.object({
  // Same shape the read path validates. This value lands in a column that
  // forms the one-claim-per-device index, so arbitrary strings do not belong
  // in it.
  //
  // Worth being plain about the limit: the device id is supplied by the
  // client and the server cannot verify it. Checking the shape keeps the
  // data clean and blocks casual misuse -- it is not a security boundary,
  // and was never the thing preventing double redemption. That is the
  // unique index on (userId, discountCodeId), and the account id comes from
  // the verified JWT where the client cannot touch it.
  deviceId: z.string().regex(DEVICE_ID_PATTERN, "Invalid device id"),
  branchId: z.string().optional(),
});

export async function publicRoutes(app: FastifyInstance) {
  app.get("/branches", async () => {
    return app.prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  });

  // Returns the admin-set category images as an array. The mobile app renders
  // a fallback for any category that isn't in the result (or whose imageUrl is
  // null/empty), so the response is intentionally the raw "what's in the DB"
  // rather than always 5 entries.
  app.get("/category-images", async () => {
    const images = await app.prisma.categoryImage.findMany({
      orderBy: { category: "asc" },
    });
    return serializePrisma(images);
  });

  app.get("/products", async (request, reply) => {
    const query = ProductQuerySchema.safeParse(request.query);
    if (!query.success) {
      // Sent as 400, not a 200 carrying an error body. The app checks
      // `res.ok`, so a 200 read as success and then threw trying to map an
      // object as an array -- a clean failure arriving as a crash.
      return reply.status(400).send({ error: "Invalid query parameters" });
    }

    const { category, branchId } = query.data;

    const products = await app.prisma.product.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
        ...(branchId
          ? { availabilities: { some: { branchId, inStock: true } } }
          : {}),
      },
      include: {
        availabilities: branchId ? { where: { branchId } } : false,
      },
      orderBy: { name: "asc" },
    });

    return serializePrisma(products);
  });

  app.get("/products/:id", async (request, reply) => {
    const parse = ProductSchema.shape.id.safeParse(
      (request.params as { id: string }).id,
    );
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid product id" });
    }

    const product = await app.prisma.product.findUnique({
      where: { id: parse.data, isActive: true },
      include: { availabilities: { include: { branch: true } } },
    });

    if (!product) {
      return reply.status(404).send({ error: "Product not found" });
    }

    return serializePrisma(product);
  });

  app.post(
    "/push-tokens",
    { preHandler: consumerAuthMiddleware },
    async (request, reply) => {
      const parse = RegisterPushTokenSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({ error: "Invalid push token payload" });
      }

      const { deviceId, token, platform } = parse.data;
      // userId always comes from the verified JWT, never the request body --
      // a client-supplied userId would let anyone attribute a push token to
      // someone else's account.
      const userId = request.consumer!.sub;

      const pushToken = await app.prisma.pushToken.upsert({
        where: { token },
        create: { deviceId, userId, token, platform },
        update: { deviceId, userId, platform },
      });

      return pushToken;
    },
  );

  // Per-customer, and authenticated for that reason.
  //
  // Returns two kinds of coupon, tagged with `status` so the app can put them
  // in its Active and Used tabs:
  //
  //   available -- live, unexpired, not yet at its redemption cap, and not
  //                already used by this customer
  //   redeemed  -- this customer has used it. Returned whatever state the
  //                coupon is in now, because this is their own history: a
  //                coupon they used should not vanish just because it later
  //                expired or the shop switched it off.
  //
  // Everything else is left out. An expired or withdrawn coupon this customer
  // never touched has no story to tell them, and showing it would grow the
  // list forever -- which is the problem this endpoint was built to solve.
  app.get(
    "/discount-codes/active",
    { preHandler: consumerAuthMiddleware },
    async (request) => {
      const now = new Date();
      const userId = request.consumer!.sub;
      const deviceId = readDeviceId(request);

      // Matched on device as well as account when the client tells us its
      // device id: redemptions made before accounts existed carry a deviceId
      // but no userId, and those would otherwise look unused.
      const mine = deviceId ? { OR: [{ userId }, { deviceId }] } : { userId };

      const codes = await app.prisma.discountCode.findMany({
        where: {
          OR: [
            {
              isActive: true,
              OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
              redemptions: { none: mine },
            },
            { redemptions: { some: mine } },
          ],
        },
        include: {
          scopeBranch: true,
          // Only this customer's own redemption, and only its timestamp --
          // the app shows when they used it, and no one else's row is any of
          // their business.
          redemptions: {
            where: mine,
            select: { redeemedAt: true },
            orderBy: { redeemedAt: "desc" },
            take: 1,
          },
        },
        orderBy: { code: "asc" },
      });

      type CustomerCode = Omit<(typeof codes)[number], "redemptions"> & {
        status: "available" | "redeemed";
        /** When this customer used it, or null if they have not. */
        redeemedAt: Date | null;
      };

      const result = codes.flatMap<CustomerCode>(({ redemptions, ...code }) => {
        const redeemedAt = redemptions[0]?.redeemedAt ?? null;

        if (redeemedAt) {
          return [{ ...code, status: "redeemed", redeemedAt }];
        }

        // Prisma cannot compare two columns of the same row in a `where`, so
        // the "fully used up" test happens here. Without it a coupon at its
        // cap stays on every customer's list and fails every time it is
        // dragged.
        const capped =
          code.maxRedemptions !== null &&
          code.currentRedemptions >= code.maxRedemptions;
        if (capped) return [];

        return [{ ...code, status: "available", redeemedAt: null }];
      });

      return serializePrisma(result);
    },
  );

  app.post(
    "/discount-codes/:code/redeem",
    { preHandler: consumerAuthMiddleware },
    async (request, reply) => {
      const code = (request.params as { code: string }).code;
      const parse = RedeemDiscountCodeSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({ error: "Invalid redemption payload" });
      }

      const { deviceId, branchId } = parse.data;
      // Same reasoning as push-tokens: userId comes from the verified JWT,
      // never the request body.
      const userId = request.consumer!.sub;

      const discount = await app.prisma.discountCode.findUnique({
        where: { code },
      });

      if (!discount) {
        return reply.status(404).send({ errorCode: "NOT_FOUND", error: "Discount code not found" });
      }

      if (!discount.isActive) {
        return reply.status(400).send({ errorCode: "INACTIVE", error: "Discount code is inactive" });
      }

      if (discount.expiresAt && discount.expiresAt < new Date()) {
        return reply.status(400).send({ errorCode: "EXPIRED", error: "Discount code expired" });
      }

      if (
        discount.maxRedemptions !== null &&
        discount.currentRedemptions >= discount.maxRedemptions
      ) {
        return reply.status(400).send({ errorCode: "MAX_REDEMPTIONS_REACHED", error: "Discount code fully redeemed" });
      }

      const [existingByDevice, existingByUser] = await Promise.all([
        app.prisma.discountCodeRedemption.findUnique({
          where: {
            deviceId_discountCodeId: { deviceId, discountCodeId: discount.id },
          },
        }),
        app.prisma.discountCodeRedemption.findUnique({
          where: {
            userId_discountCodeId: { userId, discountCodeId: discount.id },
          },
        }),
      ]);

      if (existingByDevice) {
        return reply.status(400).send({ errorCode: "ALREADY_REDEEMED_BY_DEVICE", error: "Discount code already redeemed on this device" });
      }

      if (existingByUser) {
        return reply.status(400).send({ errorCode: "ALREADY_REDEEMED_BY_USER", error: "Discount code already redeemed on this account" });
      }

      // The checks above are a fast path for good error messages; they are
      // not what enforces the limits. Two requests for the last remaining
      // use of a code can both pass a plain read, so the increment itself
      // is gated on the cap and Postgres decides the winner at write time.
      // (Per-user and per-device limits are enforced by the unique indexes
      // on the redemption row, which is why P2002 is a "someone else got
      // there first" answer rather than a 500.)
      const maxRedemptions = discount.maxRedemptions;

      const result = await app.prisma
        .$transaction(async (tx) => {
          const { count } = await tx.discountCode.updateMany({
            where: {
              id: discount.id,
              isActive: true,
              ...(maxRedemptions !== null
                ? { currentRedemptions: { lt: maxRedemptions } }
                : {}),
            },
            data: { currentRedemptions: { increment: 1 } },
          });

          if (count === 0) return null;

          const [updated, redemption] = await Promise.all([
            tx.discountCode.findUniqueOrThrow({ where: { id: discount.id } }),
            tx.discountCodeRedemption.create({
              data: {
                deviceId,
                userId,
                branchId: branchId ?? null,
                discountCodeId: discount.id,
              },
            }),
          ]);

          return { updated, redemption };
        })
        .catch((err: unknown) => {
          if (
            typeof err === "object" &&
            err !== null &&
            (err as { code?: string }).code === "P2002"
          ) {
            return "DUPLICATE" as const;
          }
          throw err;
        });

      if (result === "DUPLICATE") {
        return reply.status(400).send({
          errorCode: "ALREADY_REDEEMED_BY_USER",
          error: "Discount code already redeemed on this account",
        });
      }

      if (!result) {
        return reply.status(400).send({
          errorCode: "MAX_REDEMPTIONS_REACHED",
          error: "Discount code fully redeemed",
        });
      }

      return {
        success: true,
        discount: serializePrisma(result.updated),
        redemption: serializePrisma(result.redemption),
      };
    },
  );
}
