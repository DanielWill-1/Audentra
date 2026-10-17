\set ON_ERROR_STOP on

-- Local-only acceptance checks. Every test row is rolled back at the end.
BEGIN;

SELECT gen_random_uuid() AS p11_owner \gset
SELECT gen_random_uuid() AS p11_reviewer \gset
SELECT gen_random_uuid() AS p11_cascade_recipient \gset
SELECT gen_random_uuid() AS p11_template \gset
SELECT gen_random_uuid() AS p11_share \gset
SELECT gen_random_uuid() AS p11_cascade_share \gset
SELECT gen_random_uuid() AS p11_form \gset
SELECT gen_random_uuid() AS p11_submission_key \gset
SELECT gen_random_uuid() AS p11_review \gset
SELECT gen_random_uuid() AS p11_delete_review \gset
SELECT gen_random_uuid() AS p11_schedule \gset
SELECT gen_random_uuid() AS p11_rollback_template \gset

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES
  (:'p11_owner'::uuid, 'authenticated', 'authenticated', :'p11_owner' || '@p11.invalid', '', now()),
  (:'p11_reviewer'::uuid, 'authenticated', 'authenticated', :'p11_reviewer' || '@p11.invalid', '', now()),
  (:'p11_cascade_recipient'::uuid, 'authenticated', 'authenticated', :'p11_cascade_recipient' || '@p11.invalid', '', now());

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.filled_templates AS f
    LEFT JOIN public.activity_events AS e
      ON e.user_id = f.user_id
      AND e.event_type = 'form_saved'
      AND e.entity_kind = 'filled_form'
      AND e.entity_id = f.id
    WHERE e.id IS NULL
  ) THEN
    RAISE EXCEPTION 'A historical saved form is missing its backfilled activity event';
  END IF;
END
$$;

SET LOCAL ROLE authenticated;
SET LOCAL search_path = public, auth;
SELECT set_config('request.jwt.claim.sub', :'p11_owner', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', :'p11_owner', 'role', 'authenticated')::text, true);
SELECT set_config('p11.owner_id', :'p11_owner', true);
SELECT set_config('p11.template_id', :'p11_template', true);
SELECT set_config('p11.form_id', :'p11_form', true);
SELECT set_config('p11.share_id', :'p11_share', true);
SELECT set_config('p11.cascade_share_id', :'p11_cascade_share', true);
SELECT set_config('p11.submission_key', :'p11_submission_key', true);
SELECT set_config('p11.review_id', :'p11_review', true);
SELECT set_config('p11.delete_review_id', :'p11_delete_review', true);
SELECT set_config('p11.schedule_id', :'p11_schedule', true);
SELECT set_config('p11.rollback_template_id', :'p11_rollback_template', true);

INSERT INTO public.templates (id, name, category, description, form_data, created_by)
VALUES (:'p11_template'::uuid, 'P11 activity acceptance', 'healthcare', 'synthetic', '{"fields":[]}'::jsonb, :'p11_owner'::uuid);
UPDATE public.templates SET name = 'P11 activity acceptance renamed' WHERE id = :'p11_template'::uuid;
UPDATE public.templates SET name = 'P11 activity acceptance renamed' WHERE id = :'p11_template'::uuid;

INSERT INTO public.template_shares (id, template_id, recipient_id, role, shared_by)
VALUES (:'p11_share'::uuid, :'p11_template'::uuid, :'p11_reviewer'::uuid, 'editor', :'p11_owner'::uuid);
INSERT INTO public.template_shares (id, template_id, recipient_id, role, shared_by)
VALUES (:'p11_cascade_share'::uuid, :'p11_template'::uuid, :'p11_cascade_recipient'::uuid, 'viewer', :'p11_owner'::uuid);
UPDATE public.template_shares SET role = 'viewer' WHERE id = :'p11_share'::uuid;
UPDATE public.template_shares SET is_hidden = true WHERE id = :'p11_share'::uuid;
UPDATE public.template_shares SET role = 'editor' WHERE id = :'p11_share'::uuid;
DELETE FROM public.template_shares WHERE id = :'p11_cascade_share'::uuid;
INSERT INTO public.template_shares (id, template_id, recipient_id, role, shared_by)
VALUES (:'p11_cascade_share'::uuid, :'p11_template'::uuid, :'p11_cascade_recipient'::uuid, 'viewer', :'p11_owner'::uuid);

INSERT INTO public.filled_templates (id, user_id, template_id, template_name, form_data, submission_key)
VALUES (:'p11_form'::uuid, :'p11_owner'::uuid, :'p11_template'::uuid, 'P11 activity acceptance', '{"zero":0,"false":false,"empty":""}'::jsonb, :'p11_submission_key'::uuid);

DO $$
BEGIN
  BEGIN
    INSERT INTO public.filled_templates (id, user_id, template_id, template_name, form_data, submission_key)
    VALUES (gen_random_uuid(), auth.uid(), current_setting('p11.template_id')::uuid, 'duplicate', '{}'::jsonb, current_setting('p11.submission_key')::uuid);
    RAISE EXCEPTION 'A duplicate owner submission key unexpectedly succeeded';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
  BEGIN
    UPDATE public.filled_templates
    SET submission_key = gen_random_uuid()
    WHERE id = current_setting('p11.form_id')::uuid;
    RAISE EXCEPTION 'A saved form submission key unexpectedly changed';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END
$$;

SAVEPOINT p11_rollback_probe;
INSERT INTO public.templates (id, name, category, created_by)
VALUES (:'p11_rollback_template'::uuid, 'P11 rollback probe', 'healthcare', :'p11_owner'::uuid);
ROLLBACK TO SAVEPOINT p11_rollback_probe;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.templates WHERE id = current_setting('p11.rollback_template_id')::uuid)
     OR EXISTS (SELECT 1 FROM public.activity_events WHERE entity_id = current_setting('p11.rollback_template_id')::uuid) THEN
    RAISE EXCEPTION 'Rolled-back business write or activity entry remained visible';
  END IF;
