# P9 asset inventory

**Status:** The route-to-asset inventory covers all 25 manifest paths. The [asset acceptance result](evidence/p9/p9-full-20261014-0723-utc/asset-attempt-04/P9_ASSET_RESULTS.json) records 20 local asset/license files, 14 Django static HTTP responses with matching SHA-256 digests, six representative source/Django page loads, and route-group dependencies. A default-state paired screenshot review is recorded in [P9_VISUAL_REVIEW.md](P9_VISUAL_REVIEW.md). Full route-by-route visual/icon content and interaction acceptance remains open in the [P9 acceptance matrix](P9_ACCEPTANCE_MATRIX.md); the inventory and screenshot review do not mark those rows accepted.

## Route asset map

| Route group | Paths | Source runtime | Django runtime |
|---|---|---|---|
| Public (13) | `/`, `/features`, `/industries`, `/security`, `/pricing`, `/about`, `/contact`, `/status`, `/help-center`, `/documentation`, `/terms`, `/privacy`, `/open` | Vite entry/CSS and route modules, `public/favicon.svg`, the shared Google Fonts stylesheet, and route icons rendered as inline SVG by `lucide-react` 0.344.0 | `favicon.svg`, shared remote font stylesheet, `css/app.css`, `js/shell.js`, `js/pages.js`, and `icons/sprite.svg` |
| Authentication (3) | `/login`, `/signup`, `/forgot-password` | Same Vite assets; source form icons are inline SVG | `favicon.svg`, the same remote font stylesheet, `vendor/htmx-2.0.8.min.js`, and `js/p7_auth_forms.js`; the form styles are inline in the shared Auth template |
| Application (8) | `/dashboard`, `/templates`, `/scheduler`, `/manage-schedules`, `/scheduler-settings`, `/filledtemplates`, `/AIVoiceAutoFill`, `/activitylog` | Same Vite assets and route/component modules | Shared `favicon.svg`, font stylesheet, `css/app.css`, `js/shell.js`, and `icons/sprite.svg`; route scripts are listed below |
| Intentional local 404 (1) | `/reset-password` | Source React route and its normal Vite assets | No Django page template or route asset; the expected target response is the explanatory local HTTP 404 |

Application page scripts:

| Route | Django script |
|---|---|
| `/dashboard` | `js/p7_dashboard.js` |
| `/templates` | `js/p7_templates.js` |
| `/scheduler` | `js/p7_scheduler.js` |
| `/manage-schedules` | `js/p7_scheduler.js` |
| `/scheduler-settings` | `js/p7_settings.js` |
| `/filledtemplates` | No route-specific script |
| `/AIVoiceAutoFill` | `js/p7_media.js`, `js/p7_voice.js` |
| `/activitylog` | `js/p7_activity.js` |

The result JSON contains the per-route source and Django map, every local file path, byte length, SHA-256, license record, image/SVG dimensions, and the representative browser response bodies. The target's 14 static files all returned HTTP 200 and their response hashes matched the corresponding local files. `collectstatic` also copied the 431-byte favicon with the same digest as the source.

## Asset identity and licensing

| Asset | Identity and license | Current parity result |
|---|---|---|
| Source `public/favicon.svg`; Django `static/favicon.svg` | 431 bytes; SVG viewBox and declared size 32×32; SHA-256 `e5786d9cc465947d7ef5458efdcc7f6a77adf2a7f5f79fe31f8dee4824fb32ea`. The target file is an exact copy. | Both runtime responses were HTTP 200 with this same digest on `/about`, `/login`, and `/documentation`; the collected file also matches. |
| Google Fonts CSS | Source, public/app Django base, and standalone Django Auth base use the same Hanken Grotesk and JetBrains Mono URL. Both font families are SIL Open Font License 1.1: [Hanken Grotesk metadata](https://github.com/google/fonts/blob/main/ofl/hankengrotesk/METADATA.pb), [JetBrains Mono license](https://github.com/JetBrains/JetBrainsMono). | On `/about`, `/login`, and `/documentation`, the stylesheet and downloaded WOFF2 response hashes matched between source and Django. The response URLs, sizes and hashes are recorded in the JSON. Font binaries stay remotely hosted, so their hashes describe this run rather than a pinned local copy. |
| Source `lucide-react` and Django `static/icons/sprite.svg` | Source package 0.344.0, ISC license; source renders inline SVG. Target sprite is 8,938 bytes with 29 symbols, each using a 24×24 viewBox; the vendored license file is ISC. | The matching icon library and license are recorded. A complete route-by-route visual review of icon appearance and naming remains part of the open matrix review. |
| Django `static/vendor/htmx-2.0.8.min.js` | 51,250 bytes; vendored with its 642-byte Zero-Clause BSD license text. | Served and hash-checked; referenced by the three Django Auth routes. |
| Source `public/image.png` | 19,260 bytes, PNG 360×360; SHA-256 `4e22e1a1042caf5213bb157d8b3e32c19ccad269a7f842012fb8529d02591f92`. No standalone license file was found. | No source route, Django template, or application file references it. It is recorded as an unused public asset and is not copied into Django. |
| Django CSS, JavaScript, schema example | Exact paths, byte lengths and SHA-256 digests are in the result JSON. The app stylesheet and project scripts are generated/project-owned assets; `static/schema/patient_intake.json` is example schema data, not a user record. | All 14 route-mapped local static files returned 200 and matched their on-disk digests. No failed request occurred on the six representative route loads. |

The browser evidence is [attempt 30](evidence/p9/p9-full-20261014-0723-utc/attempt-30/P9_BROWSER_COMMANDS.json); it covers the full deterministic route and interaction suite after the asset fixes. The focused asset result is [asset attempt 04](evidence/p9/p9-full-20261014-0723-utc/asset-attempt-04/P9_ASSET_RESULTS.json). No source or design-reference assets were moved or replaced.
