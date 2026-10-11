# P6 asset inventory

**Status:** Implemented; inventory is enforced by byte length, SHA-256 and MIME checks.  
**Exact runtime inventory:** [p6_legacy_assets.json](../../migration/django/config/p6_legacy_assets.json)  
**Route owners and source-manifest lock:** [P6_ROUTE_OWNERSHIP.json](P6_ROUTE_OWNERSHIP.json)

## Legacy document assets

The fallback document is the existing preserved `dist/client` Vite production output, copied into ignored `migration/django/.state/p6-legacy-build/`. The working `dist/client` tree was not overwritten. Django and the loopback browser fixture serve only these four exact paths; each is checked against the runtime inventory before returning bytes.

| Path | Type | Bytes | SHA-256 |
|---|---|---:|---|
| `/assets/index-Dmvoeb2c.js` | JavaScript | 744,017 | `6bb4edd5c3b86474cec4953bcb782bb5f078e699c4861e9c7a6084dee4a91a42` |
| `/assets/index-CFJQDHLM.css` | CSS | 51,985 | `418f4c202acfe1d8d58df08b4500a86d12975c14e18486dc600f8d381fc7f488` |
| `/favicon.svg` | SVG | 431 | `e5786d9cc465947d7ef5458efdcc7f6a77adf2a7f5f79fe31f8dee4824fb32ea` |
| `/image.png` | PNG | 19,260 | `4e22e1a1042caf5213bb157d8b3e32c19ccad269a7f842012fb8529d02591f92` |

The HTML document is 1,038 bytes with SHA-256 `dfd4b1a1e65069db79594e458affbdf704a7edba5fd2f82df0fb0085f0851a73`. Page forwarding verifies its digest and size. No route exposes `/src/`, `node_modules`, source maps, arbitrary files, filesystem paths or Vite HMR/WebSocket endpoints. A changed build must receive a new reviewed inventory before it can be served.

The source inventory records the exact filenames, digest and type. Query strings are rejected for assets. Unlisted assets return a local 404, even when their extension resembles an allowed file.

## Django shell assets

| Asset | Source / license | Use |
|---|---|---|
| `static/css/app.css` | Built with pinned Tailwind CSS 3.4.17 standalone binary; SHA-256 checked by `scripts/check_static.py` | Shared shells and fragments |
| `static/js/shell.js` | Project code | Native dialog, focus management and mobile navigation; idempotent binding survives HTMX swaps |
| `static/icons/sprite.svg` | Lucide icon paths; provenance and ISC license in `static/icons/LICENSE.lucide` | Local external-use SVG sprite |
| Hanken Grotesk and JetBrains Mono | Google Fonts CSS URL declared in `templates/base.html`; browser fetched from Google Fonts when online | Headline/body and monospace faces, with CSS fallback stacks |
| `templates/fragments/*` | Project templates | Header, footer, app navigation, modal, messages, icon and pager markup |

Google Fonts are referenced as external font stylesheets and are not served through the legacy asset bridge. The shell has local CSS fallback families. Page-only legacy assets remain part of the P7 route migration inventory.

## Build freshness limitation

A fresh Vite build transformed the source but failed during esbuild temporary-directory cleanup with an access-denied error in this Windows environment. The P6 browser proof therefore uses the pre-existing, preserved `dist/client` build copied to ignored scratch storage. Its exact HTML and asset bytes are inventory-checked and were loaded by the actual browser through Django. This proves the controlled serving path for that preserved bundle; it does not certify a fresh Vite rebuild from current source. Rebuild and refresh this inventory during P7 before treating these bundle hashes as current.
