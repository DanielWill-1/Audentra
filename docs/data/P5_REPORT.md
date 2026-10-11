# P5 implementation report

**Date:** 2026-10-11  
**Overall status:** **Complete for P5.** Implementation, hosted shared transaction-pooler verification and cleanup passed on 2026-10-11. P6 has not started.

P5 added a Django data layer for the existing development site and reconciled the previously empty public application schema. P5 does not migrate pages or change the React/Express source. Original folders remain in place.

## Implemented

- Added six unmanaged application models for profiles, templates, shares, reviews, scheduled events and filled forms.
- Added the verified-user RLS transaction context, transaction-local claims/role, context guard, query guard and alias routing under `migration/django/apps/db/`.
- Added profile initialization on new verified sessions and own-profile updates.
- Added template CRUD/list/search/category/visibility operations, UUID-based account sharing, recipient-local share visibility, review queue and participant-scoped review services.
- Added account-scoped scheduler selectors and writes, filled-form save/list/detail/delete, and private template-file upload/download/delete.
- Implemented private `template-files` access with a generated object path, 20 MiB limit, MIME allowlist and CDN cache nonce on downloads.
- Added a fresh-install baseline and guarded additive reconciliation. Applied `20261011100000_p5_reconcile.sql` and the follow-up `20261011150000_p5_share_role_bounds.sql` to the linked development project. Historical migrations were not edited.
- Documented owner/viewer/editor/admin access and tested the admin boundary: admin manages shares but cannot edit template content; editor can edit content but cannot change owner visibility; only owner deletes or changes visibility.

## Verification

- The earlier hosted direct-host P5 probe passed and is preserved in [P5_HOSTED_RESULTS_DIRECT.json](P5_HOSTED_RESULTS_DIRECT.json).
- The final hosted P5 probe passed through the existing project's shared transaction pooler: 65 checks, three generated accounts created and deleted, zero emails, and cleanup success. `pooler_verified` is true only after the restricted project-scoped login, A/B/A role/claims and private-row isolation, context guards, forced rollback/recovery, reused Django client connection and complete cleanup passed. See [P5_HOSTED_RESULTS.json](P5_HOSTED_RESULTS.json).
- The hosted probe passed fresh signup/profile setup, profile isolation, template CRUD/search, private file access and revocation, share roles/escalation denial, participant-only reviews, scheduler operations, filled-form isolation and exact object cleanup.
- Native PostgreSQL scratch passed clean baseline creation, baseline/remediation catalog equivalence, empty-target remediation twice, unchanged normalized schema after re-application, and RLS policy assertions on both schema paths. A separate Django scratch probe passed context, user-switch and rollback checks.
- Regression checks: 90 pytest tests passed; `manage.py check` passed; focused P5/app Ruff and mypy are recorded in [P5_VERIFICATION.md](P5_VERIFICATION.md).
- Follow-up closure changes passed 95 pytest tests, `manage.py check`, focused mypy over 60 source files and Ruff. These local checks accompany the hosted behavioral proof.
- The hosted catalog now records six public application tables with RLS enabled, 23 public policies, a private `template-files` bucket and four Storage policies. The connector role can set `authenticated` with `INHERIT FALSE, SET TRUE`; it does not inherit application privileges.

## P5 closure

The hosted acceptance gate passed through the exact shared transaction-pooler endpoint and restricted `django_data.<project-ref>` login. The probe verified A/B/A role, claims and private-row isolation on a reused Django client connection; confirmed transaction-entry role/claims were cleared; forced a SQL error and verified rollback plus identity recovery; and passed all existing Auth/data/Storage checks. Three generated accounts were deleted, no email was sent, and `cleanup_ok` is true. The active result contains no connection string or credential.

Transaction-mode settings disable Psycopg prepared statements and session startup search-path state. RLS requests and the fixed health probe set search paths inside their own transactions. Local coverage and hosted behavior now both pass. P5 is complete; P6 remains unstarted and requires a separate owner request.

## Other limitations

- The target had no public application schema to recover. P5 creates new development contracts documented in [P5_CONTRACTS.md](P5_CONTRACTS.md); these are not claimed as historical schema.
- A full hosted schema-only dump was unavailable: Supabase CLI tried to start Docker and was stopped, and native `pg_dump` with the restricted request role was denied table locks. The app role was not widened. Current hosted catalog evidence is `P5_TARGET_INVENTORY.json`; the pre-P5 dump is labelled historical.
- The earlier direct-host result remains separately archived; the final hosted result verifies transaction-pooler behavior. Native PostgreSQL scratch checks still do not replace hosted Supabase Storage/RLS checks.
- Email-based password recovery, P4 credential retirement, production signup-confirmation policy, team/demo storage, preferences, activity backend, anonymous share links, page migration and production deployment remain outside P5.
- A broad `mypy apps scripts` invocation also reports existing P4 probe typing findings; the focused P5/app command is the relevant P5 check. See [P5_VERIFICATION.md](P5_VERIFICATION.md).

## Next phase

P5b and overall P5 are complete. P6 may build the shared Django rendering shell after a separate owner request; P7 page waves remain separately gated by the roadmap and product decisions.
