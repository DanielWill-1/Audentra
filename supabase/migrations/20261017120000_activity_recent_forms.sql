BEGIN;

DO $$
BEGIN
  IF obj_description('public.templates'::regclass, 'pg_class') IS DISTINCT FROM
     'P5 schema marker: baseline 2026-10-11 v1' OR
     to_regclass('public.filled_templates') IS NULL OR
     to_regprocedure('public.p5_guard_filled_update()') IS NULL THEN
    RAISE EXCEPTION 'Activity and Recent Forms migration requires the accepted P5 schema';
  END IF;
END
$$;

ALTER TABLE public.filled_templates
  ADD COLUMN IF NOT EXISTS submission_key uuid;

CREATE UNIQUE INDEX IF NOT EXISTS filled_templates_user_submission_key_idx
  ON public.filled_templates(user_id, submission_key)
  WHERE submission_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.p5_guard_filled_update() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR
     NEW.user_id IS DISTINCT FROM OLD.user_id OR
     NEW.created_at IS DISTINCT FROM OLD.created_at OR
     NEW.submission_key IS DISTINCT FROM OLD.submission_key THEN
    RAISE EXCEPTION 'Filled form owner and identity are immutable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$$;

CREATE TABLE public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'form_saved', 'form_deleted',
    'template_created', 'template_updated', 'template_deleted',
    'template_shared', 'share_role_changed', 'template_unshared',
    'review_created', 'review_updated', 'review_status_changed',
    'schedule_created', 'schedule_updated', 'schedule_status_changed', 'schedule_deleted'
  )),
  entity_kind text NOT NULL CHECK (entity_kind IN ('filled_form', 'template', 'share', 'review', 'schedule')),
  entity_id uuid NOT NULL,
  related_template_id uuid,
  label varchar(200) NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object' AND octet_length(metadata::text) <= 2048),
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX activity_events_user_time_idx
  ON public.activity_events(user_id, occurred_at DESC, id DESC);
CREATE INDEX activity_events_user_type_time_idx
  ON public.activity_events(user_id, event_type, occurred_at DESC, id DESC);
CREATE UNIQUE INDEX activity_events_saved_form_once_idx
  ON public.activity_events(user_id, entity_id)
  WHERE event_type = 'form_saved' AND entity_kind = 'filled_form';

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY activity_events_select_owner ON public.activity_events
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY activity_events_delete_owner ON public.activity_events
  FOR DELETE TO authenticated USING (user_id = auth.uid());

REVOKE ALL ON public.activity_events FROM PUBLIC;
REVOKE ALL ON public.activity_events FROM anon;
REVOKE ALL ON public.activity_events FROM authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, DELETE ON public.activity_events TO authenticated;

