-- P0 negative RLS test: an authenticated user must NOT be able to read another user's
-- row from public.users.
--
-- Reproduce with:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_users_select_test.sql
--
-- Properties:
--   * Runs entirely inside a transaction that is ROLLBACK'd -- it changes no data.
--   * Prints only counts and PASS/FAIL; it never prints user data.
--   * Exits non-zero (via RAISE EXCEPTION + ON_ERROR_STOP) when RLS is broken, so it is
--     usable as a CI gate.
--   * Requires a connecting role that may `SET LOCAL ROLE authenticated`
--     (Supabase: `postgres` / `service_role` are members; a plain superuser works too).
--   * Requires at least two rows in public.users. If the table has fewer, the test
--     reports a precondition failure rather than a false pass.
--
-- Expected result after supabase/migrations/20261005181500_security_hardening.sql:
--   NOTICE:  RLS PASS: user A sees 1 row(s) and cannot read user B

BEGIN;

-- Capture two distinct actor rows using the privileged connection, then hand the ids to
-- the `authenticated` role through a temporary table.
CREATE TEMP TABLE _p0_ids ON COMMIT DROP AS
SELECT
  (SELECT id FROM public.users ORDER BY id LIMIT 1) AS a,
  (SELECT id FROM public.users WHERE id <> (SELECT id FROM public.users ORDER BY id LIMIT 1)
     ORDER BY id LIMIT 1) AS b;

GRANT SELECT ON _p0_ids TO authenticated;

DO $pre$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM _p0_ids;
  IF r.a IS NULL THEN
    RAISE EXCEPTION 'precondition failed: public.users must contain at least 1 row';
  END IF;
  IF r.b IS NULL THEN
    RAISE EXCEPTION 'precondition failed: public.users must contain at least 2 distinct rows';
  END IF;
  RAISE NOTICE 'precondition ok: 2 distinct users available; acting as user A';
END
$pre$;

-- Become user A: set the JWT claims auth.uid() reads, then drop to the Supabase
-- `authenticated` role so RLS is enforced.
SELECT set_config(
  'request.jwt.claims',
  (SELECT json_build_object('sub', a::text, 'role', 'authenticated')::text FROM _p0_ids),
  true
);
SET LOCAL ROLE authenticated;

DO $assert$
DECLARE
  r record;
  n_total int;
  n_other int;
BEGIN
  SELECT * INTO r FROM _p0_ids;

  SELECT count(*) INTO n_total FROM public.users;
  SELECT count(*) INTO n_other FROM public.users WHERE id = r.b;

  IF n_other <> 0 THEN
    RAISE EXCEPTION 'RLS FAIL: authenticated user A can read user B''s row';
  END IF;

  IF n_total > 1 THEN
    RAISE EXCEPTION 'RLS FAIL: authenticated user A can read % rows (expected at most 1)', n_total;
  END IF;

  IF n_total <> 1 THEN
    RAISE EXCEPTION 'RLS FAIL: authenticated user A sees % rows (expected exactly its own)', n_total;
  END IF;

  RAISE NOTICE 'RLS PASS: user A sees % row(s) and cannot read user B', n_total;
END
$assert$;

ROLLBACK;