END
$$;

DO $$
DECLARE
  owner_id uuid := current_setting('request.jwt.claim.sub')::uuid;
  template_id uuid := current_setting('p11.template_id')::uuid;
  form_id uuid := current_setting('p11.form_id')::uuid;
  share_id uuid := current_setting('p11.share_id')::uuid;
BEGIN
  IF (SELECT count(*) FROM activity_events WHERE user_id = owner_id AND event_type = 'template_created' AND entity_id = template_id) <> 1 THEN
    RAISE EXCEPTION 'Template create did not capture exactly once';
  END IF;
  IF (SELECT count(*) FROM activity_events WHERE user_id = owner_id AND event_type = 'template_updated' AND entity_id = template_id) <> 1 THEN
    RAISE EXCEPTION 'Template meaningful edit or no-op suppression failed';
  END IF;
  IF (SELECT count(*) FROM activity_events WHERE user_id = owner_id AND event_type = 'template_shared' AND entity_id = share_id) <> 1 THEN
    RAISE EXCEPTION 'Share creation was not captured';
  END IF;
  IF (SELECT count(*) FROM activity_events WHERE user_id = owner_id AND event_type = 'share_role_changed' AND entity_id = share_id) <> 2 THEN
    RAISE EXCEPTION 'Share role changes were not captured';
  END IF;
  IF (SELECT count(*) FROM activity_events WHERE user_id = owner_id AND event_type = 'template_unshared' AND entity_id = current_setting('p11.cascade_share_id')::uuid) <> 1 THEN
    RAISE EXCEPTION 'Explicit unshare was not captured';
  END IF;
  IF (SELECT count(*) FROM activity_events WHERE user_id = owner_id AND event_type = 'form_saved' AND entity_id = form_id) <> 1 THEN
    RAISE EXCEPTION 'Saved form was not captured exactly once';
  END IF;
END
$$;

-- Removing a feed row must leave its saved form untouched.
DELETE FROM public.activity_events
WHERE user_id = :'p11_owner'::uuid AND event_type = 'form_saved' AND entity_id = :'p11_form'::uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.filled_templates WHERE id = current_setting('p11.form_id')::uuid) THEN
    RAISE EXCEPTION 'Removing history unexpectedly removed its saved form';
  END IF;
END
$$;

