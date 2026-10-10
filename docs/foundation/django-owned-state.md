# Django-owned database state

This note records the P2 arrangement on the owner's hosted testing Supabase project. The runtime aliases use separate least-privilege logins; ordinary Django traffic never uses postgres, supabase_admin or service_role.

| Database alias | Login | Search path | P2 access |
|---|---|---|---|
| default | django_app | django | Django sessions/migration state; USAGE and CREATE on django only |
| supabase | django_data | public | Connection and catalog metadata; USAGE on public, no CREATE or application-table access |

Both connector roles have LOGIN, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOINHERIT and NOBYPASSRLS. Neither role is a member of another role. Their passwords and connection URLs are private in migration/django/.env. The management connection can administer the role definitions but cannot SET ROLE to the connectors.

## Ownership and grants

The management role owns schema django. This is necessary because the Supabase management role cannot SET ROLE django_app. The app login has USAGE and CREATE on django, but cannot drop or transfer the schema. Django creates and owns django_migrations and django_session within it. Both tables were verified as owned by django_app.

PUBLIC has USAGE on schema public in this project, so django_app inherits that name-resolution privilege. The project-wide ACL was preserved. PUBLIC does not have CREATE on public. django_app has no public CREATE or current app-table grants; django_data has no public CREATE or current app-table grants. django_data has no USAGE or CREATE on django and cannot access the session/migration tables. No role is a member of authenticated or service_role.

The default alias owns Django bookkeeping. The database router permits the sessions migration only on default; it rejects migrations on supabase. P5b must separately design and prove the authenticated-role transaction context before user data queries are added.

## Verified catalog

After P2, the django schema contained exactly:

- django_migrations, owned by django_app
- django_session, owned by django_app

The public application table list remained empty before and after the P2 migration. Storage had zero buckets before and after. P2 performed no Auth or Storage writes and read no application rows. The current target therefore cannot validate production or legacy application schema; P5a/P5b own that work.

## Recheck procedure

The initial read-only preflight is retained in [django_app_preflight.sql](../../supabase/bootstrap/django_app_preflight.sql). P2's post-migration catalog and ACL checks were executed read-only through the linked CLI; their results are summarized above and in [P2_REPORT.md](P2_REPORT.md). Repeat metadata checks only against the same confirmed testing target. The live /healthz endpoint checks each alias's current role/schema, high privilege flags, public table access, session/migration table placement, database connection privilege and role-membership direction. It returns 200 only when both connections pass and a generic 503 on failure. It does not query application rows.

Do not run migrations against the supabase alias. Never let a test runner create, drop or flush a database on the hosted project. No generic data role or RLS bypass is a fallback for a missing future grant.

The [P2 review](P2_REVIEW.md) repeated the live read-only health probes successfully and isolated the normal pytest suite with config.settings.test: both aliases use in-memory SQLite. P3 must retain these role/schema boundaries and requires no new database grants or application tables.
