# Superseded P4 report

The owner's 2026-10-11 development-only scope supersedes the SMTP, email verification, React compatibility, and old-account gates below. See P4_REPORT.md for current acceptance.

# P4 implementation report

**Date:** 2026-10-10  
**Revision:** `main` at `b66efbb` plus the uncommitted migration work in this workspace  
**Status:** Local P4 implementation, synthetic browser verification and PostgreSQL cross-process concurrency proof are complete. P4 remains incomplete because hosted email template changes and live email Auth checks are blocked by the current Free-plan/default-email configuration.

## Scope and decisions

The owner authorized P4 implementation and later resumed the hosted gate for **Supabase Auth email/password only**; Google/Azure signup is excluded. I implemented and verified the local Django/GoTrue boundary using synthetic responses and a loopback-only fake GoTrue server. I inspected the hosted Auth config and added exact local callback URLs to its redirect allowlist. Email templates remain unchanged, no Auth account was created or modified, and no email was sent because the Free-plan default provider blocks template edits and no custom SMTP is configured. No database schema, policy, Storage, deployment, commit or push operation was performed.

P4 preserves parallel sessions: Django owns its server-side session; the legacy React/Supabase session remains independent. P4 does not create public profile rows. Profile/schema/Storage and user-scoped RLS work remain P5a/P5b.

## Implemented

- Added Django auth routes and forms for sign-in, signup, email confirmation, password recovery/update, optional PKCE OAuth handlers, logout and a protected session proof page. Google/Azure remain disabled; the current product path is email-only.
- Added GoTrue request/response validation, finite timeouts, no automatic retries, trusted token-free principals, server-side token storage, refresh handling, safe redirects and sanitized errors.
- Added refresh/logout coordination and stale-session-save protection. Offline tests exercise two independent session stores and race/stale-write cases against the test database.
- Required verified identity for the existing speech/AI POST endpoints; cookie-authorized requests require CSRF, bearer-only requests omit cookies, conflicting identities fail closed, and invalid bearer tokens do not fall back to a Django session.
- Updated the opt-in React service transport to attach its current Supabase bearer only when Django transport is enabled and to omit cookies. The disabled path retains the legacy Express URL and makes no session lookup.
- Corrected the three bounded P3 findings: Google SDK retries and client cleanup, Google error-to-HTTP mapping, and JavaScript UTF-16 TTS length validation. Supported prompt JSON serialization was also compared with the source behavior.
- Added [P4_CONTRACTS.md](P4_CONTRACTS.md). The email templates in [P4_EMAIL_TEMPLATE_DRAFTS.md](P4_EMAIL_TEMPLATE_DRAFTS.md) are proposals only and were not applied.

## Verification

The recorded lock/Ruff/MyPy/pytest/Django/static commands ran from `migration/django/` with project-local `.uv-cache` and `.venv-p2`. Pytest used `config.settings.test`, whose database aliases are in-memory SQLite; no hosted database was used for that suite. The separate PostgreSQL concurrency probe used the project’s configured PostgreSQL session backend as described below.

| Check | Result |
|---|---|
| `uv lock --check --offline` | Passed; 48 packages resolved |
| `uv run --offline ruff check apps config tests` | Passed |
| `uv run --offline python -m mypy config apps tests` | Passed; 56 source files |
| `uv run --offline python -m pytest -q` | Passed; 74 tests |
| `uv run --offline python manage.py check --settings=config.settings.test` | Passed; no issues |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build_static.ps1` | Passed; pinned Tailwind digest and token checks passed |
| `node scripts/check_react_transport.mjs` | Passed with Django transport enabled and disabled; bearer and cookie omission verified in the enabled mode; no session lookup in the disabled mode |
| Scratch Vite build with `VITE_USE_DJANGO_SERVICES=false` and `true` | Both passed with `--minify=false --target=esnext`; 1,593 modules transformed in each build; output used a validated temporary directory and the legacy `dist/client` was preserved |
| Production settings assertions | Passed; DEBUG off and session/CSRF cookies secure |
| `node scripts/check_p4_browser.mjs http://127.0.0.1:<synthetic-port>` | Passed against local fake GoTrue + Django: login, cookie modes, CSRF API rejection/acceptance, recovery, password update and logout |
| PostgreSQL P4 concurrency probe (command below) | Passed against the configured PostgreSQL session backend: two-process refresh serialized once; logout race removed the row; stale save did not recreate it. The probe used generated `django.django_session` rows and a loopback fake GoTrue server, with exact cleanup in `finally`. |

The React transport probe needs permission to start esbuild's local child process; it passed when run with the approved local process permission. Vite minification was disabled because esbuild's minifier cleanup has failed with `Access is denied` in this Windows runner. The builds still verified both transport configurations. The browser probe uses same-origin fetch for form submissions because this headless runner's native POST produced `Origin: null` and omitted cookies; Django Client tests separately cover CSRF-protected form POST handling. This is synthetic local evidence, not a real hosted Auth flow.

The PostgreSQL probe used the Windows Store Python 3.12 interpreter because the uv-managed interpreter in this workspace cannot load `ctypes`. From the repository root, the command was:

