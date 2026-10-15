# P9 read-only schema acceptance

**Status:** Incomplete. The P9 schema inspection completed against the accepted P5 baseline using the restricted project-scoped `django_data` identity. All inspected schema/security comparisons passed. Owner requested another nonprivileged Storage metadata attempt; attempt 05 again returned no bucket metadata. This remains unavailable, not schema drift. Do not use an admin/service-role credential. See the [attempt 05 command result](evidence/p9/p9-full-20261014-0723-utc/P9_SCHEMA_ACCEPTANCE_ATTEMPT_05_COMMAND_RESULTS.json).

## Run and boundaries

- Run: `p9-full-20261014-0723-utc`
- Results: [attempt 04](evidence/p9/p9-full-20261014-0723-utc/P9_SCHEMA_ACCEPTANCE_ATTEMPT_04.json), [attempt 05](evidence/p9/p9-full-20261014-0723-utc/P9_SCHEMA_ACCEPTANCE_ATTEMPT_05.json)
- Hosted route probe that supplied the read-only metadata attempt: [P9_HOSTED_ROUTE_RESULTS.json](evidence/p9/p9-full-20261014-0723-utc/P9_HOSTED_ROUTE_RESULTS.json)
- Target: Audentra development project `pgtttjmqibxufvwehkyj`, shared transaction pooler, restricted `django_data` identity.
- Read-only: no DDL, migrations, policy/grant changes, row reads or row copies were performed by this schema inspection.

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
| Storage bucket privacy and limits | UNAVAILABLE after two restricted reads | Attempt 04's authenticated synthetic-owner Storage API GET returned HTTP 400. Owner-authorized read-only attempt 05 used the existing project-scoped restricted identity and returned no metadata row for bucket `template-files`; privacy, size limit and MIME allowlist remain unknown. |

The complete comparison and connection details are in [P9_SCHEMA_ACCEPTANCE_ATTEMPT_04.json](evidence/p9/p9-full-20261014-0723-utc/P9_SCHEMA_ACCEPTANCE_ATTEMPT_04.json). The result status is `drift_or_incomplete` only because bucket metadata was unavailable; no difference was found in the visible P5 baseline objects.

## Remaining acceptance

Obtain read-only bucket privacy/size/MIME metadata through an owner-authorized nonprivileged method. The Supabase integration has been surfaced for connection because the existing restricted database path cannot see these fields; it is not connected yet. Do not retry with an admin/service-role credential and do not change the bucket or policies as part of this inspection. The latest restricted-read evidence remains incomplete, not drift.
