# P9 read-only schema acceptance

**Status:** NOT RUN in P9. The initial P9 route inventory used `config.settings.test` and made no database connection. This file is the prepared read-only checklist, not a claim about current hosted schema.

## Accepted baseline

Use the accepted P5 schema and security references: [P5 contracts](../data/P5_CONTRACTS.md), [P5 verification](../data/P5_VERIFICATION.md), [schema reconciliation](../schema-reconciliation.md), and the unchanged migrations under `migration/django/apps/*/migrations/` and `supabase/migrations/`. P9 must record the exact read-only target identity/project and timestamp without exposing credentials. Do not run DDL, migrations, policy/grant changes, or row copies as part of this inspection.

## Inspection rows

| Area | Read-only comparison | P9 result |
|---|---|---|
| Tables and columns | Names, SQL types, nullability, defaults, generated/identity behavior, constraints, foreign keys and indexes versus accepted P5 migrations. | NOT RUN |
| Ownership and RLS | Table owner, RLS enabled/forced state, policy predicates/roles, grants and restricted `django_data`/`django_app` boundaries. | NOT RUN |
| Storage | Bucket privacy, object size/MIME limits, policies, object owner/path rules and Django private-file authorization. | NOT RUN |
| Django database aliases | Default session/migration alias versus Supabase application-data alias; role/search-path separation and transaction-local authenticated context. | NOT RUN |
| Drift | Exact object and migration differences, effect on runtime/acceptance, and proposed owner decision if remediation is needed. | NOT RUN |

Read-only hosted inspection is separate from synthetic route writes. Any mutation required to correct drift needs a concrete scope and approval; do not modify schema during acceptance review.