```powershell
$env:PYTHONPATH = (Resolve-Path migration/django/.venv/Lib/site-packages).Path
& "$env:LOCALAPPDATA\Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0\python.exe" migration/django/scripts/check_p4_postgres_concurrency.py
```

A one-file Ruff check for the new probe could not complete in this runner: the Ruff process exited `-1` under the available Windows runtimes. The broader recorded P4 Ruff check passed for `apps config tests`; the PostgreSQL probe itself executed successfully.

## Hosted configuration result

The linked project is a development/testing project on the **Free** plan. The Management API read succeeded and sanitized before/after snapshots are in [P4_HOSTED_CONFIG_BEFORE.json](P4_HOSTED_CONFIG_BEFORE.json) and [P4_HOSTED_CONFIG_AFTER.json](P4_HOSTED_CONFIG_AFTER.json). The current settings show email signup enabled, email confirmation required, Google/Azure disabled, and `site_url` unchanged at `http://localhost:3000`. The exact local Django confirmation callback and legacy Vite dashboard/reset destinations are in `uri_allow_list`; the unused OAuth callback was removed and the final list was verified by readback.

No custom SMTP provider is configured. An idempotent PATCH that reasserted the existing confirmation subject was rejected with HTTP 400 and the message: `Email template modification is not available for free tier projects using the default email provider. Please upgrade your plan or configure a custom SMTP provider.` Consequently, the confirmation and recovery templates remain the original `{{ .ConfirmationURL }}` versions. The reviewed conditional `.TokenHash` drafts are in [P4_EMAIL_TEMPLATE_DRAFTS.md](P4_EMAIL_TEMPLATE_DRAFTS.md); they have not been applied. The supplied test mailbox is not an organization member, and Supabase's default sender only sends to organization members. I did not invite it: the Free plan does not offer the zero-project-access role, so the available membership path would grant broader project access than this Auth test needs ([SMTP restrictions](https://supabase.com/docs/guides/auth/auth-smtp), [organization roles](https://supabase.com/docs/guides/platform/access-control)).

The ignored `migration/django/.env` public Auth key setting was corrected to contain one public anon token only; privileged API key values were removed from that setting. Its value is not included here, and the root `.env` was preserved. No account operation or email send occurred. No configuration was pushed from `supabase/config.toml`.

**Credential handling note:** A diagnostic command accidentally printed the combined local environment line, including privileged API key values, into this session's tool output. The ignored file was immediately corrected and no credential values were copied into repository documentation. Treat the exposed Supabase secret/service-role keys as compromised: rotate them in the Supabase API Keys settings and update every consumer, including any CI secrets, before relying on them. They were not revoked here because the workspace cannot verify or update all external consumers safely.

## Remaining P4 gates

### Follow-up diagnosis, 2026-10-10

A fresh hosted read confirmed the project is healthy, on Free, created on 2026-09-15, and still has no custom SMTP. The ignored root environment also contained secret keys in the browser/parity public-key settings. Both now contain the matching project's existing public anon JWT. A read-only Auth settings request using that key and a browser user agent returned HTTP 200; no signup or email was triggered. Restart Vite and rebuild any generated assets before reuse. This fixes a current browser configuration fault, not the pending hosted email flows. See [P4_UNBLOCK.md](P4_UNBLOCK.md) for the diagnosis, Gmail SMTP setup and owner actions. A Supabase upgrade is not required for that free development path.

1. Rotate the exposed Supabase service-role/secret keys and update every consumer, including any CI secret that uses them, before relying on those credentials again. The public anon key is separate; no value is recorded here.
2. Configure custom SMTP in Supabase using the free development setup in [P4_UNBLOCK.md](P4_UNBLOCK.md). The owner must create and enter the SMTP credential through their account. Keep credentials in Supabase settings, not repository files or chat. An upgrade alone does not address the default sender's recipient restriction.
3. Apply and preview the conditional confirmation/recovery templates from [P4_EMAIL_TEMPLATE_DRAFTS.md](P4_EMAIL_TEMPLATE_DRAFTS.md), preserving the legacy `.ConfirmationURL` branch. Record a sanitized after snapshot.
4. Run one bounded email-only flow with the designated owner-controlled mailbox: at most one signup and confirmation, one password login, one recovery/password update, and one refresh/logout sequence. No Google/Azure OAuth flow is in scope. No live account operation has yet occurred.
5. Recheck the P4 API matrix and actual browser behavior against the configured hosted Auth flow. Existing synthetic browser and mocked API results do not substitute for this evidence.
6. P3 live Google/Groq speech comparisons remain open for later voice/P9 verification.

The local implementation and PostgreSQL concurrency proof pass, but hosted email confirmation/recovery compatibility is not established. P4 is **not complete**. Do not start P5/P6 from this report.

## Rollback

For local rollback, set `VITE_USE_DJANGO_SERVICES=false` and stop only the Django development server. The legacy React/Express runtime and AuthContext remain available. The only hosted change is the scoped local redirect allowlist; restore its before-state from the recorded snapshot only if required. No Auth template, database, Storage or RLS policy was changed.
