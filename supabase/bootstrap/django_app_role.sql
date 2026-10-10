-- P2 only: create two dedicated restricted login roles and their isolated schema.
-- Passwords are set separately from a private, ignored SQL file.
-- This file deliberately contains no password and does not change public tables,
-- project-wide grants, application migrations, Auth, or Storage.

DO $p2_roles$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'django_app') THEN
    IF EXISTS (
      SELECT 1 FROM pg_roles
      WHERE rolname = 'django_app'
        AND (NOT rolcanlogin OR rolsuper OR rolcreatedb OR rolcreaterole OR rolinherit OR rolbypassrls)
    ) THEN
      RAISE EXCEPTION 'Existing django_app role has unexpected attributes; inspect before continuing.';
    END IF;
  ELSE
    CREATE ROLE django_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'django_data') THEN
    IF EXISTS (
      SELECT 1 FROM pg_roles
      WHERE rolname = 'django_data'
        AND (NOT rolcanlogin OR rolsuper OR rolcreatedb OR rolcreaterole OR rolinherit OR rolbypassrls)
    ) THEN
      RAISE EXCEPTION 'Existing django_data role has unexpected attributes; inspect before continuing.';
    END IF;
  ELSE
    CREATE ROLE django_data LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_auth_members membership
    JOIN pg_roles member_role ON member_role.oid = membership.member
    JOIN pg_roles granted_role ON granted_role.oid = membership.roleid
    WHERE member_role.rolname IN ('django_app', 'django_data')
  ) THEN
    RAISE EXCEPTION 'A P2 connector role has role memberships; inspect before continuing.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_namespace
    WHERE nspname = 'django'
      AND nspowner <> (SELECT oid FROM pg_roles WHERE rolname = current_user)
  ) THEN
    RAISE EXCEPTION 'Existing django schema is not owned by the current management role; inspect before continuing.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'django') THEN
    EXECUTE format('CREATE SCHEMA django AUTHORIZATION %I', current_user);
  END IF;

  IF has_schema_privilege('django_app', 'public', 'CREATE') THEN
    RAISE EXCEPTION 'django_app can create objects in public; inspect existing grants before continuing.';
  END IF;
END
$p2_roles$;

GRANT CONNECT ON DATABASE postgres TO django_app, django_data;
GRANT USAGE, CREATE ON SCHEMA django TO django_app;
GRANT USAGE ON SCHEMA public TO django_data;

ALTER ROLE django_app SET search_path = django;
ALTER ROLE django_data SET search_path = public;
