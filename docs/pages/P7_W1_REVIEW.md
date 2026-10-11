# P7 W1 review and full-scope prompt handoff

**Reviewed:** 2026-10-11
**Snapshot:** HEAD `acba9564752f1c121b81d17f59fca4d3f2b9b0f8` plus the existing uncommitted P5/P6/P7 working tree.
**Scope:** Review completed P7 W1 and prepare one master brief for the remaining P7 waves and the required P8 media bridge. No application code was changed and no later wave was executed during this review. W1 belongs to P7; P6 delivered its shared shells and controlled fallback.

## Findings

### W1-R1 — medium: browser content comparisons do not fail the check

[`scripts/p7_browser_check.cjs`](../../migration/django/scripts/p7_browser_check.cjs), lines 134–157, records text and link differences but never asserts the recorded content comparisons. A page can lose copy or a destination while retaining its heading, assets and layout, and the runner can still exit successfully. This matters when the runner becomes the gate for later page migrations.

Require no missing source text or destinations and explicitly allow only reviewed differences, such as Help Center's added `Search` label. Check normalized content/order as appropriate rather than accepting an arbitrary set of matching words. Include a negative control proving an omitted section or changed destination makes the gate fail.

The existing results contain zero missing text tokens and zero missing local links. This finding concerns regression enforcement; it does not establish missing content in the present W1 pages.

### W1-R2 — low: bytes header key makes the unit assertion ineffective

[`tests/test_p7_pages.py`](../../migration/django/tests/test_p7_pages.py), line 119, checks `b"X-Legacy-Proxy"` against Django's string-keyed response headers. A review probe set the header to `1`: the string-key lookup was true while the bytes-key lookup was false. The assertion therefore succeeds even when the proxy marker is present.

Use a string key and add a small positive control. The existing browser runner independently checks the actual lowercase HTTP header correctly, so the current page-owner evidence has a separate valid check.

### W1-R3 — low: invalid rollback probes run after rollback is restored

In [`tests/test_p7_pages.py`](../../migration/django/tests/test_p7_pages.py), the rollback override begins at line 233; the encoded-path and POST probes at lines 247–263 run after that override exits. They check the ordinary Django page branch instead of an active rollback branch. The documentation overstates what these particular assertions prove.

Keep the negative probes inside the active rollback settings and exercise the resolved rollback URL callback, with an upstream-call counter. A fresh independent probe during this review resolved `/features` as `legacy-features` with rollback active: encoded input returned 400, POST returned 405, and upstream calls remained zero. No runtime bypass was reproduced.

### W1-R4 — low: browser rollback counts are expected constants

[`scripts/p7_browser_check.cjs`](../../migration/django/scripts/p7_browser_check.cjs), line 259, writes `10 → 11 → 10` as constants. That browser run observes the selected compiled route and asset markers; it does not itself measure the before/after ownership counts or restore server configuration.

Label these values as expected counts or collect observed counts from validated runtime ownership before rollback, during rollback and after restoration. Keep the separate ownership-unit proof clearly attributed. The existing unit test does verify pattern counts 10/11/10; the historical browser JSON must not be treated as an independent measured count/restore test.

## Verification performed in this review

- Fresh full isolated suite: **127 passed in 4.40s**; Django system check: **no issues**. The previous W1 source-only run with the compiled bundle absent remains separately recorded in [W1 verification](P7_W1_VERIFICATION.md).
- Independent synthetic probes reproduced W1-R2 and verified active rollback rejection of encoded/POST requests without upstream access.
- Inspected the stored results for all 22 Django page captures: 20 exact normalized-text matches, two reviewed Help Center `Search` differences, zero missing text tokens/local destinations, zero horizontal overflows, zero console errors and zero failed requests.
- Visually inspected Django Features desktop/mobile, Help Center mobile and Privacy mobile, plus the current React Features/Help Center mobile references. Help Center's mobile stacking fixes the documented source overflow; the Hanken/system-font difference remains recorded.
- Inspected stored compiled `/features` rollback results for both viewports. Browsers and hosted services were not rerun in this review; those files remain the prior W1 execution evidence.

Sanitized observations are in [review-results.json](evidence/w1/review-results.json). No live provider, Auth, database or Storage operation was performed during this review.

## Disposition and next scope

W1's functional migration is delivered: eleven real public page bodies, Help Center filtering, Privacy clipboard feedback, exact ownership and controlled fallback. No blocking runtime failure was reproduced. W1-R1 through W1-R4 remain test/evidence corrections assigned to the master brief's opening step; they do not reopen the closed P6 portable-fixture and malformed-redirect findings.

The executed W1 brief is preserved as [P7_W1_IMPLEMENTATION_PROMPT.md](P7_W1_IMPLEMENTATION_PROMPT.md). Root [prompt.md](../../prompt.md) now covers one continuous execution: W1 regression hardening, W2, W3, W4, W5, W6, P8, then W7. There are seven P7 waves plus a separate P8 work package, rather than an invented eighth P7 wave. W1 is already implemented; the remaining six waves plus P8 are future work.

The master brief supersedes routine separate-wave brief/approval requirements once the owner instructs its execution. Per-wave verification remains required. It carries forward the P4 development-only Auth scope and P5 decisions: local browser preferences/demos, UUID-based private sharing, entered date/time plus UTC-derived boundaries, unavailable email recovery and no new activity/team/notification backend. This review/preparation request does not execute those remaining waves.

## Dated disposition — 2026-10-12

The owner authorized the full P7/P8 brief. W1-R1 through W1-R4 are now closed:

- **R1:** W1 source content and local destinations are enforced by the browser comparator, with a negative control for missing content/destinations. Help Center's added accessible Search label is the reviewed difference.
- **R2:** The proxy marker check uses Django's string-keyed response headers and has a positive control that fails when the marker is present.
- **R3:** Encoded-path and POST denials run through the resolved rollback callback while rollback is active; the upstream request count stays zero.
- **R4:** The W1 10→11→10 count is measured from the archived W1 ownership inventory by `test_w1_snapshot_rollback_counts_are_measured_from_its_route_inventory`. The completed P7 runtime separately measures 0→1→0 for selected public `/features` and protected `/dashboard` rollbacks in `test_route_rollback_changes_actual_owner_and_restores_fallback_count`, including Django owner restoration and upstream dispatch.

The fresh W1 browser rerun on 2026-10-12 passed 22 desktop/mobile captures and six interactions. It reused the retained current-source HTML/screenshots; it did not recapture the React reference in this run. The prior compiled `/features` rollback browser screenshots remain preserved. The new protected `/dashboard` rollback is covered by the resolved URL-pattern/callback test with MockTransport, not by a separate browser screenshot. Full current verification is in [P7_VERIFICATION.md](P7_VERIFICATION.md).
