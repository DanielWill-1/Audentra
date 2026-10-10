-- P5 read-only catalog snapshot. Contains no application-row reads or mutations.
SELECT jsonb_build_object(
  'server_version', current_setting('server_version'),
  'catalog_role', current_user,
  'database', current_database(),
  'roles', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'name', rolname, 'login', rolcanlogin, 'superuser', rolsuper,
      'createdb', rolcreatedb, 'createrole', rolcreaterole,
      'inherit', rolinherit, 'bypassrls', rolbypassrls
    ) ORDER BY rolname)
    FROM pg_roles
    WHERE rolname IN ('django_app', 'django_data', 'authenticated', 'service_role')
  ), '[]'::jsonb),
  'memberships', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'member', member.rolname, 'role', parent.rolname,
      'admin_option', m.admin_option,
      'inherit_option', m.inherit_option, 'set_option', m.set_option
    ) ORDER BY member.rolname, parent.rolname)
    FROM pg_auth_members AS m
    JOIN pg_roles AS member ON member.oid = m.member
    JOIN pg_roles AS parent ON parent.oid = m.roleid
    WHERE member.rolname IN ('django_app', 'django_data')
  ), '[]'::jsonb),
  'objects', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'schema', ns.nspname, 'name', c.relname, 'kind', c.relkind,
      'rls_enabled', c.relrowsecurity, 'rls_forced', c.relforcerowsecurity,
      'estimated_rows', c.reltuples::bigint
    ) ORDER BY ns.nspname, c.relname)
    FROM pg_class AS c
    JOIN pg_namespace AS ns ON ns.oid = c.relnamespace
    WHERE ns.nspname IN ('public', 'django')
      AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
  ), '[]'::jsonb),
  'columns', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'schema', ns.nspname, 'table', c.relname, 'position', a.attnum,
      'name', a.attname, 'type', format_type(a.atttypid, a.atttypmod),
      'nullable', NOT a.attnotnull,
      'default', pg_get_expr(d.adbin, d.adrelid)
    ) ORDER BY ns.nspname, c.relname, a.attnum)
    FROM pg_class AS c
    JOIN pg_namespace AS ns ON ns.oid = c.relnamespace
    JOIN pg_attribute AS a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
    LEFT JOIN pg_attrdef AS d ON d.adrelid = c.oid AND d.adnum = a.attnum
    WHERE ns.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
  ), '[]'::jsonb),
  'constraints', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'table', conrelid::regclass::text, 'name', conname,
      'type', contype, 'definition', pg_get_constraintdef(oid, true)
    ) ORDER BY conrelid::regclass::text, conname)
    FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
  ), '[]'::jsonb),
  'indexes', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'table', schemaname || '.' || tablename, 'name', indexname,
      'definition', indexdef
    ) ORDER BY schemaname, tablename, indexname)
    FROM pg_indexes
    WHERE schemaname = 'public'
  ), '[]'::jsonb),
  'policies', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'schema', schemaname, 'table', tablename, 'name', policyname,
      'roles', roles, 'command', cmd, 'using', qual, 'check', with_check
    ) ORDER BY schemaname, tablename, policyname)
    FROM pg_policies
    WHERE schemaname IN ('public', 'storage')
  ), '[]'::jsonb),
  'triggers', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'table', event_object_table, 'name', trigger_name,
      'definition', action_statement
    ) ORDER BY event_object_table, trigger_name)
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
  ), '[]'::jsonb),
  'security_definer_functions', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'name', p.oid::regprocedure::text, 'owner', r.rolname,
      'security_definer', p.prosecdef, 'configuration', p.proconfig
    ) ORDER BY p.oid::regprocedure::text)
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    JOIN pg_roles AS r ON r.oid = p.proowner
    WHERE n.nspname IN ('public', 'auth') AND p.prosecdef
  ), '[]'::jsonb),
  'event_triggers', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'name', evtname, 'event', evtevent, 'enabled', evtenabled,
      'function', evtfoid::regprocedure::text, 'owner', owner.rolname
    ) ORDER BY evtname)
    FROM pg_event_trigger AS evt
    JOIN pg_roles AS owner ON owner.oid = evt.evtowner
  ), '[]'::jsonb),
  'schema_privileges', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'schema', schema_name, 'role', role_name,
      'usage', has_schema_privilege(role_name, schema_name, 'USAGE'),
      'create', has_schema_privilege(role_name, schema_name, 'CREATE')
    ) ORDER BY schema_name, role_name)
    FROM (VALUES ('public'), ('django')) AS schemas(schema_name)
    CROSS JOIN (VALUES ('django_app'), ('django_data'), ('authenticated')) AS roles(role_name)
    WHERE EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name)
  ), '[]'::jsonb),
  'auth_uid_definition', pg_get_functiondef('auth.uid()'::regprocedure),
  'migration_history_relation', to_regclass('supabase_migrations.schema_migrations')::text,
  'storage_buckets', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', id, 'name', name, 'public', public,
      'file_size_limit', file_size_limit, 'allowed_mime_types', allowed_mime_types
    ) ORDER BY id)
    FROM storage.buckets
  ), '[]'::jsonb),
  'storage_objects_security', jsonb_build_object(
    'rls_enabled', (SELECT relrowsecurity FROM pg_class WHERE oid = 'storage.objects'::regclass),
    'select_granted_to_authenticated', has_table_privilege('authenticated', 'storage.objects', 'SELECT'),
    'insert_granted_to_authenticated', has_table_privilege('authenticated', 'storage.objects', 'INSERT'),
    'update_granted_to_authenticated', has_table_privilege('authenticated', 'storage.objects', 'UPDATE'),
    'delete_granted_to_authenticated', has_table_privilege('authenticated', 'storage.objects', 'DELETE'),
    'storage_usage_granted_to_authenticated', has_schema_privilege('authenticated', 'storage', 'USAGE')
  )
) AS p5_readonly_preflight;
