# P7 W1 report

**Date:** 2026-10-11  
**Scope:** W1 only, following the [executed W1 brief](P7_W1_IMPLEMENTATION_PROMPT.md), now archived. W2-W7, P8 and deployment were not started.

## Result

W1 migrated these eleven public pages to Django templates and views: `/terms`, `/privacy`, `/open`, `/about`, `/security`, `/pricing`, `/industries`, `/features`, `/contact`, `/status` and `/help-center`. The exact route manifest and its digest are unchanged. The runtime and this report's [route ownership record](P7_W1_ROUTE_OWNERSHIP.json) agree on 11 Django page owners and 10 remaining legacy page fallbacks. The three Django Auth routes remain excluded from fallback; `/reset-password` remains a local 404.

The public pages render with `DEBUG=False`, preview off, legacy fallback off and no rollback routes. They use the P6 public shell. Ten page bodies were materialized from the current React-rendered source capture; Help Center is a local Django implementation of the same reviewed sample data and content with progressive GET filtering. No page adds a database, provider, monitoring, checkout, contact-submission, or article API.

## Route content and behavior

| Route | Content and behavior carried forward | W1 difference / boundary |
|---|---|---|
| `/terms` | Full terms, section order, dates, legal links | Shared P6 public shell; body text and local destinations match the React capture |
| `/privacy` | Notice, retention table, TOC anchors, exact displayed PGP fingerprint | Clipboard success appears only after write succeeds; denial gives a recovery message; transient feedback clears |
| `/open` | Attribution, links and complete Apache 2.0 license text | Full captured license text retained; shared P6 public shell |
| `/about` | Source sections, project links and contact destination | Body text and local destinations match the React capture |
| `/security` | Source claims, cards and sections | Claims are preserved as copy; W1 does not implement the described infrastructure |
| `/pricing` | Plans, values, FAQ and CTA copy | Inactive source CTAs remain inactive; no checkout or sales backend |
| `/industries` | Industry cards, features, use cases and CTA copy | Inactive source CTA remains inactive |
| `/features` | Product sections, illustrative workflow and source destinations | Illustrative preview stays illustrative; source links are retained |
| `/contact` | Contact details, mail and telephone destinations, hours and FAQ | No new contact form or delivery service |
| `/status` | Sample services, incidents, label and subscription controls | Static sample status remains static; no monitor or subscription backend |
| `/help-center` | Six sample articles, categories/counts, updates, quick actions and no-match state | Search/category are normal GET forms; a visible `Search` submit button and accessible input label were added; inactive article, vote and quick-action controls remain inactive |

For all eleven routes, normalized page text matched the current React capture at both viewports except for the single visible `Search` submit label on Help Center. No source words were missing. All captured local link destinations were retained. The source React page body uses the `ui-sans-serif/system-ui` stack; the Django pages use the P6 Hanken Grotesk stack. Numeric pixel thresholds remain unapproved, so this report makes no pixel-parity score claim.

The current React Help Center baseline overflowed by 155 pixels at 390px. Django stacks the category panel and results on mobile and has no horizontal overflow at either target viewport. Source CTAs and status subscriptions still do not claim success. The shared public header remains anonymous on these routes; signed-in public-header integration is a W3 follow-up.

## Source and build provenance

Before cutover, `migration/django/scripts/p7_capture_react.cjs` captured the current `src/pages/*.tsx` output from the loopback Vite development server at 1440x900 and 390x844. It saved the rendered page HTML, screenshots and source-page metrics under [the legacy evidence folder](evidence/w1/legacy/). This is current-source evidence and is separate from P6's preserved compiled bundle.

The ten static page bodies were copied from those rendered DOM captures into `migration/django/apps/pages/templates/pages/`. Help Center uses the same capture as its copy/data reference and uses server-side title-only, case-insensitive filtering combined with a validated category. No HTMX is needed for this small anonymous page. The W1-specific Lucide icons are local SVG symbols; no React runtime or remote icon/font request is added.

The pinned standalone Tailwind build is 3.4.17, SHA-256 `67f1c5e3f5a03406a7bf5badf5ada09b79f3ae78ec43450c15f7e983068da346`. The source design tokens needed by W1, including Hanken headline sizes and color aliases, were added to the Django Tailwind config. The earlier P6 fresh Vite compile limitation remains documented: esbuild temporary cleanup failed. That does not affect current-source captures or this separately verified old compiled fallback.

## Evidence

- [Current React captures and metrics](evidence/w1/legacy/capture-results.json)
- [Django browser captures, route/text/link/font metrics and interactions](evidence/w1/django/browser-results.json)
- [Compiled `/features` rollback browser proof](evidence/w1/django/rollback-results.json)
- [W1 verification record](P7_W1_VERIFICATION.md)
- [W1 assets and provenance](P7_W1_ASSETS.md)
- [Runtime-matched ownership inventory](P7_W1_ROUTE_OWNERSHIP.json)

All eleven Django pages were captured and visually inspected at 1440x900 and 390x844. Privacy clipboard success/denial and keyboard TOC navigation, plus Help Center search/category/no-match/reset states, have separate screenshots. The legacy compiled `/features` route was also captured at both viewports during the explicit rollback run.

No W2 route, Auth flow, application page, P8 media flow, deployment or legacy cleanup was included.

## 2026-10-12 execution update

The W1 review gaps are closed; see the dated dispositions in [P7_W1_REVIEW.md](P7_W1_REVIEW.md). W1 browser regressions passed again with 22 captures/six interactions and no overflow or unexpected browser/network errors. Current-source references remain the preserved original captures, rather than fresh source recaptures. The rest of P7/P8 is recorded in the [aggregate report](P7_REPORT.md) and [verification](P7_VERIFICATION.md); this dated addendum supersedes the historical “not started” statement above.

The later [W1 review](P7_W1_REVIEW.md) preserves this delivered result and assigns four regression/evidence corrections to the full P7/P8 master brief. No later-wave application code changed during that review.

## 2026-10-13 combined P7/P8 closeout

Final closeout disposition: PASS. The current W1 run recorded 22 route/page captures and 6 exercised interactions using source/page regression. Desktop 1440x900 and mobile 390x844 checks reported no overflow or unexpected browser errors. Evidence: docs/pages/evidence/w1/closeout-20261012/ The complete combined results and boundaries are in docs/pages/P7_P8_CLOSURE_REPORT.md and docs/pages/P7_P8_CLOSURE_MATRIX.md.
