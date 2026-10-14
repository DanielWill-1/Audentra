# P10 task: local operation and deployment preparation

**Updated:** 2026-10-14. **Status:** Prepared reference only; P10 implementation and readiness checks have NOT RUN and must wait for explicit owner approval after P9. The owner's latest instruction is to finish and report P9 first. Do not treat this brief as authorization to start P10. Actual deployment remains a later decision.

## 1. Objective and entry

Deliver a reproducible native Windows application that runs locally with the existing Supabase development project and existing configured speech/extraction providers. Prepare a concrete, tested server/build/configuration package and operational instructions that a later deployment can use. Preserve the accepted P4/P5/P7/P8 behavior and unavailable-feature boundaries.

After the owner explicitly approves P10, review the P9 matrix, evidence and open defects first. Any future P10 preparation must keep missing P9 evidence visible; it cannot grant a P9 acceptance exception.

Refresh branch/HEAD/status, runtime versions, code/config digests and a new run ID. Read applicable AGENTS.md and inspect mounted routes and settings. Retain original source, reference assets and prior evidence. Use native Windows and locked project dependencies; choose only the minimal additional pinned runtime tools required by the deliverables.

## 2. Reviewed gaps to address

These are repository observations on 2026-10-14, not executed readiness failures:

- `config/settings/prod.py` rejects `P3_SERVICES_ENABLED=true`; `apps/api/boundary.py` requires a loopback client. Preserve the development default, but implement and verify an explicit deployment-compatible service policy/topology before calling the full application deployable. Simply removing the guards is insufficient.
- `pyproject.toml` has no production WSGI/ASGI server dependency. Documented startup uses Django `runserver`. Provide a supported pinned server entry point, static-serving strategy and process-start/restart instructions.
- `apps/api/throttling.py` is an in-process limiter. State its process/restart limits and supply a tested rate-limit strategy for the supported deployment topology. Do not promise multi-process protection from one process's memory or trust arbitrary forwarded addresses.
- The local Django environment has nonempty Supabase/database settings, but no nonempty `GROQ_API_KEY` or `GOOGLE_APPLICATION_CREDENTIALS` setting was found in its file or current process environment. This checks configuration presence only; it does not verify connectivity, credential validity or other machine ADC sources. Verify the existing providers after credentials and bounded usage authorization are available.

## 3. Runtime and configuration deliverables

Implement the following as reviewable local files:

1. A documented local start/stop workflow and configuration preflight. Validate required settings privately; report only setting names and sanitized failures. Clearly label mock/demo and real-service modes. Real mode must not silently replace provider errors with successful fake data.
2. A pinned server launch command/script with explicit bind, timeouts and request/upload limits. Include a checked production-style profile, static build/collection/serving configuration, and reproducible installation from the existing lockfile. A Windows-compatible server is sufficient for the current target; document supported topology and any future platform adaptation.
3. An environment-variable reference with placeholder values, server-only secret handling, default/Supabase alias separation, provider modes, allowed hosts/origins and local versus production cookie/TLS settings. Keep actual credentials in ignored files or the future owner's secret store.
4. A production-compatible service access policy or concrete private-upstream/proxy configuration. Preserve verified identity, session CSRF, origin/host/method validation, payload limits, request marker semantics and rejection before provider access. Define trusted proxy handling explicitly; forwarded headers must not let a direct attacker satisfy private-client or HTTPS checks. Keep legacy inputs/bearer support until P11.
5. A health/readiness check, bounded sanitized logging and startup/restart troubleshooting. Provider health checks must not spend money by default. Separate process readiness, data readiness and optional provider verification.
6. Runbooks for installation, startup, static assets, safe Django-owned migrations, configuration changes, service recovery, future release verification, monitoring and a proposed soak. Specify code/traffic rollback separately from targeted recovery of corrupted application data. Valid newly written rows survive a code rollback.

Host/domain selection, provider account ownership, future production Auth policy and credential retirement stay in a decision list with prerequisites and owners. Supply templates/placeholders rather than choosing a cloud account, domain or production target.

## 4. Local functionality and verification

