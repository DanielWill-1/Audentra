# P7 aggregate verification

**Review correction — 2026-10-12 02:03:54 IST:** These passing results retain their stated boundaries. They do not establish every required flow or P8 resource lifecycle. Fresh review passed 145 tests/Django check but reproduced media bugs; see [P7 review](P7_REVIEW_2026-10-12.md) and [P8 review](../services/P8_REVIEW_2026-10-12.md).

**Run date:** 2026-10-12. **Disposition:** all seven P7 waves and the P8 prerequisite passed within the development/testing scope described by the [master brief](../../prompt.md).

## Local checks

| Check | Result |
|---|---|
| Django regression suite | **145 passed** with `DJANGO_SETTINGS_MODULE=config.settings.test`; run with `-p no:cacheprovider` |
| Django system check | Passed; no issues |
| mypy | Passed across 92 files (`apps config tests`) |
| Ruff | Passed for `apps config tests scripts` |
| JavaScript syntax | Passed for the P6/P7/P8 browser scripts and suite runner |
| Pinned Tailwind build | Passed with Tailwind CSS 3.4.17; pinned binary digest verified and design-token check passed |
| `collectstatic --noinput` | Passed; 0 copied, 15 unchanged |
| `git diff --check` | Passed; Git emitted only its existing LF-to-CRLF working-copy notices |

The test suite includes the W1 review regression gates, W5 share/review action-ID coverage, the W7 synthetic multipart-to-filled-form route flow, and unreadable-template denial before extraction/save. The W7 integrated test stubs provider/service boundaries and writes no hosted record.

## Browser evidence

The primary seven-wave evidence set contains **50 desktop/mobile page captures and 14 interactions** at 1440×900 and 390×844. All normal Django pages returned HTTP 200 with no horizontal overflow, React root/bootstrap, unexpected console errors, or failed requests. `/reset-password` returned its intentional local HTTP 404 at both sizes; its two expected browser 404 diagnostics are explicitly classified by the runner.

| Wave | Captures | Interactions | Evidence |
|---|---:|---:|---|
| W1 | 22 | 6 | [W1 Django evidence](evidence/w1/post-wave-review-20261012/django/) and retained source references |
| W2 | 4 | 3 | [W2 Django evidence](evidence/w2/post-wave-review-20261012/django/) |
| W3 | 8 | 0 | [W3 Django evidence](evidence/w3/post-wave-review-20261012/django/) |
| W4 | 2 | 2 | [W4 Django evidence](evidence/w4/post-wave-review-20261012/django/) |
| W5 | 2 | 1 | [W5 Django evidence](evidence/w5/post-wave-review-20261012/django/) |
| W6 | 6 | 2 | [Final W6 browser evidence](evidence/w6/final-review-20261012/django/) |
| W7 | 6 | 0 | [W7 Django evidence](evidence/w7/post-wave-review-20261012/django/) |

The W6 final run checks the bytes in the downloaded settings JSON, not only the filename or success message. It uses retained current-source markup from the preceding W6 reference capture and writes a separate final evidence folder. Existing evidence remains preserved.

W1 now gates normalized source text and destinations and has a negative control. Its 10→11→10 stage counts come from the archived W1 route snapshot; the final runtime's selected public `/features` and protected `/dashboard` rollback tests separately measure 0→1→0 and restore each Django owner. Encoded rollback input and POST are rejected through the active resolved rollback callback with zero upstream calls. The public compiled fallback has preserved desktop/mobile screenshots; the protected rollback is URLResolver/MockTransport test evidence rather than a browser capture.

## Hosted data and route verification

The P5 shared-pooler verification remains intact and passed 65 hosted Auth/RLS/Storage/template/share/review/scheduler/filled-record checks with exact cleanup. The P7 hosted route probe then used three new synthetic accounts through real Django signup/session and the shared transaction pooler. It verified the W5 owner/viewer/editor/admin/unrelated boundaries, editor persistence, share revocation, and W6 schedule route creation, management read, JSON export contents, and exact delete. It sent zero emails and reports cleanup success for the generated shares, template, schedule, accounts, and sessions: [sanitized hosted results](evidence/w5/post-wave-review-20261012/hosted-route-results.json).

The hosted P7 route run did not upload/download a file through the W5 route. P5's hosted service/RLS evidence verifies private-file access rules and exact object cleanup separately. No production data was changed by the P7 probe.

## P8 media boundary

All **12 deterministic fake-media browser checks** passed. They exercise the same-origin multipart contract, CSRF and request marker headers, absence of an Authorization bearer header, accepted MIME selection, preview/playback, empty/oversized/permission/unsupported states, provider failure, and cleanup of tracks/recorders/object URLs. See [P8 verification](../services/P8_VERIFICATION.md) and [machine-readable results](../services/evidence/p8/media-results.json). These checks do not establish live speech-provider or physical-microphone behavior.

## Route ownership and scope limits

The runtime registry and Django URL resolver cover all 25 manifest paths; effective legacy fallback is zero. Detailed route names/views and the owner-count progression are in [P7_ROUTE_OWNERSHIP.json](P7_ROUTE_OWNERSHIP.json). The manifest hash is `ada8836ff8ba323888f1b99d42e7d720b66823c3975e008af104789d3923c9b7`.

Source/Django copy, local-only states, Auth limits, synthetic data, date/time behavior, and provider/device boundaries are itemized in [P7_DIFFERENCES.md](P7_DIFFERENCES.md). The earlier P6 fresh Vite production-build temporary-cleanup limitation remains historical; current source references came from the development server, and the approved compiled legacy rollback was tested independently. No quantitative pixel score was claimed.

P9 parity/release acceptance, live provider/device checks, and the P7 route-level Storage transfer remain future evidence gates. P10 deployment/soak and P11 legacy retirement were not performed or authorized by this P7/P8 brief.
