-- Guarded P5 application-schema reconciliation for the verified development target.
-- Safe only when all six application tables are absent or a complete P5 v1 schema exists.
-- DDL runs in a transaction and can be re-applied without changing the resulting catalog.
BEGIN;
DO $p5_guard$
DECLARE
  existing_tables integer;
  secure_tables integer;
  app_policies integer;
BEGIN
  SELECT count(*) INTO existing_tables
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname IN
    ('users','templates','template_shares','template_reviews','scheduled_events','filled_templates')
    AND c.relkind IN ('r','p');
  IF existing_tables NOT IN (0,6) THEN
    RAISE EXCEPTION 'P5 reconciliation found a partial application schema; no changes made';
  END IF;
  IF existing_tables=6 THEN
    SELECT count(*) INTO secure_tables
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN
      ('users','templates','template_shares','template_reviews','scheduled_events','filled_templates')
      AND c.relrowsecurity;
    SELECT count(*) INTO app_policies FROM pg_policies
    WHERE schemaname='public' AND tablename IN
      ('users','templates','template_shares','template_reviews','scheduled_events','filled_templates');
    IF secure_tables<>6 OR app_policies<>23 OR
       obj_description('public.templates'::regclass,'pg_class') IS DISTINCT FROM 'P5 schema marker: baseline 2026-10-11 v1' OR
       to_regprocedure('public.p5_can_read_template(uuid)') IS NULL OR
       NOT EXISTS (
         SELECT 1 FROM pg_auth_members m
         JOIN pg_roles parent ON parent.oid=m.roleid
         JOIN pg_roles member ON member.oid=m.member
         WHERE parent.rolname='authenticated' AND member.rolname='django_data'
       ) THEN
      RAISE EXCEPTION 'Existing P5 objects do not match the recorded complete baseline; no changes made';
    END IF;
  END IF;
END
$p5_guard$;
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  company text NOT NULL DEFAULT '',
  industry text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('healthcare','fieldwork','hr','legal','education','realestate')),
  description text,
  form_data jsonb,
  uploaded_file text,
  visibility text NOT NULL DEFAULT 'visible' CHECK (visibility IN ('visible','hidden')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.template_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('viewer','editor','admin')),
  shared_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_at timestamptz NOT NULL DEFAULT now(),
  message text NOT NULL DEFAULT '',
  is_hidden boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, recipient_id)
);

CREATE TABLE IF NOT EXISTS public.template_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_name text NOT NULL DEFAULT '',
  rating smallint NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
  comment text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','needs_changes')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, reviewer_id)
);

