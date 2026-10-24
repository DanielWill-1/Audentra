# P10 Wave 5: release-candidate review

**Updated:** 2026-10-17. **Status:** P10 Waves 1–5 and the local release candidate are owner-reviewed/accepted. The synthetic login/template smoke passed against a fresh loopback server on port 8001; the existing port 8000 process remains unresponsive and untouched. P10 implementation is complete, but this is not deployment approval. Local synthetic demo credentials were generated in ignored state files; no hosted or production credentials, DNS, deployment, or traffic were changed.

## Scope and result

Wave 5 covers repeatable performance measurement, actionable sanitized failures, a local-first Supabase setup, separate local and hosted-demo profiles, safe local reset, and a reviewable release candidate. The operational instructions are in the [local runbook](P10_LOCAL_RUNBOOK.md). The prior 2026-10-15 preparation evidence remains historical and unchanged in the [readiness ledger](P10_READINESS.md).

The Django `local-supabase` profile is now the normal local run path. It uses only local `P10_LOCAL_*` values, rejects non-loopback database/API endpoints, and masks hosted database/Auth variables from `.env`. `local-http` is a compatibility alias. The explicitly selected `demo-http` profile remains separate. A profile-isolation check supplied fake hosted endpoint variables and confirmed the local profiles still reported only restricted local PostgreSQL and local Supabase configuration.

The local setup and guarded reset were both exercised. Reset was invoked with `setup_local_supabase.ps1 -Local -Reset -Yes`; the local Supabase stack replayed all 11 repository migrations, and the Django session migration was reapplied. Provisioning created only the synthetic `demo@voiceform.local` account and `Demo patient intake` template. Restricted database passwords, Django secret, and demo password are stored under ignored `migration/django/.state`; the local CLI service-role key is passed in memory and is not printed or written to the generated files.

After reset, the local Waitress server passed preflight and the browser smoke passed database readiness, email validation, safe incorrect-password feedback, Supabase sign-in, and protected template access. The smoke output confirms credential values were not printed. The server is currently available at `http://127.0.0.1:8000` for owner review.

## Performance evidence

Measurements were taken on Windows 11 (`win32 10.0.26200`), AMD Ryzen 5 5600H, 12 CPU cores, 15.3 GiB RAM, Chromium 148.0.7778.96, and Playwright 1.60.0. Cold measurements use five fresh browser contexts loading `/`; warm measurements use nine full-page navigations across `/`, `/features`, and `/documentation`.

| Measurement | Before | After | W5 target | Result |
|---|---:|---:|---:|---|
| Cold `/` load median | 684.3 ms | 268.9 ms | first load p95 ≤1.5 s | Pass |
| Cold `/` load p95 | 1,999 ms | 1,440.1 ms | ≤1.5 s | Pass |
| Cold DOMContentLoaded median | 505.7 ms | 98.3 ms | — | Improved |
| Warm route load median | 20.2 ms | 19.5 ms | ≤800 ms | Pass |
| Warm route load p95 | 26.1 ms | 1,002.2 ms | ≤1.5 s | Pass |
| Warm DOMContentLoaded p95 | 21.6 ms | 19.2 ms | — | Improved |

The largest cold-load delay was the Google Fonts stylesheet, so it now loads asynchronously and no longer holds DOMContentLoaded. The performance environment could not fetch `fonts.gstatic.com`; this produced one 1,002 ms warm load event and appears in the recorded resource-failure data. It did not block DOMContentLoaded. Full measurements and machine metadata are preserved in the [before report](P10_W5_PERFORMANCE_BEFORE.json) and [after report](P10_W5_PERFORMANCE_AFTER.json).

## Focused verification

