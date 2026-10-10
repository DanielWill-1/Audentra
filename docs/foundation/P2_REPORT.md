# P2 Django foundation report

**Date:** 2026-10-10  
**Status:** Implemented and verified for the bounded P2 scope  
**Later phase status:** P2 is complete/reviewed; P3 bounded code corrections are complete. P4 now uses the owner's development-only Django + HTMX + Supabase Python SDK scope and fresh hosted Auth acceptance passes. Signup confirmation is disabled with authorization; no SMTP/legacy-identity gate remains. Credential-retirement approval and production/email-recovery follow-ups are in [P4_REPORT.md](../auth/P4_REPORT.md). P5 schema/data/RLS remains separate.

## Result

A native Windows Django project now runs beside the legacy app under migration/django/. It serves only GET /healthz. The test server returned 200 over loopback, and the endpoint verified both live database aliases. No legacy page, API, proxy, Django admin or Auth endpoint was added.

The active environment uses Python 3.12.10 installed locally with uv, Django 5.2.18 LTS and a project-local uv.lock. No commit was made. The local Windows system Python was not replaced. Django 5.2.18 was the supported 5.2 LTS security release checked for this implementation ([Django release status](https://www.djangoproject.com/download/), [Django 5.2.18 security release](https://www.djangoproject.com/weblog/2026/oct/06/security-releases/)).

Python.org lists 3.12.15 as the latest Python 3.12 security patch, but it is source-only; 3.12.10 is the last 3.12 release with a Windows installer. uv currently offers a managed Windows 3.12.10 build in this environment ([Python 3.12.15 release](https://www.python.org/downloads/release/python-31215/)). This foundation therefore follows the requested Python 3.12 line with 3.12.10. Recheck the available Windows runtime before deployment or any long-lived production use.

## Hosted testing database

The CLI link was checked against the private root .env target. The CLI project list uses a ref field; that project entry's database host matched the direct host derived from the same ref. DNS resolved and port 5432 was reachable. No connection string, project ref or credential is recorded here. The previous linked `pooler-url` metadata file was absent, so no pooler hostname was guessed.

A read-only catalog query immediately before bootstrap found zero public tables and zero Storage buckets. The same query after migrations still found zero public tables and zero buckets. No Auth account or application row was created or read.

The preflight confirmed that the current management connection can create restricted roles, the target database is postgres, neither connector role existed, no conflicting django schema existed, and PUBLIC did not have CREATE on public. PUBLIC does have USAGE on public. Existing global ACLs were preserved.

## Roles, schema and migration

The additive bootstrap in supabase/bootstrap/django_app_role.sql created only django_app, django_data and the django schema. Both logins have NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOINHERIT and NOBYPASSRLS. Neither connector role is a member of another role. The Supabase management role is an administrator of these role definitions but cannot SET ROLE to them.

The Supabase management role owns the django schema because it cannot SET ROLE django_app. django_app has USAGE and CREATE on that schema and owns the Django tables it creates; it cannot create in public. django_data has USAGE on public, no CREATE there, no USAGE/CREATE on django, and no current public-table access. django_app inherits USAGE on public from the existing PUBLIC ACL, but has no CREATE or application-table privileges. No project-wide PUBLIC grant was changed.

Two cryptographically random role passwords and a local Django secret were generated. Runtime URLs/passwords are in the ignored migration/django/.env. Password SQL was transient, used through the CLI file interface without displaying or passing password values as arguments, then removed.

Only the default alias was migrated. The resulting django schema contains django_migrations and django_session, both owned by django_app. The supabase alias is metadata-only and rejects Django migrations. No public application DDL, existing migration-history edit, Auth, Storage, application policy or global grant change was made.

## Static build and checks

The Tailwind v3 standalone Windows executable is pinned to v3.4.17 and SHA-256 67f1c5e3f5a03406a7bf5badf5ada09b79f3ae78ec43450c15f7e983068da346. Its download lives in ignored .state/. The PowerShell build helper stages a hash-verified copy in the OS temp directory before execution, then removes it; this worked around native-tool launch failures observed in the current Windows runner. OneDrive was not established as the cause. CSS source is outside the collected static directory. The compiled output contains the primary color as rgb(0 74 198), equivalent to #004ac6, Hanken Grotesk and mobile/tablet/desktop spacing values 4.5rem, 5.5rem and 8.5rem. collectstatic contains only css/app.css. Ruff uses the same temp-staging helper.

| Check | Result |
|---|---|
| uv lock --check | Passed; 24 locked packages |
| Django system check | Passed with no issues |
| Django production-settings check | Passed with one expected security.W004 warning: HSTS is unset until a production HTTPS deployment is defined |
| Default-only migrate | Passed; sessions.0001_initial applied |
| migrate --check / showmigrations | Passed; sessions migration applied |
| Live /healthz through Django test client | 200; default and supabase aliases passed |
| Native runserver over 127.0.0.1:8000 | Started; HTTP /healthz returned 200; process stopped after verification |
| Tailwind compile and token checks | Passed; pinned version/digest and all required tokens verified |
| collectstatic | Passed; only css/app.css collected |
| Ruff | Passed |
| mypy | Passed; 17 source files checked |
| pytest | Passed; 8 tests |
| Public app catalog / Storage | Read-only before/after checks passed; zero public tables and zero buckets both times |

Tailwind emitted a non-blocking outdated caniuse-lite notice from its compatibility data. The production-settings warning is deliberate: this testing project has no production deployment, and HSTS should be enabled only after the HTTPS hostname/deployment behavior is known.

## Files and carryovers

The later [P2 review](P2_REVIEW.md) added dedicated in-memory test settings and repeated the checks: 9 tests and 18 typed source files now pass. The table above records the original implementation run, not the later test count. Native Python DLL loading failed inside the Codex Windows sandbox, while the same checks passed with approved execution outside it; this runner limitation does not establish a broken installed runtime.

Implementation files are under migration/django/, the role bootstrap is under supabase/bootstrap/, and this report plus [Django-owned state](django-owned-state.md) document the environment. New local interpreter/cache/venv/binary/state, .env, generated CSS and collected static files are ignored. The root app, Node manifests, legacy screenshots and Supabase migration history remain in their original locations.

P1's accepted visual/Auth/fixture exceptions remain open. P4 owns Auth; P5a owns a verified application schema and Storage disposition; P5b owns application grants, user-scoped query context and RLS tests. P2 has no pages or models to port while the public app schema is empty. The hosted target remains testing-only per the owner; it must not be treated as production.
