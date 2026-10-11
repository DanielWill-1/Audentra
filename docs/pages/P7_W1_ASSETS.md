# P7 W1 assets and provenance

**Date:** 2026-10-11

## Page bodies and shared shell

Ten static page bodies were copied from the current React-rendered DOM captures into `migration/django/apps/pages/templates/pages/`: `terms.html`, `privacy.html`, `open.html`, `about.html`, `security.html`, `pricing.html`, `industries.html`, `features.html`, `contact.html` and `status.html`. Source screenshots and HTML are retained under [evidence/w1/legacy](evidence/w1/legacy/).

`help-center.html` uses the captured page as its content/data reference. Its six sample articles and category counts are local Python constants in `apps/pages/views.py`; Django filters titles case-insensitively and validates categories on ordinary GET requests. It adds no database or article API. The page templates extend the P6 public shell; the shared header/footer, compiled font and shell behavior remain owned by P6.

## CSS, scripts and icons

- `static/css/app.css` is generated locally from `assets/tailwind.input.css` using the pinned Tailwind standalone 3.4.17 executable. The SHA-256 verified by `scripts/build_static.ps1` is `67f1c5e3f5a03406a7bf5badf5ada09b79f3ae78ec43450c15f7e983068da346`. The app-local Tailwind config adds only tokens needed by W1, including Hanken headline sizes and color aliases.
- `static/js/pages.js` handles the Privacy PGP-key copy feedback. Success is announced only after the clipboard write succeeds; failure gives a recovery message and feedback clears after its short display period. The shared shell continues to use P6's `static/js/shell.js`.
- `static/icons/sprite.svg` provides local symbols used by the Help Center. Decorative symbols are hidden from assistive technology. The Lucide path provenance and ISC license are retained in the sprite comment and adjacent [LICENSE.txt](../../migration/django/static/icons/LICENSE.txt); the source dependency is `lucide-react` 0.344.0 as locked in `package-lock.json`.
- The React reference page body computed `ui-sans-serif/system-ui`; Django uses the P6 Hanken Grotesk stack. The fonts and CSS are served locally; W1 introduces no remote font or icon request.

## Separately preserved compiled fallback

W1 did not replace or rebuild the P6 compiled fallback reference. Its reviewed asset inventory remains in [p6_legacy_assets.json](../../migration/django/config/p6_legacy_assets.json): document SHA-256 `dfd4b1a1e65069db79594e458affbdf704a7edba5fd2f82df0fb0085f0851a73`, JavaScript `/assets/index-Dmvoeb2c.js` SHA-256 `6bb4edd5c3b86474cec4953bcb782bb5f078e699c4861e9c7a6084dee4a91a42`, and CSS `/assets/index-CFJQDHLM.css` SHA-256 `418f4c202acfe1d8d58df08b4500a86d12975c14e18486dc600f8d381fc7f488`. The actual `/features` browser rollback loaded those exact reviewed JS/CSS assets through the loopback bridge; evidence is in [rollback-results.json](evidence/w1/django/rollback-results.json).

This compiled fallback is a separate source from the current React/Vite development capture. P6's fresh Vite production-build temporary-cleanup limitation remains recorded in the P6 report; W1 does not claim to have produced a new legacy build.

## Browser evidence

The current-source captures are in [evidence/w1/legacy](evidence/w1/legacy/). Django route and interaction captures are in [evidence/w1/django](evidence/w1/django/). Full check results and the browser environment distinction are recorded in [P7_W1_VERIFICATION.md](P7_W1_VERIFICATION.md).
