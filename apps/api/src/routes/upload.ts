import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { adminAuthMiddleware } from "../middleware/admin-auth.js";

/**
 * Image types this endpoint will store, and the extension each is written
 * with.
 *
 * An allowlist rather than a passthrough of `data.mimetype`: the bucket is
 * served publicly, so storing whatever content type the client declared
 * would let an `image/svg+xml` (or text/html) upload execute script on the
 * storage origin. SVG is deliberately absent for that reason.
 */
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export async function uploadRoutes(app: FastifyInstance) {
  app.addHook("preHandler", adminAuthMiddleware);

  app.post("/image", async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: "No image file provided" });
    }

    const extension = ALLOWED_IMAGE_TYPES[data.mimetype];
    if (!extension) {
      return reply.status(415).send({
        error: "Unsupported image type",
        errorCode: "UNSUPPORTED_MEDIA_TYPE",
      });
    }

    const buffer = await data.toBuffer();
    // The object key is generated, never derived from `data.filename`.
    // Supabase treats "/" in a key as a path separator, so a client-supplied
    // name like "../../x.png" would write outside the intended prefix.
    const filename = `${Date.now()}-${randomUUID()}.${extension}`;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "product-images";

    const { error } = await app.supabase.storage
      .from(bucket)
      .upload(filename, buffer, {
        contentType: data.mimetype,
        upsert: false,
      });

    if (error) {
      request.log.error(error);
      return reply.status(500).send({ error: "Failed to upload image" });
    }

    const {
      data: { publicUrl },
    } = app.supabase.storage.from(bucket).getPublicUrl(filename);

    return { url: publicUrl };
  });
}
