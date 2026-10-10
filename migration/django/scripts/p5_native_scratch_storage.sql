-- Minimal Storage metadata stub for native RLS tests only. No object payloads are stored.
CREATE SCHEMA storage;
CREATE TABLE storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean NOT NULL,
  file_size_limit bigint NOT NULL,
  allowed_mime_types text[] NOT NULL
);
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types) VALUES (
  'template-files',
  'template-files',
  false,
  20971520,
  ARRAY[
    'application/json',
    'text/csv',
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
);
CREATE TABLE storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text NOT NULL,
  name text NOT NULL,
  owner_id text
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