CREATE TABLE IF NOT EXISTS public.scheduled_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  date date NOT NULL,
  time time NOT NULL,
  duration integer NOT NULL DEFAULT 60 CHECK (duration > 0),
  type text NOT NULL DEFAULT 'other' CHECK (type IN ('form_review','team_meeting','training','maintenance','other')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  attendees jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(attendees) = 'array'),
  location text NOT NULL DEFAULT '',
  form_id uuid,
  reminder_minutes integer NOT NULL DEFAULT 15 CHECK (reminder_minutes >= 0),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.filled_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.templates(id) ON DELETE SET NULL,
  template_name text NOT NULL,
  form_data jsonb NOT NULL CHECK (jsonb_typeof(form_data) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS templates_created_by_idx ON public.templates(created_by);
CREATE INDEX IF NOT EXISTS templates_category_idx ON public.templates(category);
CREATE INDEX IF NOT EXISTS templates_visibility_idx ON public.templates(visibility);
CREATE INDEX IF NOT EXISTS template_shares_recipient_idx ON public.template_shares(recipient_id, shared_at DESC);
CREATE INDEX IF NOT EXISTS template_shares_template_idx ON public.template_shares(template_id);
CREATE INDEX IF NOT EXISTS template_reviews_reviewer_idx ON public.template_reviews(reviewer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS template_reviews_template_status_idx ON public.template_reviews(template_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS scheduled_events_actor_date_time_idx ON public.scheduled_events(created_by, date, time);
CREATE INDEX IF NOT EXISTS scheduled_events_actor_status_idx ON public.scheduled_events(created_by, status, date);
CREATE INDEX IF NOT EXISTS scheduled_events_actor_type_idx ON public.scheduled_events(created_by, type, date);
CREATE INDEX IF NOT EXISTS filled_templates_user_created_idx ON public.filled_templates(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.p5_set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog
AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public.p5_is_template_owner(p_template_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$ SELECT EXISTS (SELECT 1 FROM public.templates t WHERE t.id = p_template_id AND t.created_by = auth.uid()) $$;

CREATE OR REPLACE FUNCTION public.p5_template_access_role(p_template_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
  SELECT CASE WHEN t.created_by = auth.uid() THEN 'owner' ELSE
    (SELECT s.role FROM public.template_shares s WHERE s.template_id = t.id AND s.recipient_id = auth.uid()) END
  FROM public.templates t WHERE t.id = p_template_id
$$;

CREATE OR REPLACE FUNCTION public.p5_can_read_template(p_template_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.templates t WHERE t.id = p_template_id AND (
      t.created_by = auth.uid() OR t.visibility = 'visible' OR
      EXISTS (SELECT 1 FROM public.template_shares s WHERE s.template_id = t.id AND s.recipient_id = auth.uid())
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.p5_can_manage_shares(p_template_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$ SELECT public.p5_is_template_owner(p_template_id) OR public.p5_template_access_role(p_template_id) = 'admin' $$;

CREATE OR REPLACE FUNCTION public.p5_object_template_id(p_path text) RETURNS uuid
LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog
AS $$
BEGIN
  IF p_path !~* '^templates/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{1,8}$' THEN
    RETURN NULL;
  END IF;
  RETURN split_part(p_path, '/', 2)::uuid;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END $$;

REVOKE ALL ON FUNCTION public.p5_is_template_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.p5_template_access_role(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.p5_can_read_template(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.p5_can_manage_shares(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.p5_object_template_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.p5_is_template_owner(uuid), public.p5_template_access_role(uuid), public.p5_can_read_template(uuid), public.p5_can_manage_shares(uuid), public.p5_object_template_id(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.p5_guard_template_identity() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Template identity and ownership are immutable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.p5_guard_template_file_reference() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.uploaded_file IS NOT NULL AND public.p5_object_template_id(NEW.uploaded_file) IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'Template file reference must use the generated template object path' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.p5_guard_share_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE actor uuid := auth.uid();
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.template_id IS DISTINCT FROM OLD.template_id OR
     NEW.recipient_id IS DISTINCT FROM OLD.recipient_id OR NEW.shared_by IS DISTINCT FROM OLD.shared_by OR
     NEW.shared_at IS DISTINCT FROM OLD.shared_at THEN
    RAISE EXCEPTION 'Share identity is immutable' USING ERRCODE = '42501';
  END IF;
  IF actor = OLD.recipient_id AND NOT public.p5_can_manage_shares(OLD.template_id) AND
     (NEW.role IS DISTINCT FROM OLD.role OR NEW.message IS DISTINCT FROM OLD.message OR NEW.updated_at IS DISTINCT FROM OLD.updated_at) THEN
    RAISE EXCEPTION 'Recipients may only change their own hidden preference' USING ERRCODE = '42501';
  END IF;
  IF actor IS NULL OR (actor <> OLD.recipient_id AND NOT public.p5_can_manage_shares(OLD.template_id)) THEN
    RAISE EXCEPTION 'Share update is not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.p5_guard_review_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE actor uuid := auth.uid();
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.template_id IS DISTINCT FROM OLD.template_id OR
     NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Review identity is immutable' USING ERRCODE = '42501';
  END IF;
  IF actor = OLD.reviewer_id THEN
    IF NEW.status IS DISTINCT FROM OLD.status OR NEW.reviewer_name IS DISTINCT FROM OLD.reviewer_name THEN
      RAISE EXCEPTION 'Review authors cannot set the decision status' USING ERRCODE = '42501';
    END IF;
  ELSIF public.p5_is_template_owner(OLD.template_id) THEN
    IF NEW.rating IS DISTINCT FROM OLD.rating OR NEW.comment IS DISTINCT FROM OLD.comment OR
       NEW.reviewer_name IS DISTINCT FROM OLD.reviewer_name THEN
      RAISE EXCEPTION 'Template owners may only change review status' USING ERRCODE = '42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'Review update is not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.p5_guard_filled_update() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Filled form owner and identity are immutable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.p5_set_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.p5_guard_template_identity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.p5_guard_template_file_reference() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.p5_guard_share_update() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.p5_guard_review_update() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.p5_guard_filled_update() FROM PUBLIC;

DROP TRIGGER IF EXISTS users_updated_at ON public.users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.p5_set_updated_at();
DROP TRIGGER IF EXISTS templates_updated_at ON public.templates;
CREATE TRIGGER templates_updated_at BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.p5_set_updated_at();
DROP TRIGGER IF EXISTS templates_identity_guard ON public.templates;
CREATE TRIGGER templates_identity_guard BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.p5_guard_template_identity();
DROP TRIGGER IF EXISTS templates_file_reference_guard ON public.templates;
CREATE TRIGGER templates_file_reference_guard BEFORE INSERT OR UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.p5_guard_template_file_reference();
DROP TRIGGER IF EXISTS shares_updated_at ON public.template_shares;
CREATE TRIGGER shares_updated_at BEFORE UPDATE ON public.template_shares FOR EACH ROW EXECUTE FUNCTION public.p5_set_updated_at();
DROP TRIGGER IF EXISTS shares_guard ON public.template_shares;
CREATE TRIGGER shares_guard BEFORE UPDATE ON public.template_shares FOR EACH ROW EXECUTE FUNCTION public.p5_guard_share_update();
DROP TRIGGER IF EXISTS reviews_updated_at ON public.template_reviews;
CREATE TRIGGER reviews_updated_at BEFORE UPDATE ON public.template_reviews FOR EACH ROW EXECUTE FUNCTION public.p5_set_updated_at();
DROP TRIGGER IF EXISTS reviews_guard ON public.template_reviews;
CREATE TRIGGER reviews_guard BEFORE UPDATE ON public.template_reviews FOR EACH ROW EXECUTE FUNCTION public.p5_guard_review_update();
DROP TRIGGER IF EXISTS scheduled_events_updated_at ON public.scheduled_events;
CREATE TRIGGER scheduled_events_updated_at BEFORE UPDATE ON public.scheduled_events FOR EACH ROW EXECUTE FUNCTION public.p5_set_updated_at();
DROP TRIGGER IF EXISTS filled_templates_guard ON public.filled_templates;
CREATE TRIGGER filled_templates_guard BEFORE UPDATE ON public.filled_templates FOR EACH ROW EXECUTE FUNCTION public.p5_guard_filled_update();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filled_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_self ON public.users;
CREATE POLICY users_select_self ON public.users FOR SELECT TO authenticated USING (id = auth.uid());
DROP POLICY IF EXISTS users_insert_self ON public.users;
CREATE POLICY users_insert_self ON public.users FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS users_update_self ON public.users;
CREATE POLICY users_update_self ON public.users FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS templates_select_accessible ON public.templates;
-- The direct owner branch also permits INSERT ... RETURNING before a helper query can see the new row.
CREATE POLICY templates_select_accessible ON public.templates FOR SELECT TO authenticated
USING (created_by = auth.uid() OR public.p5_can_read_template(id));
DROP POLICY IF EXISTS templates_insert_owner ON public.templates;
CREATE POLICY templates_insert_owner ON public.templates FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS templates_update_owner_or_editor ON public.templates;
CREATE POLICY templates_update_owner_or_editor ON public.templates FOR UPDATE TO authenticated
  USING (public.p5_template_access_role(id) IN ('owner','editor','admin'))
  WITH CHECK (public.p5_template_access_role(id) IN ('owner','editor','admin'));
DROP POLICY IF EXISTS templates_delete_owner ON public.templates;
CREATE POLICY templates_delete_owner ON public.templates FOR DELETE TO authenticated USING (created_by = auth.uid());

DROP POLICY IF EXISTS shares_select_participants ON public.template_shares;
CREATE POLICY shares_select_participants ON public.template_shares FOR SELECT TO authenticated
  USING (recipient_id = auth.uid() OR public.p5_can_manage_shares(template_id));
DROP POLICY IF EXISTS shares_insert_managers ON public.template_shares;
CREATE POLICY shares_insert_managers ON public.template_shares FOR INSERT TO authenticated
  WITH CHECK (shared_by = auth.uid() AND public.p5_can_manage_shares(template_id));
DROP POLICY IF EXISTS shares_update_managers_or_recipient ON public.template_shares;
CREATE POLICY shares_update_managers_or_recipient ON public.template_shares FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid() OR public.p5_can_manage_shares(template_id))
  WITH CHECK (recipient_id = auth.uid() OR public.p5_can_manage_shares(template_id));
DROP POLICY IF EXISTS shares_delete_managers_or_recipient ON public.template_shares;
CREATE POLICY shares_delete_managers_or_recipient ON public.template_shares FOR DELETE TO authenticated
  USING (recipient_id = auth.uid() OR public.p5_can_manage_shares(template_id));

DROP POLICY IF EXISTS reviews_select_author_or_owner ON public.template_reviews;
CREATE POLICY reviews_select_author_or_owner ON public.template_reviews FOR SELECT TO authenticated
  USING (reviewer_id = auth.uid() OR public.p5_is_template_owner(template_id));
DROP POLICY IF EXISTS reviews_insert_eligible_author ON public.template_reviews;
CREATE POLICY reviews_insert_eligible_author ON public.template_reviews FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid() AND status = 'pending' AND public.p5_can_read_template(template_id) AND NOT public.p5_is_template_owner(template_id));
DROP POLICY IF EXISTS reviews_update_author_or_owner ON public.template_reviews;
CREATE POLICY reviews_update_author_or_owner ON public.template_reviews FOR UPDATE TO authenticated
  USING (reviewer_id = auth.uid() OR public.p5_is_template_owner(template_id))
  WITH CHECK (reviewer_id = auth.uid() OR public.p5_is_template_owner(template_id));
DROP POLICY IF EXISTS reviews_delete_author_or_owner ON public.template_reviews;
CREATE POLICY reviews_delete_author_or_owner ON public.template_reviews FOR DELETE TO authenticated
  USING (reviewer_id = auth.uid() OR public.p5_is_template_owner(template_id));

DROP POLICY IF EXISTS events_select_owner ON public.scheduled_events;
CREATE POLICY events_select_owner ON public.scheduled_events FOR SELECT TO authenticated USING (created_by = auth.uid());
DROP POLICY IF EXISTS events_insert_owner ON public.scheduled_events;
CREATE POLICY events_insert_owner ON public.scheduled_events FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS events_update_owner ON public.scheduled_events;
CREATE POLICY events_update_owner ON public.scheduled_events FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS events_delete_owner ON public.scheduled_events;
CREATE POLICY events_delete_owner ON public.scheduled_events FOR DELETE TO authenticated USING (created_by = auth.uid());

DROP POLICY IF EXISTS filled_select_owner ON public.filled_templates;
CREATE POLICY filled_select_owner ON public.filled_templates FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS filled_insert_owner ON public.filled_templates;
CREATE POLICY filled_insert_owner ON public.filled_templates FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (template_id IS NULL OR public.p5_can_read_template(template_id)));
DROP POLICY IF EXISTS filled_update_owner ON public.filled_templates;
CREATE POLICY filled_update_owner ON public.filled_templates FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS filled_delete_owner ON public.filled_templates;
CREATE POLICY filled_delete_owner ON public.filled_templates FOR DELETE TO authenticated USING (user_id = auth.uid());

DO $$
DECLARE target_role text;
BEGIN
  EXECUTE 'REVOKE ALL ON public.users, public.templates, public.template_shares, public.template_reviews, public.scheduled_events, public.filled_templates FROM PUBLIC';
  FOREACH target_role IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = target_role) THEN
      EXECUTE format(
        'REVOKE ALL ON public.users, public.templates, public.template_shares, public.template_reviews, public.scheduled_events, public.filled_templates FROM %I',
        target_role
      );
    END IF;
  END LOOP;
END $$;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT ON public.users TO authenticated;
GRANT UPDATE (first_name,last_name,company,industry) ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.templates, public.template_shares, public.template_reviews,
  public.scheduled_events, public.filled_templates TO authenticated;

-- django_data receives only the ability to SET LOCAL ROLE authenticated;
-- no inherited privileges are added to the login role.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'django_data') THEN
    EXECUTE 'GRANT authenticated TO django_data WITH INHERIT FALSE, SET TRUE';
  END IF;
END $$;

COMMENT ON TABLE public.templates IS 'P5 schema marker: baseline 2026-10-11 v1';
COMMENT ON TABLE public.users IS 'Private own-profile data; no public email directory.';
COMMENT ON TABLE public.template_shares IS 'ID-addressed shares for existing Supabase users; no email invitations.';
COMMENT ON TABLE public.template_reviews IS 'Reviews visible to the reviewer and reviewed-template owner.';

-- Apply after the P5 application baseline and private template-files bucket exist.
-- Object path: templates/<template UUID>/<generated object UUID>.<validated extension>
-- Only Storage APIs may create/delete objects; this file defines Storage RLS only.
DROP POLICY IF EXISTS template_files_read_access ON storage.objects;
CREATE POLICY template_files_read_access ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'template-files'
  AND public.p5_object_template_id(name) IS NOT NULL
  AND (
    owner_id = (select auth.uid()::text)
    OR public.p5_template_access_role(public.p5_object_template_id(name)) IN ('owner','viewer','editor','admin')
  )
);

DROP POLICY IF EXISTS template_files_owner_upload ON storage.objects;
CREATE POLICY template_files_owner_upload ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'template-files'
  AND public.p5_object_template_id(name) IS NOT NULL
  AND owner_id = (select auth.uid()::text)
  AND public.p5_is_template_owner(public.p5_object_template_id(name))
);

DROP POLICY IF EXISTS template_files_owner_update ON storage.objects;
CREATE POLICY template_files_owner_update ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'template-files'
  AND owner_id = (select auth.uid()::text)
  AND public.p5_is_template_owner(public.p5_object_template_id(name))
)
WITH CHECK (
  bucket_id = 'template-files'
  AND owner_id = (select auth.uid()::text)
  AND public.p5_is_template_owner(public.p5_object_template_id(name))
);

DROP POLICY IF EXISTS template_files_owner_delete ON storage.objects;
CREATE POLICY template_files_owner_delete ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'template-files'
  AND owner_id = (select auth.uid()::text)
  AND public.p5_is_template_owner(public.p5_object_template_id(name))
);

COMMIT;
