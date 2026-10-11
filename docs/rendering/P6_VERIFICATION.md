# P6 verification record

**Run date:** 2026-10-11  
**Scope:** Shared Django shells, modal/navigation behavior, exact manifest fallback and asset bridge.  
**Evidence images:** [P6 browser evidence](evidence/p6/)

**Review rerun, 2026-10-11:** 115 isolated tests passed in 5.27s; Django system check reported no issues. Browser/static/type/lint results below are the prior implementation run, not fresh reruns. [P6_REVIEW.md](P6_REVIEW.md) records the test-fixture dependency and reproduced malformed-redirect finding, both pending correction before W1 cutover.

## Automated checks

| Check | Result |
|---|---|
| Full isolated Django/Python suite | 115 passed (after route-manifest drift regression was added) |
| `manage.py check` | Passed; no issues |
| Focused mypy (`apps`, settings/URLs and P6 preview runners) | Passed; 64 source files |
| Focused Ruff (`apps config tests` plus P6 runners) | Passed |
| Pinned Tailwind 3.4.17 build and token verification | Passed; primary color, Hanken/JetBrains fonts, responsive spacing, nav selection, dialog and reduced-motion tokens present |
| `collectstatic --noinput` | Passed; shell assets collected |
| `git diff --check` | Passed after final documentation updates |

The fallback tests exercise exact public/application ownership, Auth exclusions, denied methods, slash aliases, raw and encoded paths, token callback query denial, forwarded-header stripping, conditional assets, body digest/size checks, gzip decoding and response length, redirects, self-target/loop prevention, timeouts, disabled mode and missing raw targets. The manifest digest test proves a changed route inventory fails closed.

## Browser checks

Playwright/Chromium `148.0.7778.96` checked the public and app shell fixtures at 1440×900 and 390×844, plus the real preserved React homepage and its allowlisted CSS, JavaScript and image assets at both sizes.

- Both Django shells rendered without horizontal overflow; mobile drawer opened and closed accessibly.
- Shared dialog initial focus, Tab containment, Escape, backdrop policy and focus restoration passed. Reduced-motion behavior was checked on mobile.
- The real React homepage was returned by Django with `X-Legacy-Proxy: 1`; all loaded remote bundle requests matched the reviewed asset inventory.
- Existing P4 Auth was left on Django. A deliberately invalid synthetic form submission exercised the HTMX error swap without contacting Supabase or creating an account.
- Captures: `public-desktop.png`, `public-mobile.png`, `app-desktop.png`, `app-mobile.png`, `app-mobile-drawer.png`, `legacy-home-desktop.png`, `legacy-home-mobile.png`, `auth-htmx-validation.png`; machine-readable checks are in `browser-results.json`.

## Scope and limitations

No hosted Auth, database, Storage or provider calls/writes occurred for P6. P1's accepted missing-reference exceptions, P3 live provider/device voice evidence and P4's separate recovery/production/credential follow-ups remain open. Product page bodies and authenticated legacy SPA states remain P7/P9 work. The fallback browser run used the preserved `dist/client` bundle because a fresh Vite build hit an esbuild temporary-cleanup access error; see [asset inventory](P6_ASSET_INVENTORY.md).
