BEGIN;

ALTER TABLE public.activity_events
  DROP CONSTRAINT activity_events_event_type_check,
  ADD CONSTRAINT activity_events_event_type_check CHECK (event_type IN (
    'form_saved', 'form_deleted',
    'template_created', 'template_updated', 'template_deleted',
    'template_shared', 'share_role_changed', 'template_unshared',
    'review_created', 'review_updated', 'review_status_changed', 'review_deleted',
    'schedule_created', 'schedule_updated', 'schedule_status_changed', 'schedule_deleted'
  ));

CREATE OR REPLACE FUNCTION public.p11_capture_share_activity() RETURNS trigger
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

  -- PostgreSQL's FK cascade can run the child-row trigger at depth 1. The
  -- missing parent check distinguishes that cleanup from an explicit unshare.
  IF NOT EXISTS (SELECT 1 FROM public.templates WHERE id = OLD.template_id) THEN
    RETURN OLD;
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

CREATE OR REPLACE FUNCTION public.p11_capture_review_activity() RETURNS trigger
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
  ELSIF TG_OP = 'DELETE' THEN
    IF pg_trigger_depth() > 1 OR NOT EXISTS (
      SELECT 1 FROM public.templates WHERE id = OLD.template_id
    ) THEN
      RETURN OLD;
    END IF;
    IF auth.uid() IS NOT NULL THEN
      SELECT name INTO template_label FROM public.templates WHERE id = OLD.template_id;
      PERFORM public.p11_activity_record(
        'review_deleted', 'review', OLD.id, OLD.template_id, template_label,
        jsonb_build_object('status', OLD.status), NULL
      );
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.rating IS DISTINCT FROM OLD.rating THEN changes := array_append(changes, 'rating'); END IF;
  IF NEW.comment IS DISTINCT FROM OLD.comment THEN changes := array_append(changes, 'comment'); END IF;
  SELECT name INTO template_label FROM public.templates WHERE id = NEW.template_id;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF auth.uid() IS NOT NULL THEN
      PERFORM public.p11_activity_record(
        'review_status_changed', 'review', NEW.id, NEW.template_id, template_label,
        jsonb_build_object(
          'from_status', OLD.status,
          'to_status', NEW.status,
          'changes', to_jsonb(changes)
        ), NULL
      );
    END IF;
  ELSIF cardinality(changes) > 0 AND auth.uid() IS NOT NULL THEN
    PERFORM public.p11_activity_record(
      'review_updated', 'review', NEW.id, NEW.template_id, template_label,
      jsonb_build_object('changes', to_jsonb(changes)), NULL
    );
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER p11_activity_reviews ON public.template_reviews;
CREATE TRIGGER p11_activity_reviews
  AFTER INSERT OR UPDATE OR DELETE ON public.template_reviews
  FOR EACH ROW EXECUTE FUNCTION public.p11_capture_review_activity();

CREATE OR REPLACE FUNCTION public.p11_capture_schedule_activity() RETURNS trigger
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

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF auth.uid() IS NOT NULL AND auth.uid() = NEW.created_by THEN
      PERFORM public.p11_activity_record(
        'schedule_status_changed', 'schedule', NEW.id, NULL, NEW.title,
        jsonb_build_object(
          'from_status', OLD.status,
          'to_status', NEW.status,
          'changes', to_jsonb(changes)
        ), NULL
      );
    END IF;
  ELSIF cardinality(changes) > 0 AND auth.uid() IS NOT NULL AND auth.uid() = NEW.created_by THEN
    PERFORM public.p11_activity_record(
      'schedule_updated', 'schedule', NEW.id, NULL, NEW.title,
      jsonb_build_object('changes', to_jsonb(changes)), NULL
    );
  END IF;
  RETURN NEW;
END
$$;

COMMIT;
