import multipart from "@fastify/multipart";
import fp from "fastify-plugin";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";

// Wrapped with fastify-plugin so the multipart body parser is registered on
// the parent Fastify instance rather than an encapsulated child context. Without
// this, route plugins registered later (in particular `uploadRoutes` under
// prefix "/admin/upload") do not see the multipart parser and respond with
// HTTP 415 Unsupported Media Type to any multipart/form-data request.
export const uploadPlugin = fp(async function uploadPlugin(app: FastifyInstance) {
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
});

declare module "fastify" {
  interface FastifyInstance {
    supabase: SupabaseClient;
  }
}
