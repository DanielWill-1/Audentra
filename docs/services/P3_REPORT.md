# P3 implementation report

**Date:** 2026-10-10
**Status:** Bounded P3 code findings corrected during P4; live-provider and full legacy-vs-Django HTTP parity evidence remain open.
**Baseline:** P2 complete/reviewed; see [P2_REVIEW.md](../foundation/P2_REVIEW.md).
**Provider decision:** The owner selected Groq `openai/gpt-oss-120b`; current availability is listed in [Groq's supported models](https://console.groq.com/docs/models). The legacy `llama3-70b-8192` remains only in source-derived historical fixtures.

**Review and correction record:** [P3_REVIEW.md](P3_REVIEW.md) records the original retry, SDK status-mapping and UTF-16 findings and their bounded corrections. Current regression results are in [P4_REPORT.md](../auth/P4_REPORT.md). The [P3 brief](P3_IMPLEMENTATION_PROMPT.md) is archived. Initial results below remain historical evidence; they do not establish live-provider parity.

## Implemented so far

- Locked official Google Speech and Text-to-Speech Python clients plus httpx under migration/django/.
- Added P3 local request boundary and optional bearer/session-principal helpers.
- Added mock/Google STT and mock/Google TTS services; explicit data URL/multipart validation; mounted-route response/config behavior and JSON/TTS endpoints.
- Added exact extraction prompt builder, mock/Groq client, parsing/fallback behavior, extraction endpoint and pure field matcher.
- Added source-derived synthetic fixtures and focused tests.
- Added a React opt-in transport switch. Default remains the legacy Express speech route and P0 Groq mock. No page, Express source or browser secret edit.
- P2 test settings continue using in-memory SQLite; no hosted DB operation occurred in P3.

## Checks

| Check | Result |
|---|---|
| Ruff (`scripts/run_ruff.ps1 check apps config tests`) | Passed |
| Lock check (`uv lock --check --offline`) | Passed; 48 packages resolved |
| Pytest (`config.settings.test`) | 44 passed in 0.97s; in-memory SQLite; no hosted DB writes |
| mypy (`config apps tests`) | Passed, 43 source files |
| Django framework check | Passed |
| Django deploy check | Passed with Django security warning `security.W004` because local-only P3 does not configure HSTS |
| Production enabled-service guard | Passed; production settings reject `P3_SERVICES_ENABLED=true` |
| Tailwind/static regression | Passed; pinned Tailwind 3.4.17 digest and token checks passed |
| Source-reference fixture generator | Passed; `tests/reference_contracts.py` generated deterministic source-derived STT/TTS fixtures used by contract tests; no Express process differential was claimed |
| React transport/build | Full Vite builds and compiled-service harness passed with the switch off and on in ignored scratch output. Playwright browser runtime passed both modes with synthetic fetch responses. Secret scans passed and legacy `dist/client` hashes stayed unchanged. Actual browser-over-HTTP attempt was blocked by runner isolation; see final evidence. |
| Root TypeScript check (`npx tsc --noEmit`) | Passed for server/**/*.ts only; not frontend coverage; no legacy build output written |
| Live Google STT/TTS | Not run; private credential file and ADC are not configured |
| Live Groq extraction | Model selected and configured; no private Django API key is configured, so no live request was made |
| Supabase role health | Not repeated for P3; no DB configuration/grant changes |

P3 services are implemented and the initial mocked/local suite passes. The later review found untested contract defects, so implementation gates are not yet complete. At the initial implementation check, private Django Google/Groq credentials were absent; no live-provider result is claimed.

## Final evidence

- Historical Express sources remain in place. `src/services/ai.ts` is the only legacy application file changed. Django source/tests and P3 docs remain under their allowed paths.
- Mock/provider credentials were not read into output. The React build's client bundles were scanned for `gsk_` keys and PEM private-key markers; no matches were found.
- The optional React setting defaults off. The compiled transport harness intercepted and checked Express transcription/TTS URLs and P0 mock extraction when off; when on it checked Django transcription, TTS and extraction URLs, marker headers, payload keys, and optional browser TTS. Full Vite builds passed in both modes.
- Full Vite builds and transport artifacts used ignored scratch output, not `dist/client`; pre/post SHA-256 inventories found the existing legacy build output unchanged. JS/CSS scans found no Groq-key-shaped string or PEM private-key marker. `npm run build`'s broader legacy typecheck was not used as a P3 gate.
- `npx tsc --noEmit` passed independently; `npm run build` was not run because it writes to the preserved legacy `dist/client` path. Both scratch Vite builds emitted the app's existing large-chunk and stale Browserslist notices, without build failures.
- Playwright browser runtime checks passed with the actual compiled React service module and synthetic `fetch` replies in both modes. Separate browser-over-HTTP attempts timed out before reaching local Vite due to runner loopback isolation; no request reached a provider. Django endpoint security/contracts are separately covered by the isolated test client.
- No live Google STT/TTS or Groq call was made. The private Django environment has no Groq key, Google credential file or ADC environment configured. Root `.env` credentials were not reused. Groq model availability was checked against official docs; the live-provider parity gate remains open for the bounded smoke once server-only credentials are configured.
- No database health recheck was needed for service-only changes; no database schema, role, RLS, Auth, or hosted data operation occurred.
- Known local deploy warning: `security.W004` for unset HSTS. P3 binds to loopback and does not set transport policy for a deployed site.

### Commands and results

From `migration/django/` with `UV_CACHE_DIR=.uv-cache` and `UV_PROJECT_ENVIRONMENT=.venv-p2`:

```text
scripts/run_ruff.ps1 check apps config tests              passed
uv lock --check --offline                                passed (48 packages)
uv run --offline python -m pytest -q                     44 passed
uv run --offline python tests/reference_contracts.py      passed (source-derived fixture output)
uv run --offline python -m mypy config apps tests        passed (43 files)
uv run --offline python manage.py check                  passed
uv run --offline python manage.py check --deploy --settings=config.settings.prod
                                                           passed; security.W004 warning
DJANGO_SECRET_KEY=<temporary> P3_SERVICES_ENABLED=true uv run --offline python manage.py check --settings=config.settings.prod
                                                           rejected P3 services as expected
scripts/build_static.ps1                                 passed; Tailwind digest and token checks
```

The later review supersedes the initial mocked-contract completion claim: code corrections remain required. Actual browser-over-HTTP and live-provider comparisons remain explicitly unverified; the mock suite does not establish live parity.
