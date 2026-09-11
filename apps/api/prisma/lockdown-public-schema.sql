-- ============================================================================
-- Close the public PostgREST surface on the Supabase database.
--
-- WHY
-- Supabase serves every table in `public` over HTTPS at /rest/v1/<Table>,
-- authorised by the `anon` key. That key is publishable by design -- it lives
-- in the dashboard and is meant to be embedded in clients -- so it must never
-- be the only thing standing in front of data.
--
-- On this project `anon` and `authenticated` had been granted
-- SELECT/INSERT/UPDATE/DELETE/TRUNCATE on every table, with row level security
-- switched off. Anyone holding the anon key could therefore read ConsumerUser
-- (names, usernames, bcrypt password hashes), read AdminUser, rewrite loyalty
-- balances, or TRUNCATE the lot.
--
-- Those grants are not something anyone chose: Supabase applies them by
-- default to new tables in `public`, and Prisma creates its tables there.
--
-- WHY REVOKE RATHER THAN WRITE POLICIES
-- Nothing in this stack uses the Supabase client SDK. The mobile app and the
-- admin both talk to the Fastify API, which connects as `postgres`. There is
-- no legitimate anon/authenticated traffic to police, so the right answer is
-- to remove the access, not to describe it.
--
-- WHY THIS DOES NOT BREAK THE API
-- The API connects as `postgres`, which has rolbypassrls = true, so RLS does
-- not apply to it. Verified on this database before writing this file.
-- `service_role` also bypasses RLS, which is what Supabase Storage uses.
--
-- Safe to run more than once.
-- ============================================================================

-- 1. Row level security on every existing table -------------------------------
-- With no policies attached, RLS denies everything to any role that does not
-- bypass it. This is the backstop: even if the grants below are ever restored
-- (a future `prisma db push`, a dashboard click, a Supabase default), the data
-- stays closed.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
  END LOOP;
END $$;

-- 2. Take away the privileges themselves --------------------------------------
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- 3. Stop PostgREST from seeing the schema at all ------------------------------
-- Storage and Auth live in the `storage` and `auth` schemas and are untouched
-- by this, so public image URLs keep working.
REVOKE USAGE ON SCHEMA public FROM anon, authenticated;

-- 4. Keep it that way for tables created later ---------------------------------
-- Without this, the next `prisma db push` that adds a table would hand `anon`
-- full access to it again and quietly reopen the hole.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- Same, but for objects created specifically by the `postgres` role, which is
-- the role Prisma connects as.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- 5. Show the result -----------------------------------------------------------
SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       COALESCE((
         SELECT string_agg(DISTINCT g.privilege_type, ',')
         FROM information_schema.role_table_grants g
         WHERE g.table_schema = 'public'
           AND g.table_name = c.relname
           AND g.grantee IN ('anon', 'authenticated')
       ), 'none') AS anon_privileges
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;
