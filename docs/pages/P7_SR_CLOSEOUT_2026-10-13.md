# P7 review findings closeout — 2026-10-13

**Status:** SR-1 through SR-4 are closed. This report supersedes the open-findings status in the [independent session review](P7_P8_SESSION_REVIEW_2026-10-13.md) and its 01:03 handoff. P7 is accepted within the documented P1/P4/P5 development boundaries. P8 deterministic evidence remains valid; physical-device and live-provider checks stay in P9.

**Baseline:** HEAD `4e3e5c7e0a3bc383cea5d8b6b4d2ce18693469a6` plus the preserved dirty working tree. No existing changes or evidence were discarded. The manifest remains 25 routes with SHA-256 `ada8836ff8ba323888f1b99d42e7d720b66823c3975e008af104789d3923c9b7`.

The comparison source is the exact capture run [`p7-sr-review-source-20261013a`](evidence/w3/p7-sr-review-source-20261013a/legacy/capture-results.json). Its source worktree digest is `2f50c0fa03f6215104e5b1267bc9061447b7c851643328a4a0ec5a74ced68b1c` across 71 files. Each application result records that run ID, source HTML digests, and the consumed source manifest.

## SR-1: source comparison enforcement

The W3–W7 browser gate now checks source sections and their order, headings, copy, fields, field types and labels, controls, and fixed local destinations against route-specific reviewed mappings. It rejects missing required features at the page comparison boundary. It also verifies that each consumed HTML capture matches the recorded source digest and that the source tree still matches the captured provenance.

The final source-contract runs passed 24 desktop/mobile captures and 21 interactions:

| Wave | Evidence run | Captures | Interactions | Result |
|---|---|---:|---:|---|
| W3 Auth | [`p7-sr1-w3-visual-final2-20261013`](evidence/w3/p7-sr1-w3-visual-final2-20261013/django/browser-results.json) | 8 | 6 | All eight route/viewport contracts passed. |
| W4 Dashboard | [`p7-sr1-w4-acceptance-20261013`](evidence/w4/p7-sr1-w4-acceptance-20261013/django/browser-results.json) | 2 | 4 | Contracts and drawer, keyboard, Escape, and focus checks passed. |
| W5 Templates | [`p7-sr1-w5-acceptance-20261013`](evidence/w5/p7-sr1-w5-acceptance-20261013/django/browser-results.json) | 2 | 2 | Contracts and synthetic builder, CRUD, export, and private-file journeys passed. Browser Storage used an in-memory adapter; hosted route proof remains separately identified. |
| W6 Scheduler/settings | [`p7-sr1-w6-acceptance-20261013`](evidence/w6/p7-sr1-w6-acceptance-20261013/django/browser-results.json) | 6 | 5 | Contracts, calendar and management actions, settings import/export, invalid-value rejection, storage-error feedback, and mobile tabs passed. |
| W7 Voice/filled/activity | [`p7-sr1-w7-visual-final-20261013`](evidence/w7/p7-sr1-w7-visual-final-20261013/django/browser-results.json) | 6 | 4 | Contracts and template chooser, filled delete/navigation, activity filtering, safe rendering, and account-key isolation passed. |

Negative controls used data extracted from the captured routes and the same comparator. The Dashboard mutation rejected removed source/target section, control, destination, and required copy. The Settings mutation rejected removed source/target section, control, destination, expected field, and copy. Results are included in the W4 and W6 browser JSON above.

## SR-2: source layout and responsive review

Paired source/Django captures were reviewed at 1440×900 and 390×844. The review found and corrected two real layout differences: W3 signup now uses the centered source shell and side-by-side name fields, and the W7 template chooser now centers its heading and source-shaped template card. The P4-unavailable recovery/reset pages retain the same centered branded shell while truthfully explaining the unavailable flow. No quantitative pixel score or unapproved tolerance was used.

The derived [desktop comparison sheets](evidence/p7-sr2-visual-review-20261013/w3-w5-desktop.png) and [mobile comparison sheets](evidence/p7-sr2-visual-review-20261013/w3-w5-mobile.png) cover W3–W5. The [W6–W7 desktop sheet](evidence/p7-sr2-visual-review-20261013/w6-w7-desktop.png) and [mobile sheet](evidence/p7-sr2-visual-review-20261013/w6-w7-mobile.png) cover the remaining application routes. Original source and Django screenshots remain unchanged beside their browser results.

## SR-3: settings validation

The actual settings page rejects a zero-minute duration on save and malformed working hours such as `25:99` on import, preserves the last valid stored values, and reports localStorage read/write failures without a success message. The focused real-page regression is retained in [`p7-sr3-green2-20261013`](evidence/w6/p7-sr3-green2-20261013/django/browser-results.json); the final field/label/source contract and full settings journeys passed again in the W6 run above.

## SR-4: timezone boundary comparison

The final frozen-clock source/Django run passed six cases: UTC midnight, positive and negative offsets, both sides of the spring DST transition, and the fall DST transition. Results and paired screenshots are in [`p7-sr4-timezone-acceptance3-20261013`](evidence/w6/p7-sr4-timezone-acceptance3-20261013/timezone-comparison-results.json). In each case the Django date selection and stored date-only event follow P5 UTC semantics. The evidence records the source’s browser-local “Today” behavior: for example, at `2026-10-12T20:30Z` in Asia/Kolkata the source highlights October 13 while Django/P5 selects October 12; at `2026-10-13T00:30Z` in Los Angeles the source labels local October 12 while Django/P5 selects October 13. The P5 boundary was preserved rather than silently changed.

## Aggregate verification and limits

Fresh verification after the repairs passed 167 isolated pytest tests, Django’s system check, mypy across 93 files, Ruff across `apps config tests scripts`, the pinned Tailwind 3.4.17 build and token checks, `collectstatic`, and Node syntax checks for 20 migration scripts/static JavaScript files. `git diff --check` passed before the final documentation updates and is rerun with those updates.

The closeout browser fixtures are deterministic and synthetic. They do not prove live provider behavior, physical microphone/device behavior, or hosted persistence. Earlier authorized hosted W5/W6 results remain valid only for their recorded route and cleanup boundaries; this closeout made no hosted writes. Deployment, soak, commit/push, and legacy retirement remain outside P7.

P9 has now been authorized to start. Its 25-route acceptance matrix must be created before P9 execution, then local/read-only route reconciliation can proceed. P9 is in progress, not complete; hosted schema/data, physical-device, and live-provider gates remain outstanding and will be reported separately.
