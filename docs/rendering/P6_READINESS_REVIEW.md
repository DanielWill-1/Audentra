# P1–P5 review and P6 readiness

**Reviewed:** 2026-10-11
**Snapshot:** HEAD acba956 plus existing uncommitted P5 work.
**Scope at the time:** Read-only evidence/code review and preparation of root P6 prompt. No P6 implementation, hosted probes, account/data writes or provider calls were performed in that review.

**Status addendum (2026-10-11):** P6 was subsequently implemented at the owner's request. Current outcome and evidence are in [P6_REPORT.md](P6_REPORT.md), [P6_VERIFICATION.md](P6_VERIFICATION.md), [P6_ROUTE_OWNERSHIP.json](P6_ROUTE_OWNERSHIP.json), [P6_ASSET_INVENTORY.md](P6_ASSET_INVENTORY.md) and [P6_ROLLBACK.md](P6_ROLLBACK.md). Findings below are the dated readiness snapshot, not current implementation status.

## Finding

P6 is ready to begin when the owner requests implementation. Its P2 foundation and P1 manifest/reference prerequisites are available, and the session's additional P5 pooler gate is closed.

P1–P5 are not all fully verified without qualification. P1 has accepted exceptions; P3 live provider/device evidence remains open; P4 passed its revised development scope with separate recovery/security/production follow-ups. Preserve these distinctions through P6/P7/P9.

## Phase evidence

| Phase | Reviewed conclusion | Evidence and outstanding limits |
|---|---|---|
| P1 | Finalized with owner-accepted exceptions | [Acceptance](../parity/P1_ACCEPTANCE.md) records 27 passed / 2 skipped and 24 historical desktop references. This review confirmed the manifest and React source contain the same 25 paths. Full state matrix remains false; mobile, /open and successful authenticated references and numerical tolerance approval remain open. |
| P2 | Complete within foundation scope | [Review](../foundation/P2_REVIEW.md) records isolated tests, native Django, restricted aliases/roles, health/static/framework checks. Current code retains in-memory test aliases and separate application/state routing. |
| P3 | Implementation and bounded code findings closed; full live evidence incomplete | [Later review](../services/P3_REVIEW.md) supersedes the initial report's code findings. SDK retry/status and UTF-16 corrections have regression evidence. Live Google/Groq and device/browser voice verification remain pending for later voice/P9 work. |
| P4 | Revised development Auth scope passed and owner-accepted | [Report](../auth/P4_REPORT.md) and hosted JSON record fresh SDK/Auth, HTMX and PostgreSQL concurrency checks. Credential revocation remains false; forgotten-password email recovery and production confirmation policy remain separate work. |
| P5a/P5b | Complete for the linked development target | [Verification](../data/P5_VERIFICATION.md) and [hosted result](../data/P5_HOSTED_RESULTS.json) record 65 passing shared-pooler checks, pooler_verified=true, A/B/A identity/private-row isolation, transaction cleanup, rollback/recovery, client reuse and cleanup_ok=true. Three accounts were created/deleted. Latest recorded local suite: 95 passed, Django check, focused mypy/Ruff and diff check. |

The P1–P5 test counts above are prior execution evidence, not reruns in the original review. The JSON/manifest/source consistency checks were current read-only checks at that time. No independent fresh production/provider/security completion claim is made.

## P6 code review

- config/urls.py currently owns health, accounts and speech/AI APIs. No legacy fallback exists.
- templates/base.html is still a foundation token fixture. Account templates have a separate inline-styled base with auth-main and HTMX history protections.
- Standalone Tailwind 3.4.17 and its SHA-256 are pinned. Input is assets/tailwind.input.css; current content scanning covers only shared templates and must include app-local templates for P6.
- Header/Footer and application layout sources are available in their original folders. Existing public shell branding/navigation differs in detail from some historical references; compare current source and document differences.
- A fallback page needs working legacy assets. Vite development source/HMR endpoints cannot justify broad source-file forwarding; the brief prefers a compiled scratch build and exact asset inventory.
- Existing Django Auth URLs have trailing slashes, whereas manifest paths do not. P6 must handle ownership/slash aliases explicitly and keep all four manifest Auth paths out of fallback. Reset recovery remains unavailable.
- The eligible initial page fallback set is 21 paths (13 public + eight application) if the manifest is unchanged. Django login does not establish a legacy SPA session.

The older handoff retained a completed P5 runbook and a now-stale literal-login note. They are marked historical; current pooler evidence and the prepared P6 brief take precedence.

## Prepared scope

The [archived P6 prompt](P6_IMPLEMENTATION_PROMPT.md) covers shared base/public/app shells, accessible fragments, token/icon/static integration, exact manifest/method ownership, separate asset routing, cookie/header/redirect/loop boundaries, browser evidence and reversible ownership. Root [prompt.md](../../prompt.md) now prepares P7 W1; see the subsequent [P6 review](P6_REVIEW.md) for current findings.

The completed [P5 closure prompt](../data/P5_CLOSURE_PROMPT.md) is archived. At the time of this review, prompt preparation did not authorize or implement P6; the later implementation and its acceptance evidence are recorded in the status addendum above. Product page waves, media bridge, deployment and legacy removal remain later tasks.
