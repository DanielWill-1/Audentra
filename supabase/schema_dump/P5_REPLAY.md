# P5 migration replay and schema verification

**Date:** 2026-10-11  
**Original scope:** Schema-only native PostgreSQL checks and linked development P5 application, without Docker. The 2026-10-15 follow-up uses local Supabase Docker only; hosted acceptance remains separate.

## Historical migration replay

Historical files were replayed unchanged in a temporary PostgreSQL 18.4 cluster on loopback, with minimal local `auth.users` and `auth.uid()` stubs. Migrations through `20250628064557_aged_tree.sql` exited successfully. Replay stopped at the first failure in `20250628065741_precious_brook.sql`:

```text
ERROR: relation "template_shares" does not exist
```

The failure showed that the historical directory was not a complete, self-contained schema source in this replay environment. It did not prove what another historical project contained. At the time of that original check, no old migration had been edited or reordered; the local-start follow-up below records the later guarded changes.

## Fresh local Supabase replay follow-up (2026-10-15)

The original replay result above exposed a local-start gap. The `precious_brook` migration now skips its share/review RLS changes when those legacy tables are absent, while preserving the changes when they exist. The P5 reconciliation guard now also accepts the exact three-table state produced by the committed legacy migrations, adds the missing P5 tables, and removes equivalent legacy policies before applying the consolidated policy set. Other partial schemas remain rejected.

`npx --yes supabase@latest start` completed successfully and applied the full migration sequence, including both P5 migrations, then created the configured Storage bucket. `npx --yes supabase@latest status` exited successfully and returned local service endpoints. Neither command changed the linked project; no hosted database operation was run.

## Local canonical alignment (2026-10-15)

The initial successful `supabase start` left a hybrid catalog: 58 application columns, 24 policies, nullable legacy fields and duplicate indexes/triggers. Added the forward-only `20261015170000_p5_legacy_schema_alignment.sql` and applied it to the local stack with `npx --no-install supabase migration up --local`. The six application tables were empty before and after. No reset, table deletion, hosted schema change or connection-setting change occurred.

The [scratch regression](../../docs/data/P5_LOCAL_ALIGNMENT_SCRATCH_RESULTS.json) proves fresh historical replay plus alignment matches the checked-in baseline and Storage policies with the accepted P5 role correction. It checks repeated alignment, repeated P5 reconciliation, rollback on incompatible email/NULL data, and native RLS behavior through a disposable connector role. All generated databases and roles were removed.

The [running-local comparison](../../docs/data/P5_LOCAL_ALIGNMENT_RESULTS.json) passes full definitions in 12 areas: six tables, 57 columns, 30 constraints, 19 indexes, 23 application policies, ten triggers, eleven P5 functions, table/column grants, four Storage policies, private bucket settings and absence of the obsolete Auth-profile trigger. Other Supabase platform and retained legacy-team objects are outside this six-table application comparison. Hosted Auth and transaction-pooler verification remain covered by the existing P5/P9 results.

## Original native P5 schema checks

- Applied `supabase/baseline/00000000000000_baseline.sql` plus `supabase/storage/template_files_policies.sql` to a fresh native PostgreSQL 18.4 database with local Auth/Storage stubs matching the bucket config. It created the six intended public tables, 23 public policies and four Storage policies.
- Created a separate isolated empty-application-state database with the same minimal platform stubs. Applied `20261011100000_p5_reconcile.sql` and `20261011150000_p5_share_role_bounds.sql` twice.
- A normalized schema-only `pg_dump` of public and Storage objects was unchanged after the second application. The final scratch catalog had six public application tables, 23 public policies, four Storage policies and `django_data SET TRUE / INHERIT FALSE` membership in `authenticated`.
- The normalized `pg_dump --schema-only` output for the baseline + Storage policy path matched the guarded empty-target remediation path exactly. `migration/django/scripts/p5_native_rls_checks.sql` passed owner, viewer, editor, admin, unrelated-account, review and private-object checks on both paths. Its synthetic DML rolled back.
- The separate Django native PostgreSQL probe passed context enforcement, verified identity, nested context, user switching and rollback.

This was an empty-target-equivalent native scratch check, not a full Supabase restore. It proves PostgreSQL syntax/catalog and policy behavior using the included stubs; hosted Supabase behavior is covered separately by the P5 hosted probe. The verification databases were local synthetic scratch databases and were removed after the checks.

## Linked development project

The pre-change read-only catalog query found no public application tables or Storage bucket and no `supabase_migrations.schema_migrations` relation. The guarded P5 migrations were applied to the existing linked development project. The post-application catalog is [P5_TARGET_INVENTORY.json](../../docs/data/P5_TARGET_INVENTORY.json); hosted synthetic access evidence is [P5_HOSTED_RESULTS.json](../../docs/data/P5_HOSTED_RESULTS.json).

A full hosted schema-only dump could not be captured without exceeding the accepted constraints. `supabase db dump --linked` unexpectedly attempted a Docker image pull and was cancelled before the dump ran. Native `pg_dump --schema-only` using the restricted `django_data` login connected but failed its `ACCESS SHARE` lock on `public.users` because the login has no direct table `SELECT` privilege. That least-privilege grant was not widened. `20261011-pre-p5-public-schema.sql` is historical pre-change material; it is not current hosted DDL.

The original native PostgreSQL scratch cluster did not establish hosted Auth, Storage CDN, or transaction-pooler semantics. The original hosted probe used the direct database host; the later shared transaction-pooler/user-switch verification passed as recorded in [P5 verification](../../docs/data/P5_VERIFICATION.md).