CREATE FUNCTION public.p11_activity_record(
  p_event_type text,
  p_entity_kind text,
  p_entity_id uuid,
  p_related_template_id uuid,
  p_label text,
  p_metadata jsonb,
  p_occurred_at timestamptz DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF actor IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.activity_events (
    user_id, event_type, entity_kind, entity_id, related_template_id, label, metadata, occurred_at
  ) VALUES (
    actor,
    p_event_type,
    p_entity_kind,
    p_entity_id,
    p_related_template_id,
    left(coalesce(p_label, ''), 200),
    coalesce(p_metadata, '{}'::jsonb),
    coalesce(p_occurred_at, statement_timestamp())
  )
  ON CONFLICT DO NOTHING;
END
$$;

CREATE FUNCTION public.p11_capture_filled_form_activity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL AND auth.uid() = NEW.user_id THEN
      PERFORM public.p11_activity_record(
        'form_saved', 'filled_form', NEW.id, NEW.template_id, NEW.template_name,
        '{"source":"live"}'::jsonb, NEW.created_at
      );
    END IF;
    RETURN NEW;
  END IF;

  IF pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.user_id THEN
    PERFORM public.p11_activity_record(
      'form_deleted', 'filled_form', OLD.id, OLD.template_id, OLD.template_name, '{}'::jsonb, NULL
    );
  END IF;
  RETURN OLD;
END
$$;

CREATE FUNCTION public.p11_capture_template_activity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE
  changes text[] := ARRAY[]::text[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL AND auth.uid() = NEW.created_by THEN
      PERFORM public.p11_activity_record(
        'template_created', 'template', NEW.id, NEW.id, NEW.name, '{}'::jsonb, NEW.created_at
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF pg_trigger_depth() > 1 THEN
      RETURN OLD;
    END IF;
    IF auth.uid() IS NOT NULL AND auth.uid() = OLD.created_by THEN
      PERFORM public.p11_activity_record(
        'template_deleted', 'template', OLD.id, OLD.id, OLD.name, '{}'::jsonb, NULL
      );
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.name IS DISTINCT FROM OLD.name THEN changes := array_append(changes, 'name'); END IF;
  IF NEW.category IS DISTINCT FROM OLD.category THEN changes := array_append(changes, 'category'); END IF;
  IF NEW.description IS DISTINCT FROM OLD.description THEN changes := array_append(changes, 'description'); END IF;
  IF NEW.form_data IS DISTINCT FROM OLD.form_data THEN changes := array_append(changes, 'fields'); END IF;
  IF NEW.uploaded_file IS DISTINCT FROM OLD.uploaded_file THEN changes := array_append(changes, 'file'); END IF;
  IF NEW.visibility IS DISTINCT FROM OLD.visibility THEN changes := array_append(changes, 'visibility'); END IF;

  IF cardinality(changes) > 0 AND auth.uid() IS NOT NULL THEN
    PERFORM public.p11_activity_record(
      'template_updated', 'template', NEW.id, NEW.id, NEW.name,
      jsonb_build_object('changes', to_jsonb(changes)), NULL
    );
  END IF;
  RETURN NEW;
END
$$;

CREATE FUNCTION public.p11_capture_share_activity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE
  template_label text;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL AND auth.uid() = NEW.shared_by THEN
      SELECT name INTO template_label FROM public.templates WHERE id = NEW.template_id;
      PERFORM public.p11_activity_record(
        'template_shared', 'share', NEW.id, NEW.template_id, template_label,
        jsonb_build_object('role', NEW.role), NEW.shared_at
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role AND auth.uid() IS NOT NULL THEN
      SELECT name INTO template_label FROM public.templates WHERE id = NEW.template_id;
      PERFORM public.p11_activity_record(
        'share_role_changed', 'share', NEW.id, NEW.template_id, template_label,
        jsonb_build_object('from_role', OLD.role, 'to_role', NEW.role), NULL
      );
    END IF;
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    SELECT name INTO template_label FROM public.templates WHERE id = OLD.template_id;
    PERFORM public.p11_activity_record(
      'template_unshared', 'share', OLD.id, OLD.template_id, template_label,
      jsonb_build_object('role', OLD.role), NULL
    );
  END IF;
  RETURN OLD;
END
$$;

CREATE FUNCTION public.p11_capture_review_activity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE
  template_label text;
  changes text[] := ARRAY[]::text[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL AND auth.uid() = NEW.reviewer_id THEN
      SELECT name INTO template_label FROM public.templates WHERE id = NEW.template_id;
      PERFORM public.p11_activity_record(
        'review_created', 'review', NEW.id, NEW.template_id, template_label,
        jsonb_build_object('status', NEW.status), NEW.created_at
      );
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF auth.uid() IS NOT NULL THEN
      SELECT name INTO template_label FROM public.templates WHERE id = NEW.template_id;
      PERFORM public.p11_activity_record(
        'review_status_changed', 'review', NEW.id, NEW.template_id, template_label,
        jsonb_build_object('status', NEW.status), NULL
      );
    END IF;
  ELSE
    IF NEW.rating IS DISTINCT FROM OLD.rating THEN changes := array_append(changes, 'rating'); END IF;
    IF NEW.comment IS DISTINCT FROM OLD.comment THEN changes := array_append(changes, 'comment'); END IF;
    IF cardinality(changes) > 0 AND auth.uid() IS NOT NULL THEN
      SELECT name INTO template_label FROM public.templates WHERE id = NEW.template_id;
      PERFORM public.p11_activity_record(
        'review_updated', 'review', NEW.id, NEW.template_id, template_label,
        jsonb_build_object('changes', to_jsonb(changes)), NULL
      );
    END IF;
  END IF;
  RETURN NEW;
END
$$;

CREATE FUNCTION public.p11_capture_schedule_activity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE
  changes text[] := ARRAY[]::text[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL AND auth.uid() = NEW.created_by THEN
      PERFORM public.p11_activity_record(
        'schedule_created', 'schedule', NEW.id, NULL, NEW.title,
        jsonb_build_object('status', NEW.status), NEW.created_at
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF pg_trigger_depth() > 1 THEN
      RETURN OLD;
    END IF;
    IF auth.uid() IS NOT NULL AND auth.uid() = OLD.created_by THEN
      PERFORM public.p11_activity_record(
        'schedule_deleted', 'schedule', OLD.id, NULL, OLD.title,
        jsonb_build_object('status', OLD.status), NULL
      );
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF auth.uid() IS NOT NULL AND auth.uid() = NEW.created_by THEN
      PERFORM public.p11_activity_record(
        'schedule_status_changed', 'schedule', NEW.id, NULL, NEW.title,
        jsonb_build_object('from_status', OLD.status, 'to_status', NEW.status), NULL
      );
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.title IS DISTINCT FROM OLD.title THEN changes := array_append(changes, 'title'); END IF;
  IF NEW.description IS DISTINCT FROM OLD.description THEN changes := array_append(changes, 'description'); END IF;
  IF NEW.date IS DISTINCT FROM OLD.date THEN changes := array_append(changes, 'date'); END IF;
  IF NEW.time IS DISTINCT FROM OLD.time THEN changes := array_append(changes, 'time'); END IF;
  IF NEW.duration IS DISTINCT FROM OLD.duration THEN changes := array_append(changes, 'duration'); END IF;
  IF NEW.type IS DISTINCT FROM OLD.type THEN changes := array_append(changes, 'type'); END IF;
  IF NEW.priority IS DISTINCT FROM OLD.priority THEN changes := array_append(changes, 'priority'); END IF;
  IF NEW.attendees IS DISTINCT FROM OLD.attendees THEN changes := array_append(changes, 'attendees'); END IF;
  IF NEW.location IS DISTINCT FROM OLD.location THEN changes := array_append(changes, 'location'); END IF;
  IF NEW.form_id IS DISTINCT FROM OLD.form_id THEN changes := array_append(changes, 'form'); END IF;
  IF NEW.reminder_minutes IS DISTINCT FROM OLD.reminder_minutes THEN changes := array_append(changes, 'reminder'); END IF;

  IF cardinality(changes) > 0 AND auth.uid() IS NOT NULL AND auth.uid() = NEW.created_by THEN
    PERFORM public.p11_activity_record(
      'schedule_updated', 'schedule', NEW.id, NULL, NEW.title,
      jsonb_build_object('changes', to_jsonb(changes)), NULL
    );
  END IF;
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION public.p11_activity_record(text, text, uuid, uuid, text, jsonb, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.p11_capture_filled_form_activity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.p11_capture_template_activity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.p11_capture_share_activity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.p11_capture_review_activity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.p11_capture_schedule_activity() FROM PUBLIC;

CREATE TRIGGER p11_activity_filled_forms
  AFTER INSERT OR DELETE ON public.filled_templates
  FOR EACH ROW EXECUTE FUNCTION public.p11_capture_filled_form_activity();
CREATE TRIGGER p11_activity_templates
  AFTER INSERT OR UPDATE OR DELETE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.p11_capture_template_activity();
CREATE TRIGGER p11_activity_shares
  AFTER INSERT OR UPDATE OR DELETE ON public.template_shares
  FOR EACH ROW EXECUTE FUNCTION public.p11_capture_share_activity();
CREATE TRIGGER p11_activity_reviews
  AFTER INSERT OR UPDATE ON public.template_reviews
  FOR EACH ROW EXECUTE FUNCTION public.p11_capture_review_activity();
CREATE TRIGGER p11_activity_schedules
  AFTER INSERT OR UPDATE OR DELETE ON public.scheduled_events
  FOR EACH ROW EXECUTE FUNCTION public.p11_capture_schedule_activity();

INSERT INTO public.activity_events (
  user_id, event_type, entity_kind, entity_id, related_template_id, label, metadata, occurred_at
)
SELECT
  user_id, 'form_saved', 'filled_form', id, template_id, left(template_name, 200),
  '{"source":"backfill"}'::jsonb, created_at
FROM public.filled_templates
ON CONFLICT DO NOTHING;

COMMIT;
