# P9 read-only schema acceptance

**Status: PASS within current P9 scope.** The visible P5 schema/security comparison passed using the restricted project-scoped `django_data` identity. A supplemental read-only Management API capture now confirms the hosted `template-files` bucket is private, limited to 20 MiB, and restricted to the accepted MIME types. Those hosted settings match `supabase/config.toml`. No admin or service-role credential was used.

## Run and boundaries

- Schema run: `p9-full-20261014-0723-utc`; supplemental Storage run: `p9-full-20261015-storage-metadata`
- Results: [attempt 04](evidence/p9/p9-full-20261014-0723-utc/P9_SCHEMA_ACCEPTANCE_ATTEMPT_04.json), [attempt 05](evidence/p9/p9-full-20261014-0723-utc/P9_SCHEMA_ACCEPTANCE_ATTEMPT_05.json), and [attempt 06](evidence/p9/p9-full-20261014-0723-utc/P9_SCHEMA_ACCEPTANCE_ATTEMPT_06.json)
- Latest restricted-identity schema command result: [attempt 06](evidence/p9/p9-full-20261014-0723-utc/P9_SCHEMA_ACCEPTANCE_ATTEMPT_06.json)
- Sanitized CLI link state: [P9_SUPABASE_CLI_STATUS.json](evidence/p9/p9-full-20261014-0723-utc/P9_SUPABASE_CLI_STATUS.json)
- Hosted route probe: [P9_HOSTED_ROUTE_RESULTS.json](evidence/p9/p9-full-20261014-0723-utc/P9_HOSTED_ROUTE_RESULTS.json)
- Supplemental hosted Storage capture: [raw bucket metadata](evidence/p9/p9-full-20261015-storage-metadata/P9_STORAGE_BUCKET_METADATA.json) and [read-only acceptance comparison](evidence/p9/p9-full-20261015-storage-metadata/P9_STORAGE_BUCKET_ACCEPTANCE.json)
- Database schema target: Audentra development project `pgtttjmqibxufvwehkyj`, shared transaction pooler, restricted `django_data` identity. Supplemental Storage target: the same development project through the Management API.
- Read-only: no DDL, migrations, policy/grant changes, application-data reads or row copies were performed by this schema inspection.

The Supabase CLI status is linked to the expected project, while `supabase start` runs the local development stack. Attempts 04–06 queried hosted schema through the restricted `django_data` alias; the supplemental bucket metadata capture used the read-only Supabase Management API with a project-scoped `storage_read` token. The CLI link and local `config.toml` alone do not establish hosted bucket metadata or widen the hosted database role. See the [Supabase CLI workflow](https://supabase.com/docs/guides/local-development/cli-workflows).

## Accepted baseline comparison

| Area | Result | P5 baseline / observed |
|---|---|---|
| Public application tables and RLS | PASS | 6/6 tables; RLS enabled on each; all owners `postgres`. |
| Columns | PASS | 57/57 names, types, nullability, defaults and generated/identity attributes. |
| Constraints and indexes | PASS | 30/30 constraints and 19/19 indexes. |
| Policies, triggers and security-definer functions | PASS | 23/23 application policies, 10/10 triggers, 7/7 functions. |
| Restricted roles and memberships | PASS | 4/4 roles, 1/1 membership, 6/6 schema privileges; role restrictions match the accepted baseline. |
| Django alias separation | PASS | Default connects as `django_app` on `django`; Supabase alias connects as `django_data` on `public`; PostgreSQL 17.6. |
| Storage object security | PASS | Authenticated role sees the expected RLS/grants and 4/4 object policies. |
| Storage bucket privacy and limits | PASS | The project-scoped read-only Management API capture found `template-files`: `public=false`, `file_size_limit=20971520` (20 MiB), and the five allowed MIME types. Privacy, size and MIME settings match `supabase/config.toml`; see the supplemental acceptance record. |

Attempt 06 retained `runtime_aliases_status: pass` and `restricted_role_status: pass`; its `drift_or_incomplete` result reflected the bucket metadata that was then unavailable. The supplemental hosted read resolves that gap and confirms the hosted bucket configuration matches the local contract. No schema, bucket, policy, or grant was changed during the inspection.

## Closeout

The hosted Storage gap is closed by the owner-authorized, read-only Management API capture using a project-scoped `storage_read` token ([API reference](https://supabase.com/docs/reference/api/v1-list-all-buckets)). The result is limited to bucket metadata and was compared with the checked-in configuration. No write credential, database privilege change, bucket mutation, or policy change was used. No hosted Storage acceptance work remains in current P9 scope.
