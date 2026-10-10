-- Native PostgreSQL-only policy assertions; all fixtures roll back.
BEGIN;
INSERT INTO public.templates (id,name,category,visibility,created_by) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Owner private','healthcare','hidden','11111111-1111-4111-8111-111111111111'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Owner visible','healthcare','visible','11111111-1111-4111-8111-111111111111'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','Owner editor','healthcare','hidden','11111111-1111-4111-8111-111111111111'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','Recipient private','healthcare','hidden','22222222-2222-4222-8222-222222222222');
INSERT INTO public.template_shares (template_id,recipient_id,role,shared_by) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222','admin','11111111-1111-4111-8111-111111111111'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','33333333-3333-4333-8333-333333333333','viewer','11111111-1111-4111-8111-111111111111'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','33333333-3333-4333-8333-333333333333','editor','11111111-1111-4111-8111-111111111111');
INSERT INTO public.template_reviews (template_id,reviewer_id,rating,comment,status) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','33333333-3333-4333-8333-333333333333',0,'','pending');
INSERT INTO storage.objects (bucket_id,name,owner_id) VALUES
  ('template-files','templates/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.pdf','11111111-1111-4111-8111-111111111111');

DO $$ BEGIN
  IF has_table_privilege('anon','public.templates','SELECT') THEN RAISE EXCEPTION 'anon has a direct table grant'; END IF;
  IF has_table_privilege('django_data','public.templates','SELECT') THEN RAISE EXCEPTION 'django_data inherits an application grant'; END IF;
END $$;

-- Unrelated account cannot read hidden template, review, or private file.
SET LOCAL ROLE django_data;
SELECT set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE n integer; BEGIN
  SELECT count(*) INTO n FROM public.templates WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  IF n <> 0 THEN RAISE EXCEPTION 'unrelated user read a hidden template'; END IF;
  SELECT count(*) INTO n FROM public.template_reviews;
  IF n <> 0 THEN RAISE EXCEPTION 'unrelated user read a review'; END IF;
  SELECT count(*) INTO n FROM storage.objects;
  IF n <> 0 THEN RAISE EXCEPTION 'unrelated user read a private file'; END IF;
  IF public.p5_object_template_id('templates/not-a-uuid/file.pdf') IS NOT NULL THEN RAISE EXCEPTION 'invalid object path parsed'; END IF;
  IF public.p5_can_read_template('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') THEN RAISE EXCEPTION 'unrelated access helper leaked a private template'; END IF;
END $$;
RESET ROLE;

-- Owner can read and own-update profile/template, and create a scheduled event.
SET LOCAL ROLE django_data;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
SET LOCAL ROLE authenticated;
INSERT INTO public.users (id,first_name) VALUES ('11111111-1111-4111-8111-111111111111','Owner');
DO $$ DECLARE inserted_id uuid; BEGIN
  INSERT INTO public.templates (id,name,category,visibility,created_by)
  VALUES ('ffffffff-ffff-4fff-8fff-ffffffffffff','Owner RETURNING probe','education','visible',auth.uid())
  RETURNING id INTO inserted_id;
  IF inserted_id <> 'ffffffff-ffff-4fff-8fff-ffffffffffff' THEN
    RAISE EXCEPTION 'owner INSERT RETURNING failed';
  END IF;
END $$;
UPDATE public.templates SET name='Owner private edited' WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
UPDATE public.templates SET visibility='hidden' WHERE id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
INSERT INTO public.scheduled_events (title,date,time,created_by) VALUES ('Owner event',current_date,'09:00','11111111-1111-4111-8111-111111111111');
DO $$ DECLARE n integer; BEGIN
  SELECT count(*) INTO n FROM public.template_shares WHERE template_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  IF n <> 2 THEN RAISE EXCEPTION 'owner cannot list shares'; END IF;
  SELECT count(*) INTO n FROM storage.objects;
  IF n <> 1 THEN RAISE EXCEPTION 'owner cannot read private file'; END IF;
END $$;
RESET ROLE;

-- Existing admin sees shared template, can invite an existing UUID, and manage a share.
SET LOCAL ROLE django_data;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE n integer; BEGIN
  SELECT count(*) INTO n FROM public.templates WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  IF n <> 1 THEN RAISE EXCEPTION 'admin cannot read shared template'; END IF;
  UPDATE public.templates SET name='admin must not edit' WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  IF FOUND THEN RAISE EXCEPTION 'share admin edited template content'; END IF;
  SELECT count(*) INTO n FROM public.template_reviews;
  IF n <> 0 THEN RAISE EXCEPTION 'non-owner admin read a review'; END IF;
END $$;
INSERT INTO public.template_shares (template_id,recipient_id,role,shared_by)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','44444444-4444-4444-8444-444444444444','viewer','22222222-2222-4222-8222-222222222222');
DELETE FROM public.template_shares
WHERE template_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  AND recipient_id='44444444-4444-4444-8444-444444444444';
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM public.template_shares
    WHERE template_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      AND recipient_id='44444444-4444-4444-8444-444444444444'
  ) THEN
    RAISE EXCEPTION 'share admin could not revoke a recipient share';
  END IF;
END $$;
RESET ROLE;

-- Recipient can hide a share, but cannot escalate it or change template content as viewer.
SET LOCAL ROLE django_data;
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
SET LOCAL ROLE authenticated;
UPDATE public.template_shares SET is_hidden=true WHERE template_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $$ DECLARE affected integer; BEGIN
  IF (SELECT count(*) FROM storage.objects) <> 1 THEN RAISE EXCEPTION 'shared recipient cannot read private file'; END IF;
  UPDATE public.templates SET name='forbidden' WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'viewer edited template content'; END IF;
  BEGIN
    UPDATE public.template_shares SET role='admin' WHERE template_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    RAISE EXCEPTION 'viewer escalated a share role';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.template_reviews SET status='approved' WHERE template_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    RAISE EXCEPTION 'review author approved own review';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
UPDATE public.template_reviews SET rating=4,comment='Looks good' WHERE template_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
UPDATE public.templates SET name='Editor can change content' WHERE id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
DO $$ BEGIN
  BEGIN
    UPDATE public.templates SET visibility='visible' WHERE id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    RAISE EXCEPTION 'editor changed owner visibility' USING ERRCODE = 'P0001';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

SET LOCAL ROLE django_data;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
SET LOCAL ROLE authenticated;
UPDATE public.template_shares SET role='editor' WHERE template_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND recipient_id='33333333-3333-4333-8333-333333333333';
RESET ROLE;
SET LOCAL ROLE django_data;
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
SET LOCAL ROLE authenticated;
UPDATE public.templates SET name='Admin granted edit' WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
RESET ROLE;

-- Template owner alone can set a review decision and delete the template.
SET LOCAL ROLE django_data;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
SET LOCAL ROLE authenticated;
UPDATE public.template_reviews SET status='approved' WHERE template_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $$ DECLARE status_value text; BEGIN
  SELECT status INTO status_value FROM public.template_reviews WHERE template_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  IF status_value <> 'approved' THEN RAISE EXCEPTION 'template owner cannot set review decision'; END IF;
END $$;
DELETE FROM public.templates WHERE id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
RESET ROLE;
ROLLBACK;
DO $$ BEGIN
  IF current_user <> 'postgres' OR auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'role or identity claim leaked beyond transaction'; END IF;
END $$;
