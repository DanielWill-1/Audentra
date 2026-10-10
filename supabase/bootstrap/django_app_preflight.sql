-- Read-only gates for the bounded P2 role/schema bootstrap.
SELECT json_build_object(
  'expected_database', current_database() = 'postgres',
  'current_role_can_create_roles', (
    SELECT rolsuper OR rolcreaterole
    FROM pg_roles
    WHERE rolname = current_user
  ),
  'django_app_exists', EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'django_app'),
  'django_data_exists', EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'django_data'),
  'django_schema_exists', EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'django'),
  'django_schema_owned_by_management_role', EXISTS (
    SELECT 1
    FROM pg_namespace namespace
    WHERE namespace.nspname = 'django'
      AND namespace.nspowner = (SELECT oid FROM pg_roles WHERE rolname = current_user)
  ),
  'public_create_granted_to_everyone', EXISTS (
    SELECT 1
    FROM pg_namespace namespace
    CROSS JOIN LATERAL aclexplode(namespace.nspacl) privilege
    WHERE namespace.nspname = 'public'
      AND privilege.grantee = 0
      AND privilege.privilege_type = 'CREATE'
  ),
  'public_usage_granted_to_everyone', EXISTS (
    SELECT 1
    FROM pg_namespace namespace
    CROSS JOIN LATERAL aclexplode(namespace.nspacl) privilege
    WHERE namespace.nspname = 'public'
      AND privilege.grantee = 0
      AND privilege.privilege_type = 'USAGE'
  )
) AS p2_preflight;