-- Switch identity to verify a recipient sees only their own action history.
SELECT set_config('request.jwt.claim.sub', :'p11_cascade_recipient', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', :'p11_cascade_recipient', 'role', 'authenticated')::text, true);
INSERT INTO public.template_reviews (id, template_id, reviewer_id, reviewer_name, rating, comment, status)
VALUES (:'p11_delete_review'::uuid, :'p11_template'::uuid, :'p11_cascade_recipient'::uuid, 'Synthetic Reviewer', 3, 'delete this review', 'pending');
DELETE FROM public.template_reviews WHERE id = :'p11_delete_review'::uuid;
DO $$
BEGIN
  IF (SELECT count(*) FROM activity_events WHERE event_type = 'review_deleted' AND entity_id = current_setting('p11.delete_review_id')::uuid) <> 1 THEN
    RAISE EXCEPTION 'Explicit review removal was not captured';
  END IF;
END
$$;

SELECT set_config('request.jwt.claim.sub', :'p11_reviewer', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', :'p11_reviewer', 'role', 'authenticated')::text, true);
INSERT INTO public.template_reviews (id, template_id, reviewer_id, reviewer_name, rating, comment, status)
VALUES (:'p11_review'::uuid, :'p11_template'::uuid, :'p11_reviewer'::uuid, 'Synthetic Reviewer', 4, 'private synthetic review body', 'pending');
UPDATE public.template_reviews SET rating = 5, comment = 'changed private synthetic review body' WHERE id = :'p11_review'::uuid;
SELECT set_config('request.jwt.claim.sub', :'p11_owner', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', :'p11_owner', 'role', 'authenticated')::text, true);
UPDATE public.template_reviews SET status = 'approved' WHERE id = :'p11_review'::uuid;
SELECT set_config('request.jwt.claim.sub', :'p11_reviewer', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', :'p11_reviewer', 'role', 'authenticated')::text, true);

INSERT INTO public.scheduled_events (id, title, description, date, time, created_by, attendees)
VALUES (:'p11_schedule'::uuid, 'P11 synthetic schedule', 'private description', current_date, time '09:00', :'p11_reviewer'::uuid, '["private attendee"]'::jsonb);
UPDATE public.scheduled_events
SET title = 'P11 synthetic schedule renamed', description = 'changed private description', status = 'completed'
WHERE id = :'p11_schedule'::uuid;
DELETE FROM public.scheduled_events WHERE id = :'p11_schedule'::uuid;

-- A different account must not be able to remove the owner's share event.
DELETE FROM public.activity_events
WHERE user_id = :'p11_owner'::uuid AND event_type = 'template_shared' AND entity_id = :'p11_share'::uuid;

DO $$
DECLARE
  reviewer_id uuid := current_setting('request.jwt.claim.sub')::uuid;
  owner_id uuid := current_setting('p11.owner_id')::uuid;
  review_id uuid := current_setting('p11.review_id')::uuid;
  schedule_id uuid := current_setting('p11.schedule_id')::uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM activity_events WHERE user_id = owner_id) THEN
    RAISE EXCEPTION 'Recipient can see another account activity rows';
  END IF;
  IF (SELECT count(*) FROM activity_events WHERE user_id = reviewer_id AND event_type = 'review_created' AND entity_id = review_id) <> 1 THEN
    RAISE EXCEPTION 'Review create was not captured';
  END IF;
  IF (SELECT count(*) FROM activity_events WHERE user_id = reviewer_id AND event_type = 'review_updated' AND entity_id = review_id) <> 1 THEN
    RAISE EXCEPTION 'Review edit was not captured';
  END IF;
  IF EXISTS (
    SELECT 1 FROM activity_events
    WHERE user_id = reviewer_id AND entity_id = review_id
      AND metadata::text ILIKE '%private synthetic review body%'
  ) THEN
    RAISE EXCEPTION 'Review contents leaked into event metadata';
  END IF;
  IF (SELECT count(*) FROM activity_events WHERE user_id = reviewer_id AND event_type = 'schedule_created' AND entity_id = schedule_id) <> 1 THEN
    RAISE EXCEPTION 'Schedule create was not captured';
  END IF;
  IF (SELECT count(*) FROM activity_events WHERE user_id = reviewer_id AND event_type = 'schedule_status_changed' AND entity_id = schedule_id) <> 1 THEN
    RAISE EXCEPTION 'Schedule status change was not captured';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM activity_events
    WHERE user_id = reviewer_id AND event_type = 'schedule_status_changed' AND entity_id = schedule_id
      AND metadata->'changes' @> '["title", "description"]'::jsonb
      AND metadata->>'from_status' = 'scheduled'
      AND metadata->>'to_status' = 'completed'
  ) THEN
    RAISE EXCEPTION 'Combined schedule status and detail changes were not represented';
  END IF;
  IF (SELECT count(*) FROM activity_events WHERE user_id = reviewer_id AND event_type = 'schedule_deleted' AND entity_id = schedule_id) <> 1 THEN
    RAISE EXCEPTION 'Schedule delete was not captured';
  END IF;
  IF EXISTS (
    SELECT 1 FROM activity_events
    WHERE user_id = reviewer_id AND entity_id = schedule_id
      AND metadata::text ILIKE ANY (ARRAY['%private description%', '%private attendee%'])
  ) THEN
    RAISE EXCEPTION 'Schedule description or attendee contents leaked into event metadata';
  END IF;
END
$$;

-- Authenticated users cannot forge or edit their feed directly.
DO $$
BEGIN
  BEGIN
    INSERT INTO activity_events (user_id, event_type, entity_kind, entity_id)
    VALUES (auth.uid(), 'form_saved', 'filled_form', gen_random_uuid());
    RAISE EXCEPTION 'Direct activity INSERT unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  BEGIN
    UPDATE activity_events SET label = 'forged' WHERE false;
    RAISE EXCEPTION 'Direct activity UPDATE unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END
$$;

SELECT set_config('request.jwt.claim.sub', :'p11_owner', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', :'p11_owner', 'role', 'authenticated')::text, true);
DO $$
DECLARE
  owner_id uuid := current_setting('request.jwt.claim.sub')::uuid;
  review_id uuid := current_setting('p11.review_id')::uuid;
BEGIN
  IF (SELECT count(*) FROM activity_events WHERE user_id = owner_id AND event_type = 'review_status_changed' AND entity_id = review_id) <> 1 THEN
    RAISE EXCEPTION 'Template owner decision of a review was not captured';
  END IF;
END
$$;
DELETE FROM public.filled_templates WHERE id = :'p11_form'::uuid;
DELETE FROM public.templates WHERE id = :'p11_template'::uuid;
RESET ROLE;

DO $$
DECLARE
  owner_id uuid := current_setting('request.jwt.claim.sub')::uuid;
  template_id uuid := current_setting('p11.template_id')::uuid;
  form_id uuid := current_setting('p11.form_id')::uuid;
  share_id uuid := current_setting('p11.share_id')::uuid;
  review_id uuid := current_setting('p11.review_id')::uuid;
BEGIN
  IF (SELECT count(*) FROM activity_events WHERE user_id = owner_id AND event_type = 'form_deleted' AND entity_id = form_id) <> 1 THEN
    RAISE EXCEPTION 'Saved form deletion was not captured';
  END IF;
  IF (SELECT count(*) FROM activity_events WHERE user_id = owner_id AND event_type = 'template_deleted' AND entity_id = template_id) <> 1 THEN
    RAISE EXCEPTION 'Template deletion was not captured';
  END IF;
  IF (SELECT count(*) FROM activity_events WHERE user_id = owner_id AND event_type = 'template_shared' AND entity_id = share_id) <> 1 THEN
    RAISE EXCEPTION 'Another account removed the owner share event';
  END IF;
  IF EXISTS (SELECT 1 FROM activity_events WHERE user_id = owner_id AND event_type = 'template_unshared' AND entity_id = share_id) THEN
    RAISE EXCEPTION 'Template cascade was misreported as an explicit unshare';
  END IF;
  IF (SELECT count(*) FROM activity_events WHERE event_type = 'template_unshared' AND entity_id = current_setting('p11.cascade_share_id')::uuid) <> 1 THEN
    RAISE EXCEPTION 'Template cascade added an extra unshare beside the explicit removal';
  END IF;
  IF (SELECT count(*) FROM activity_events WHERE event_type = 'review_deleted' AND entity_id = current_setting('p11.delete_review_id')::uuid) <> 1 THEN
    RAISE EXCEPTION 'Explicit review removal event was lost';
  END IF;
  IF EXISTS (SELECT 1 FROM activity_events WHERE event_type = 'review_deleted' AND entity_id = review_id) THEN
    RAISE EXCEPTION 'Template cascade was misreported as a review deletion';
  END IF;
END
$$;

-- The whole business write and its activity row disappear together on rollback.
ROLLBACK;
\echo P11_LOCAL_ACTIVITY_ACCEPTANCE_PASSED
