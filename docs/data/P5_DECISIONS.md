# P5 decisions and bounded defaults

**Reviewed:** 2026-10-11  
**Status:** P5 implementation and hosted shared transaction-pooler verification are complete (2026-10-11). P6 has not started.

## Verified facts

- The linked development project is the existing Audentra project. CLI link and Django/legacy Supabase URLs were checked against one another without printing credentials.
- The pre-change read-only catalog query on 2026-10-11 found no public application tables or Storage bucket. After the reviewed P5 changes, the dated [target inventory](P5_TARGET_INVENTORY.json) records six public application tables, each with RLS enabled, 23 public policies, and the private `template-files` bucket with four Storage policies.
- There is no `supabase_migrations.schema_migrations` relation on this target. Historical files in `supabase/migrations/` are references, not evidence that they were applied here.
- The target runs PostgreSQL 17.6. `django_app` remains a restricted login with no role membership. `django_data` has only the reviewed `authenticated` membership with `INHERIT FALSE, SET TRUE`; `service_role` bypasses RLS and is excluded from request paths.
- The provider-owned `ensure_rls` event trigger invokes `public.rls_auto_enable()` for new public tables. P5 leaves that trigger/function unchanged and writes explicit policies and grants.
- The earlier hosted direct PostgreSQL probe is preserved separately. The final hosted P5 probe passed through the shared transaction pooler with the restricted project-scoped `django_data` login; 65 checks passed, three generated accounts were deleted, cleanup succeeded, and `pooler_verified` is true. A/B/A identity/claims and private-row isolation, transaction cleanup, forced rollback/recovery and Django client reuse are recorded in [P5_HOSTED_RESULTS.json](P5_HOSTED_RESULTS.json).

## Owner decisions

| Topic | Decision | Source |
|---|---|---|
| Supabase account access | Use existing authenticated Supabase accounts identified by UUID; no email invitations or migration of legacy identities | Owner answer to the P5 access-default question, 2026-10-11 |
| Template file access | Private bucket; file access is checked for each request | Same owner answer |
| Share roles | Viewer reads; editor edits template content; admin manages shares but does not edit template content; owner retains deletion, visibility control and ownership | Same owner answer; tested in the hosted probe |
| Review visibility | A review is visible to its author and the owner of the reviewed template | Same owner answer |
| Activity | Keep as a feature/reference; no P5 activity backend | Earlier owner decision carried in `prompt.md` |
| Development scope | Keep the existing project and data intact; native Windows; no Docker; do not reopen accepted P4 Auth | Current P5 brief and prior owner instructions |

## New development contracts (not recovered historical schema)

The linked project has no public application DDL to recover. P5's baseline therefore defines new development contracts from the reachable source operations and the owner's access decisions. These contracts do not claim to reproduce absent historical definitions.

- Profiles are keyed by the Supabase Auth UUID. A user can read/update only their own non-authorization profile fields; no global email lookup is provided. Fresh profile initialization is idempotent and does not backfill all Auth users.
- Shares store `recipient_id`, `shared_by`, `template_id`, role, recipient-local hidden state, and timestamps. No recipient email/name directory or pending email invite is created. Recipient identity is supplied by the server after validating an existing account.
- Review rows store a reviewer UUID and review content/status. Personal email/name snapshots are not authorization inputs. Select is limited to reviewer or template owner; writes are constrained to an eligible reviewer and cannot spoof reviewer/template ownership.
- `template-files` is private, limited to 20 MiB and the five configured document MIME types. Object paths are generated as `templates/<template UUID>/<object UUID>.<validated extension>`. The owner can upload/update/delete; owner and authorized share recipients can read. A fresh `cacheNonce` is added to each private download request so a prior CDN response cannot outlive a revoked share. The legacy public-URL return shape is not retained as a security contract.
- `filled_templates` belongs to the verified creating user and references an owned/shared template when a template ID is supplied.
- Template visibility `visible` means discoverable to authenticated accounts; `hidden` means owner/shared-recipient only. It does not make stored files public.

## Explicitly deferred

- Q5 persisted preferences; browser state remains browser state.
- Q6/Q7 team and demo flows; no teams, email invites, or demo-to-real conversion.
- Q13 timezone/product correction; preserve date/time-as-entered semantics and UTC date calculations used by the legacy helper, with boundaries documented.
- Q16 generated public share links; no anonymous link route.
- Q21 activity backend; the feature and original references remain for a later phase.
- Historical Auth-user/profile backfill and import from unrelated dumps.
- Exposed P4 key retirement, email recovery, production confirmation policy, and all P6/P7 page migration.

## Verification status

The pre-change catalog facts were gathered with `supabase db query --linked --file docs/data/P5_READONLY_PREFLIGHT.sql --output-format json`. The guarded P5 baseline/reconciliation and the additive share-role correction were applied to the linked development project. The post-change catalog and synthetic hosted results are recorded in `P5_TARGET_INVENTORY.json`, `P5_HOSTED_RESULTS_DIRECT.json` and `P5_HOSTED_RESULTS.json`; the final pooler run deleted all three generated accounts and sent no test email. Native PostgreSQL baseline, empty-target remediation, idempotence and RLS checks passed. No full hosted schema dump was captured: Supabase CLI attempted Docker and was stopped; native `pg_dump` using the restricted `django_data` role was denied table locks as expected. Do not grant that request role broader privileges to enable dumps. P5 is closed with the hosted pooler proof; the dump limitation remains explicit.
