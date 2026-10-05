/*
  # P0 security hardening (append-only)

  Created by the P0 phase of `docs/python-migration-plan.md` (v0.3).
  See `docs/security-remediation.md` for the findings and the reasoning.

  ## Rules obeyed by this migration
  - It is APPEND-ONLY. No previously applied migration file was modified.
  - It is IDEMPOTENT: applying it a second time changes nothing.
  - It is GUARDED: every statement is conditioned on the object it expects to exist,
    so it is a no-op rather than an error on a database that partially differs.
  - It is ADDITIVE/RESTRICTIVE only for `public.users`: it removes an over-permissive
    read policy and replaces it with a self-scoped one. It grants no new access.

  ## Changes
  1. `public.users`
     - DROP the over-permissive SELECT policy `Authenticated users can read user data`
       (`USING (true)`), which allowed any authenticated user to read every user's
       email / name / company / industry.
     - CREATE the self-scoped SELECT policy `Users can read own row`
       (`USING (auth.uid() = id)`).
  2. `public.templates`
     - DROP the four duplicate PUBLIC-role policies created by
       `20250612155158_humble_fire.sql:16-37` (`Allow select/insert/update/delete own
       templates`). They carry no `TO` clause, so they apply to role PUBLIC. They are
       redundant: for a real session their predicate `created_by = auth.uid()` is a
       subset of the `TO authenticated` policies created by
       `20250612154531_dry_lantern.sql:24-50`, and for `anon`, `auth.uid()` is NULL so
       they never matched a row.
     - Each drop is guarded on the existence of its `TO authenticated` counterpart, so
       this migration can never reduce access: if the counterpart is missing, the
       duplicate is deliberately left in place.

  ## Deliberately NOT changed here
  - `filled_templates`: its DDL/ownership is absent from the repository and could not be
    verified against a reachable database in P0. Inventing RLS for it is forbidden.
    Recorded as CRITICAL BLOCKED -> P5a (schema reconciliation) in
    `docs/security-remediation.md`.
  - `template_shares` / `template_reviews`: missing DDL and incomplete policy sets.
    Owned by P5a.
  - No DELETE policy is added to `public.users`. One does not exist today, and adding one
    would grant a capability that does not currently exist.
  - `lib/scheduler.ts` `searchEvents` PostgREST filter interpolation is a code fix owned
    by P5b, not a schema change.
*/

-- ---------------------------------------------------------------------------
-- 1. public.users -- replace the over-permissive SELECT policy with a self-scoped one
-- ---------------------------------------------------------------------------
DO $p0$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    RAISE NOTICE 'P0: public.users not present; skipping users policy hardening';
    RETURN;
  END IF;

  -- RLS must be on for any policy to matter.
  ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

  -- Supabase's auth.uid() reads the sub claim from request.jwt.claims. If the auth
  -- schema is unavailable (non-Supabase environment) a self-scoped policy cannot be
  -- expressed, so we leave the schema untouched rather than create a policy that
  -- would reference a missing function.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'auth' AND p.proname = 'uid'
  ) THEN
    RAISE NOTICE 'P0: auth.uid() not present; skipping users policy hardening';
    RETURN;
  END IF;

  -- Remove the over-permissive policy (and any earlier variant of it).
  DROP POLICY IF EXISTS "Authenticated users can read user data" ON public.users;
  DROP POLICY IF EXISTS "All authenticated users can read all user data" ON public.users;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
      AND policyname = 'Users can read own row'
  ) THEN
    CREATE POLICY "Users can read own row"
      ON public.users
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
    RAISE NOTICE 'P0: created self-scoped SELECT policy on public.users';
  ELSE
    RAISE NOTICE 'P0: self-scoped SELECT policy on public.users already present';
  END IF;
END
$p0$;

-- ---------------------------------------------------------------------------
-- 2. public.templates -- drop duplicate PUBLIC-role policies (guarded, non-restrictive)
-- ---------------------------------------------------------------------------
DO $p0$
DECLARE
  pair record;
  has_counterpart boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'templates'
  ) THEN
    RAISE NOTICE 'P0: public.templates not present; skipping duplicate-policy cleanup';
    RETURN;
  END IF;

  FOR pair IN
    SELECT * FROM (VALUES
      ('Allow select own templates', 'Users can select own templates'),
      ('Allow insert own templates', 'Users can insert own templates'),
      ('Allow update own templates', 'Users can update own templates'),
      ('Allow delete own templates', 'Users can delete own templates')
    ) AS t(public_dup, authenticated_counterpart)
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'templates'
        AND policyname = pair.authenticated_counterpart
    ) INTO has_counterpart;

    IF has_counterpart THEN
      IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'templates'
          AND policyname = pair.public_dup
      ) THEN
        EXECUTE format('DROP POLICY %I ON public.templates', pair.public_dup);
        RAISE NOTICE 'P0: dropped redundant PUBLIC-role policy %', pair.public_dup;
      END IF;
    ELSE
      RAISE NOTICE
        'P0: kept % because its authenticated counterpart % is absent (dropping it could reduce access)',
        pair.public_dup, pair.authenticated_counterpart;
    END IF;
  END LOOP;
END
$p0$;
