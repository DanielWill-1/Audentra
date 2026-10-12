# P9 asset inventory

**Status:** Initial read-only inventory; route-by-route asset parity is NOT RUN. No source or design asset was moved or replaced.

| Asset group | Location | Initial use/boundary | P9 follow-up |
|---|---|---|---|
| React route source | `src/pages/`, `src/components/`, `src/services/` | Preserved source of page layouts, copy, controls and behavior; route component references are listed per row in [P9_ACCEPTANCE_MATRIX.md](P9_ACCEPTANCE_MATRIX.md). | Inventory route-specific icons/images/fonts and compare each against its Django counterpart. |
| Original public assets | `public/` | Includes the existing favicon and image assets used by the source runtime. | Verify referenced assets, dimensions, alt text, local loading and external origins in source and Django captures. |
| Design/reference captures | `new pages/`, `page-screenshots/` | Historical design references; not all screenshots show a successful authenticated state. Original files remain in place. | Match route and state before using any screenshot as a visual reference; record missing/ambiguous references. |
| Django styles | `migration/django/assets/tailwind.input.css`, Tailwind configuration, and generated `migration/django/static/css/app.css` | Pinned Tailwind 3.4.17 build and token check passed during P7 closeout. `collectstatic` copied the rebuilt stylesheet. | Compare fonts, spacing, colors, breakpoints and asset requests against live source captures. |
| Django JavaScript | `migration/django/static/js/` | Shell/navigation, Auth, dashboard, templates, scheduler/settings, voice/media and activity interactions. | Map every loaded asset to a route, verify response/cache behavior and compare source-supported controls. |
| Vendored browser library | `migration/django/static/vendor/htmx-2.0.8.min.js` plus `HTMX_LICENSE` | Local Auth form enhancement; normal full-page forms remain available. | Verify license provenance, exact asset loading and keyboard/error behavior in P9 browser runs. |
| Django icons/data | `migration/django/static/icons/`, `migration/django/static/schema/` | Local icon sprite/licenses and example schema data. | Check icon parity/accessible names and ensure fixture/example files are never represented as user records. |
| Evidence artifacts | `docs/pages/evidence/`, `docs/services/evidence/`, `docs/parity/evidence/p9/` | Historical and current source/Django screenshots, browser JSON and run metadata. | Preserve exact source/target run IDs and hashes; do not overwrite historical captures. |

The initial inventory does not claim that every route asset has been matched. The full P9 audit will add per-route asset paths, source/target availability, digest, dimensions, license, load status and acceptance result.
