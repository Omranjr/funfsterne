import multipart from "@fastify/multipart";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";

export async function uploadPlugin(app: FastifyInstance) {
  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5 MB
      files: 1,
    },
  });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required for uploads",
    );
  }

  const supabase: SupabaseClient = createClient(url, key);
  app.decorate("supabase", supabase);
}

declare module "fastify" {
  interface FastifyInstance {
    supabase: SupabaseClient;
  }
}