Use the actual Django app without `config.settings.browser` fixture bypasses for functional acceptance. Synthetic accounts/data in the existing authorized development project are allowed under the P9 fixture/cleanup contract. Do not point isolated pytest at hosted databases or run schema-changing commands on shared/production targets.

Verify signup/login, remember-me/refresh/logout/password change, protected route navigation and cross-account denial. Verify template CRUD/builder/duplicate/visibility/export/private files/share/review; scheduler and bulk operations; filled-form save/read/delete; accepted local settings/activity behavior. Confirm persistence and exact exported/downloaded bytes, failure feedback, and cleanup of only generated resources. Reuse exact P9 evidence when unchanged; do not repeat checks solely to manufacture P10 counts.

For real local voice, verify desktop permission/recording/preview, existing live STT/extraction/TTS, editable review and persisted filled-form results. Credentials, real devices and explicit provider/spend scope are required. Missing access leaves the real-flow result NOT RUN; finish independent runtime/configuration work and report the prerequisite. Physical mobile certification remains visible as an unrun release check if no device is available.

Test the prepared server locally with the chosen configuration and `DEBUG=False`, preview fixtures off and normal session/CSRF middleware. Serve collected assets and check public/protected routes and service denials through its actual HTTP path. If the production profile uses secure cookies, exercise it over local HTTPS or record the missing HTTPS gate; an isolated HTTP demonstration must use a clearly named local profile without weakening production defaults. Check host/origin/proxy spoofing, anonymous/cross-account requests, payload/rate limits and rejection before provider calls, plus restart/session recovery and exact-route rollback/restoration.

Run focused regressions for verified defects, then the appropriate aggregate checks once: isolated pytest, Django check, accurately scoped mypy/Ruff, changed JS/helper syntax, pinned CSS/token checks and collectstatic when affected. Run Django's deployment checks against the prepared production configuration; resolve material findings or report exact unresolved prerequisites. Record commands, environment, outputs and linked evidence under a fresh run directory.

## 5. Files and evidence

Existing implementation paths permitted for necessary readiness changes are `migration/django/config/settings/`, `config/wsgi.py`, `config/asgi.py`, `apps/api/`, related account/service code where a verified requirement requires repair, `.env.example`, `pyproject.toml`, `uv.lock`, `scripts/`, `tests/`, static-build configuration and `README.md`. Record the exact affected existing paths before each repair. Keep changes tied to a P9/P10 requirement; avoid unrelated upgrades or new product features.

New runtime helpers belong under `migration/django/scripts/` or `config/`; operational documents belong under `docs/deployment/`. Deliver:

- `P10_READINESS.md` with artifact links and explicit results.
- `P10_LOCAL_RUNBOOK.md`, `P10_DEPLOYMENT_RUNBOOK.md` and `P10_ROLLBACK_RUNBOOK.md`.
- `docs/deployment/evidence/p10/<run-id>/` with sanitized metadata, command ledger, actual-server/local-flow results and cleanup records.
- Updated P9 ledger/matrix only for requirements actually verified, migration state/plan/indexes and a dated handoff.

## 6. Completion and later deployment

Report three distinct outcomes: **local functionality**, **P10 preparation**, and **deployment/release verification**. Each needs its own requirement evidence; avoid a blanket completion claim.

P10 preparation passes when its runtime/configuration/runbooks are implemented, reproducible and locally checked, and all locally critical supported flows have passing evidence. A mock-only voice demonstration cannot satisfy the owner's fully functional voice target. If access prevents required real-flow checks, report preparation progress and that exact remaining gate rather than a fully functional pass. Full P9 acceptance retains all required device/provider rows or explicit owner exceptions.

Actual publishing/deployment, production data, DNS, traffic switching, production migration application, external secret/credential changes and production soak require the owner's later deployment decision. Prepare these operations concretely in the runbooks; mark their checks DEFERRED BY OWNER, never PASS. Local configuration/build verification does not establish production readiness on an unselected host. P11 retirement still requires deployed verification, the agreed soak and zero transitional usage evidence.

No commit/push or legacy deletion is included in this brief. After the preparation work and local verification, deliver the files, results and outstanding prerequisites for review.
