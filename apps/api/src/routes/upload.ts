import type { FastifyInstance } from "fastify";
import { adminAuthMiddleware } from "../middleware/admin-auth.js";

export async function uploadRoutes(app: FastifyInstance) {
  app.addHook("preHandler", adminAuthMiddleware);

  app.post("/image", async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: "No image file provided" });
    }

    const buffer = await data.toBuffer();
    const filename = `${Date.now()}-${data.filename}`;
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
