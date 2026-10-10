# P5 verification record

**Date:** 2026-10-11  
**Overall:** Partial; hosted transaction-pooler/user-switch verification remains open.

## Results

| Check | Environment | Result | Evidence / limit |
|---|---|---|---|
| Read-only target preflight | Linked development Supabase | Passed | `P5_TARGET_INVENTORY.json`; pre-change catalog found no public app tables or bucket; no application row values, Auth identities, tokens or object payloads were exported |
| Historical migration replay | Native PostgreSQL 18.4 scratch with minimal Auth stubs | Stopped at first actual failure | `supabase/schema_dump/historical-replay.log`; `20250628065741_precious_brook.sql` fails because `template_shares` is not present in earlier history. Historical migrations remain unchanged |
| Fresh-install baseline | Native PostgreSQL 18.4 scratch | Passed | Baseline plus separate Storage policy artifact created six public tables, 23 public policies and four Storage policies; bucket stub matched the private 20 MiB/five-MIME configuration |
| Empty-target remediation | Separate native PostgreSQL 18.4 scratch | Passed twice | Both P5 migrations applied twice; normalized public/Storage schema-only dump was unchanged after the second run |
| Baseline/remediation equivalence | Two isolated native PostgreSQL 18.4 databases | Passed | Normalized schema-only `pg_dump` output matched exactly for the fresh baseline + Storage policy path and the guarded empty-target remediation path |
| Native policy assertions | Both isolated schema paths | Passed | Owner, viewer, editor, admin, unrelated account, reviews, storage object access and role bounds; synthetic statements rolled back |
| Django RLS context | Native PostgreSQL 18.4 scratch | Passed | `check_p5_rls_scratch.py`: context guard, verified identity, nested context, user switch and rollback |
| Hosted schema application | Linked Audentra development project, PostgreSQL 17.6 | Passed | Two additive P5 migrations applied; post-apply inventory: 6 public app tables, RLS on all 6, 23 public policies, 4 Storage policies |
| Hosted data/Storage probe | Linked development project, direct DB connection | Passed | [P5_HOSTED_RESULTS.json](P5_HOSTED_RESULTS.json); 3 synthetic accounts created and deleted; cleanup true; 0 emails sent |
| Hosted transaction pooler | Not configured | **Pending** | Current `.env` uses a direct database host; no pooler identity/user-switch evidence |
| Django regressions | Native Windows / Python 3.12 | Passed | 90 pytest tests; `manage.py check`; focused P5/app mypy and Ruff commands recorded below |
| Full broad mypy selection | Native Windows / Python 3.12 | Existing P4 probe type errors | `mypy apps scripts` also checks `check_p4_postgres_concurrency.py` and `check_p4_hosted_auth.py`; their unrelated legacy type findings remain. P5 files are checked with the focused command below |

## Reproducible local commands

From `migration/django/`, using the existing Windows Store Python workaround:

```powershell
$storePython = Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0\python.exe'
$env:PYTHONPATH = (Resolve-Path .\.venv-p2\Lib\site-packages).Path
$env:DJANGO_SETTINGS_MODULE = 'config.settings.test'
& $storePython -m pytest -q -p no:cacheprovider
& $storePython manage.py check
& $storePython -m mypy apps scripts/check_p5_hosted_data.py
.\scripts\run_ruff.ps1 check apps scripts/check_p5_hosted_data.py
```

The empty-target baseline/remediation and native RLS SQL were run with local PostgreSQL 18.4 `psql.exe` on loopback. The Python RLS scratch probe was run with `DJANGO_SETTINGS_MODULE=config.settings.dev` and a loopback-only scratch URL. The verification databases were isolated scratch databases; no hosted database was used as a Django test database.

## Hosted probe command

From `migration/django/`, after choosing a direct or pooler URL in the ignored local environment:

```powershell
$storePython = Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0\python.exe'
$env:PYTHONPATH = (Resolve-Path .\.venv-p2\Lib\site-packages).Path
$env:DJANGO_SETTINGS_MODULE = 'config.settings.dev'
& $storePython scripts/check_p5_hosted_data.py
```

The script uses fresh synthetic accounts and exact object paths, sends no email, and deletes only resources it created. Its `pooler_verified` field is derived from the configured Supabase shared transaction-pooler host and port. The latest committed result is direct-host evidence, not pooler evidence.

## Schema dump limitation

`supabase db dump --linked` unexpectedly attempted a Docker image pull and was stopped before a dump ran. A follow-up native `pg_dump --schema-only` using the restricted `django_data` login reached the database but could not lock `public.users` because that role has no direct table `SELECT` privilege. This is expected least-privilege behavior; no grants were widened. The dated catalog JSON and reviewed baseline/migrations are the current evidence. `supabase/schema_dump/20261011-pre-p5-public-schema.sql` is historical pre-P5 schema-only material and is not current hosted DDL.
