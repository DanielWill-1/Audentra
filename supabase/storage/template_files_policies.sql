-- Apply after the P5 application baseline and private template-files bucket exist.
-- Object path: templates/<template UUID>/<generated object UUID>.<validated extension>
-- Only Storage APIs may create/delete objects; this file defines Storage RLS only.
BEGIN;
DO $storage_guard$
DECLARE
  target_bucket storage.buckets%ROWTYPE;
BEGIN
  SELECT * INTO target_bucket FROM storage.buckets WHERE id = 'template-files';
  IF NOT FOUND OR target_bucket.public IS DISTINCT FROM false
     OR target_bucket.file_size_limit <> 20971520
     OR cardinality(target_bucket.allowed_mime_types) <> 5
     OR EXISTS (
       SELECT unnest(ARRAY[
         'application/json', 'text/csv', 'application/pdf',
         'application/vnd.ms-excel',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
       ])
       EXCEPT
       SELECT unnest(target_bucket.allowed_mime_types)
     ) THEN
    RAISE EXCEPTION 'The private template-files bucket does not match the approved P5 contract';
  END IF;
  IF NOT has_table_privilege('authenticated', 'storage.objects', 'SELECT')
     OR NOT has_table_privilege('authenticated', 'storage.objects', 'INSERT')
     OR NOT has_table_privilege('authenticated', 'storage.objects', 'UPDATE')
     OR NOT has_table_privilege('authenticated', 'storage.objects', 'DELETE')
     OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'storage.objects'::regclass)
     OR to_regprocedure('public.p5_object_template_id(text)') IS NULL
     OR to_regprocedure('public.p5_template_access_role(uuid)') IS NULL
     OR to_regprocedure('public.p5_is_template_owner(uuid)') IS NULL THEN
    RAISE EXCEPTION 'P5 application functions, Storage grants or Storage RLS are unavailable';
  END IF;
END
$storage_guard$;

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
