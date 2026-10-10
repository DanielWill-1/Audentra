-- P5 access contract correction discovered by the hosted verification probe.
-- Editors may change template content. Only owners may change visibility or delete.
-- Share admins manage share rows and cannot edit/delete template content.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.templates') IS NULL THEN
    RAISE EXCEPTION 'P5 role correction requires public.templates';
  END IF;
  IF to_regprocedure('public.p5_is_template_owner(uuid)') IS NULL THEN
    RAISE EXCEPTION 'P5 role correction requires public.p5_is_template_owner(uuid)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'public.templates'::regclass AND attname = 'visibility'
      AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'P5 role correction requires templates.visibility';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.templates'::regclass
      AND polname = 'templates_update_owner_or_editor'
      AND polcmd = 'w'
  ) THEN
    RAISE EXCEPTION 'Expected P5 template update policy was not found';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.templates'::regclass
      AND polcmd IN ('w', '*')
      AND polname <> 'templates_update_owner_or_editor'
  ) THEN
    RAISE EXCEPTION 'Unexpected additional template UPDATE policy; inspect before applying';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.p5_guard_template_identity() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.created_by IS DISTINCT FROM OLD.created_by OR
     NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Template identity and ownership are immutable' USING ERRCODE = '42501';
  END IF;
  IF NEW.visibility IS DISTINCT FROM OLD.visibility AND
     NOT public.p5_is_template_owner(OLD.id) THEN
    RAISE EXCEPTION 'Only the template owner may change visibility' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$$;

DROP POLICY templates_update_owner_or_editor ON public.templates;
CREATE POLICY templates_update_owner_or_editor ON public.templates FOR UPDATE TO authenticated
  USING (public.p5_template_access_role(id) IN ('owner', 'editor'))
  WITH CHECK (public.p5_template_access_role(id) IN ('owner', 'editor'));

COMMIT;