- Django `check --settings=config.settings.local_supabase`: passed with no issues.
- `p10_preflight.py --profile local-supabase`: passed; local restricted PostgreSQL, local service endpoints, and configured Groq modes reported without network calls or credential values.
- Full Django regression suite: **185 passed** across runtime, accounts, AI, speech, voice, data-layer, pages, and session-boundary tests.
- Playwright local demo smoke after reset: passed all reported stages.
- Full Ruff check (`apps config scripts tests`), Node syntax checks for the local demo and performance scripts, Python compilation for W5 setup/preflight/settings files, and `git diff --check`: passed.
- React production build and TypeScript (`npm run build`): passed. Vite reports a 731.67 kB JavaScript chunk (170.19 kB gzip), above its 500 kB advisory threshold; it also reports the existing CJS API deprecation and outdated Browserslist data.
- Repository-wide `npm run lint`: failed with 278 errors and 99 warnings. ESLint traverses Django `.uv-cache`/`.venv-p2` vendor files as well as the retained legacy React source. Scoped checks pass for the cloud-consent helper and Privacy/Security pages; the legacy `AIVoiceAutoFill.tsx` and `services/ai.ts` retain existing `any` and unused-code lint findings. TypeScript and the production build pass; this lint backlog remains recorded rather than being refactored during P10 closeout.

The regression tests now carry the current consent header when modeling an opted-in user, independently assert that cloud AI endpoints reject missing consent, verify that CORS permits the consent header, and assert that extraction only fills fields present in the form. Speech tests use explicit mock defaults, so a developer's private `.env` provider settings do not change their outcomes.

## Final audit follow-up

Follow-up on 2026-10-17: the documented local setup provisioned only the synthetic demo account and template without resetting the local database. The existing server on `127.0.0.1:8000` returned HTTP 200 from `/readyz` initially, but its login POST did not return; a later readiness request also timed out. That process was left untouched. A second `local-supabase` Waitress process was started on loopback port 8001 with the installed Windows Python 3.12 interpreter and existing locked environment. `/readyz` and `node migration/django/scripts/p10_local_demo_check.cjs` passed against port 8001: field-specific email validation, sanitized invalid-credential recovery, local Supabase sign-in, and the synthetic patient-intake template. No provider/Groq request was involved, and the smoke output printed no credential values. The temporary port 8001 process was stopped. The smoke follow-up is closed; the unresponsive port 8000 process remains a separate local runtime issue.

## Review gates and boundaries

- **W5:** implementation and evidence complete; the owner manually reviewed the local release candidate and reported it is working as expected (2026-10-17).
- **W1/W2:** implementation evidence and owner manual review are accepted. Physical-device behavior and audibility remain excluded from this P10 scope.
- **W3:** owner confirms Groq ZDR is disabled. User-facing consent/privacy copy discloses that state and Groq's documented possible retention. This is owner-attested, not independently verified from the console.
- **W4:** main journey and public route/link audit completed. W5 supplies the reusable local demo account/reset workflow. No additional route-specific issue list was reported.
- **Hosted demo:** not retested or modified by this work. It remains separate from the local profile.
- **Deployment:** deferred. No host/domain/TLS setup, hosted credentials, production migration, public release, or traffic change is authorized by this review.

## P10 closeout and remaining external gates

The five waves have linked implementation and review evidence, the full Django test suite and Ruff pass, and the owner accepts the local release candidate. P10 implementation is complete for local development and synthetic-demo scope. The browser smoke follow-up passed on port 8001; the pre-existing port 8000 process remains unresponsive and was not stopped or modified.

- P4 Supabase project-secret/legacy-key retirement remains a pre-deployment security gate. Automatic approval review rejected broad revocation because unknown external CI/application consumers could break; no key was changed in this closeout. See the [P4 report](../auth/P4_REPORT.md).
- The tracked Google `service-account.json` private-key blob remains reachable in local refs. The owner says Google will not be used and instructed leaving the key unchanged; no key contents were inspected and no rotation or removal was performed. The exposure remains unresolved and is a pre-deployment security risk. See [migration state](../foundation/MIGRATION_STATE.md).
- No public host/domain, TLS path, production database/storage configuration, or deployment decision exists. Do not treat the local release candidate as production approval.
- At the time of this P10 closeout, P11 remained queued pending a later owner decision. The later decision is recorded below.

**Later owner decision (2026-10-17):** Local P11 legacy retirement is authorized without deployment, soak, telemetry, or recovery-reference entry gates. Deployment remains deferred. See [P11 closeout](../handoffs/HANDOFF_2026-10-17_P11_LEGACY_RETIREMENT.md).

