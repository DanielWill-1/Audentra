-- Align the known legacy replay with the accepted P5 application schema.
-- Canonical P5 targets are unchanged. No table or application row is deleted.
-- Unexpected dependencies, NULL values or incompatible data abort the transaction.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $alignment$
BEGIN
  IF obj_description('public.templates'::regclass, 'pg_class') IS DISTINCT FROM
     'P5 schema marker: baseline 2026-10-11 v1' THEN
    RAISE EXCEPTION 'Legacy alignment requires the accepted P5 schema marker';
  END IF;

  LOCK TABLE public.users, public.templates, public.scheduled_events,
    public.template_shares, public.template_reviews, public.filled_templates
    IN ACCESS EXCLUSIVE MODE;

  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'public.users'::regclass AND attname = 'email' AND NOT attisdropped
  ) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'auth.users'::regclass AND tgname = 'on_auth_user_created'
      AND tgfoid = to_regprocedure('public.handle_new_user()')
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.users'::regclass AND polname = 'Users can read own row'
  ) THEN
    RAISE EXCEPTION 'Unrecognized legacy profile schema; inspect before alignment';
  END IF;

  -- The redundant email column may be removed only when Auth retains every value.
  -- The lock prevents new Auth/profile inserts racing this check and trigger removal.
  LOCK TABLE auth.users IN SHARE ROW EXCLUSIVE MODE;
  IF EXISTS (
    SELECT 1 FROM public.users profile LEFT JOIN auth.users identity ON identity.id = profile.id
    WHERE profile.email IS DISTINCT FROM identity.email
  ) THEN
    RAISE EXCEPTION 'Legacy profile email differs from Auth; no changes made';
  END IF;

  DROP TRIGGER on_auth_user_created ON auth.users;
  DROP FUNCTION public.handle_new_user();
  DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
  DROP TRIGGER IF EXISTS update_templates_updated_at ON public.templates;
  DROP TRIGGER IF EXISTS update_scheduled_events_updated_at ON public.scheduled_events;
  DROP FUNCTION IF EXISTS public.update_users_updated_at();
  DROP FUNCTION IF EXISTS public.update_updated_at_column();
  DROP FUNCTION IF EXISTS public.update_scheduled_events_updated_at();

  ALTER TABLE public.users DROP COLUMN email;
  ALTER TABLE public.users
    ALTER COLUMN first_name SET NOT NULL,
    ALTER COLUMN last_name SET NOT NULL,
    ALTER COLUMN company SET NOT NULL,
    ALTER COLUMN industry SET NOT NULL,
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL;
  ALTER TABLE public.templates
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL;
  ALTER TABLE public.scheduled_events
    ALTER COLUMN description SET NOT NULL,
    ALTER COLUMN duration SET NOT NULL,
    ALTER COLUMN attendees SET NOT NULL,
    ALTER COLUMN location SET NOT NULL,
    ALTER COLUMN reminder_minutes SET NOT NULL,
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL,
    ADD CONSTRAINT scheduled_events_attendees_check CHECK (jsonb_typeof(attendees) = 'array'),
    ADD CONSTRAINT scheduled_events_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

  DROP POLICY "Users can read own row" ON public.users;
  DROP INDEX IF EXISTS public.idx_users_email;
  DROP INDEX IF EXISTS public.idx_users_created_at;
  DROP INDEX IF EXISTS public.idx_templates_category;
  DROP INDEX IF EXISTS public.idx_templates_created_by;
  DROP INDEX IF EXISTS public.idx_templates_visibility;
  DROP INDEX IF EXISTS public.idx_scheduled_events_created_by;
  DROP INDEX IF EXISTS public.idx_scheduled_events_date;
  DROP INDEX IF EXISTS public.idx_scheduled_events_status;
  DROP INDEX IF EXISTS public.idx_scheduled_events_type;
  DROP INDEX IF EXISTS public.idx_scheduled_events_priority;
  DROP INDEX IF EXISTS public.idx_scheduled_events_date_time;
END
$alignment$;

DO $verification$
DECLARE
  app_tables text[] := ARRAY[
    'users','templates','template_shares','template_reviews','scheduled_events','filled_templates'
  ];
BEGIN
  IF (SELECT count(*) FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ANY(app_tables)) <> 57
     OR (SELECT count(*) FROM pg_constraint constraint_record
         JOIN pg_class relation ON relation.oid = constraint_record.conrelid
         JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
         WHERE namespace.nspname = 'public' AND relation.relname = ANY(app_tables)) <> 30
     OR (SELECT count(*) FROM pg_indexes
         WHERE schemaname = 'public' AND tablename = ANY(app_tables)) <> 19
     OR (SELECT count(*) FROM pg_policies
         WHERE schemaname = 'public' AND tablename = ANY(app_tables)) <> 23
     OR (SELECT count(*) FROM pg_trigger trigger_record
         JOIN pg_class relation ON relation.oid = trigger_record.tgrelid
         JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
         WHERE namespace.nspname = 'public' AND relation.relname = ANY(app_tables)
           AND NOT trigger_record.tgisinternal) <> 10 THEN
    RAISE EXCEPTION 'Application catalog does not match the P5 shape; alignment rolled back';
  END IF;
END
$verification$;
COMMIT;
