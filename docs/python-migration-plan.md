# Python Migration Plan — Audentra / VoiceForm

**Status:** DRAFT **v0.2** — planning only. No production code has been changed.
**Scope:** Migrate this application from React 18 + TypeScript + Vite + Express to a primarily Python-owned stack (Django + Django templates/Jinja + HTMX + Tailwind CSS + minimal Alpine.js/vanilla JS).
**Authority:** This document is a proposal. Nothing in it is approved. See [§11 Open questions](#11-open-questions-and-decisions-requiring-human-approval) for the four decisions that block implementation.

### Revision history

| Version | Change |
|---|---|
| v0.1 | Initial audit and plan. |
| **v0.2** | Review-driven revision. **Architecture unchanged; implementation plan corrected.** Eleven changes: (1) P4 no longer claims a cut-over — Django auth is built **in parallel** and the legacy SPA keeps its Supabase session until its routes migrate ([§2.4](#24-auth-and-session-design), [P4](#p4--auth-and-session-migration-parallel-not-cut-over)); (2) P3 is **contract-compatible with the legacy client first**, multipart added alongside, switched in P8 and deleted in P11, with an explicit dual-credential design instead of an invented bridge ([P3](#p3--python-service-layer)); (3) the RLS work moves from **middleware to an explicit, fail-closed transaction context** ([§2.5](#25-data-access-design)) — the most important correction; (4) the three missing tables are handled by a new **P5a schema reconciliation phase** (dump → replay → diff → baseline + guarded additive migrations) instead of guessed `CREATE TABLE`s; (5) staging must be a **real Supabase environment**, not plain Postgres ([P1](#p1--behaviourui-baseline-and-test-capture)); (6) Django's own state is an **explicit decision** — dedicated `django` schema, no `django.contrib.auth` user model, `request.user` defined as a `SupabaseUser` principal ([§2.4](#24-auth-and-session-design), Q19); (7) the **localStorage/mock contradiction is resolved as a decision**, not deferred ([§2.12](#212-application-state-ownership--resolving-the-localstoragemock-contradiction)); (8) the proxy becomes an **explicit allowlist** and the baseline becomes a **state matrix** ([P6](#p6--shared-ui-and-template-components), [P1](#p1--behaviourui-baseline-and-test-capture)); (9) **PKCE is mandatory** for OAuth; (10) the P4 "admin bypass" is **removed** — rollback is the preserved legacy route/host plus a proxy switch; (11) P10's rollback is **traffic/code only** over a backward-compatible schema, with data corruption treated as a separate incident. |
| **v0.3** | Final cleanup pass; no architecture or strategy changes. Eight changes: (1) the end-state tree no longer contains the superseded `config/middleware/` package — session hydration is `apps/accounts/middleware.py`, token refresh is `apps/accounts/services/tokens.py`, RLS claims are `apps/db/rls.py`; (2) P3's acceptance criteria no longer claim the endpoints require authentication in P3 — they reject requests missing the **transitional control**, authentication becomes mandatory in **P4**, and `INTERNAL_API_TOKEN` is labelled a **non-secret request-control marker** behind the real boundary of private binding + strict Origin/CORS; (3) P4 now states that it **does** modify one legacy file — `src/services/ai.ts`, only to attach the existing Supabase token — while no page or auth component changes; (4) the `default` alias **must use a dedicated least-privilege `django_app` role**, never `service_role` (which has `BYPASSRLS`); (5) `request.user` **no longer carries `access_token`** — tokens live only in `apps/accounts/services/tokens.py`; (6) the execution order is corrected so **W1/W2 proceed on P6 alone** while P3/P4/P5a/P5b run in parallel, with W3 gated on P4 and W4+ on P5b; (7) **Q21 must be answered before P1** because it changes the route manifest; (8) P0's remediation is specified as an **evidence-driven, full-history rewrite + full-history secret scan**, not a single-path example. |

---

## 0. How to read this document

| Section | Purpose |
|---|---|
| [§1 Audit](#1-audit-of-the-current-repository) | What is actually in the repo today. Evidence-based; every claim traces to a file and line. |
| [§2 Target architecture](#2-target-architecture) | What becomes Python, what stays HTML/Tailwind, what must stay JavaScript, and the Supabase decision. |
| [§3 End-state tree](#3-end-state-folder-tree) | The proposed repository layout after migration. |
| [§4 Dependencies](#4-dependency-list) | Python runtime/dev dependencies and what happens to the Node toolchain. |
| [§5 Phased plan](#5-phased-migration-plan) | Thirteen small, reversible phases (P0–P11, with P5 split into P5a/P5b) with per-phase detail. |
| [§6 Not-convertible list](#6-what-cannot-or-should-not-be-converted-to-python) | Explicit non-goals. |
| [§7 Security checklist](#7-security-checklist--must-fix-before-migration-begins) | Blockers to fix **before** migration work starts. |
| [§8 Parity verification](#8-parity-verification-strategy) | How "we didn't break anything" is proven. |
| [§9 Difficulty](#9-estimated-relative-difficulty-per-phase) | Relative effort per phase. |
| [§10 Migration order](#10-migration-order-and-dependency-graph) | Ordering and what can run in parallel. |
| [§11 Open questions](#11-open-questions-and-decisions-requiring-human-approval) | Needs a human decision. |
| [§12 Risk register](#12-risk-register) | Consolidated risks. |
| [§13 Appendices](#appendix-a--route-by-route-migration-matrix) | Route matrix, call-site map, conventions. |

### 0.1 Evidence and confidence

All findings in §1 come from reading the repository in its current state (`git` HEAD `66064ec`, working tree clean). Line counts are **non-blank lines** as counted from the working tree.

Two things could **not** be verified and are marked as such wherever they appear:

- **Live database state.** The Supabase project ref is `aajgkpzuffhuuffaneqi` (from `supabase/.temp/linked-project.json`), but `README.md:122` records that this host does not resolve in DNS. No database connection was available during this audit. Statements about the live DB are inferences from client code and are labelled **[unverified]**.
- **Runtime behaviour.** Nothing was executed: the dev server was not started, no build was run, no page was rendered. The one static verification performed was against the already-present build output in `dist/` (see §1.15).

### 0.2 The goal, stated precisely

The objective is **not** "zero JavaScript". The objective is:

> Nearly all business logic, backend logic, validation, AI orchestration, database access, auth orchestration and maintainable structure are owned and readable in Python; JavaScript is reduced to a small number of isolated, individually-justified browser-integration modules.

A corollary that this plan takes seriously: **where removing JavaScript would make the application worse, JavaScript stays.** The audio capture path is the clearest example.

---

## 1. Audit of the current repository

### 1.1 Inventory

| Area | Files | Non-blank lines | Notes |
|---|---|---|---|
| `src/pages/` | 25 `.tsx` | 9,710 | One file per route; all 25 are routed |
| `src/components/` | 18 `.tsx` | 5,324 | **8 files (1,587 lines) are dead code**; 1 file is **empty**; 2 pairs are near-duplicates |
| `src/lib/`, `src/services/`, `src/config/`, `src/contexts/` | 10 `.ts`/`.tsx` | 1,826 | Includes 1 **dead** 314-line module and 1 duplicate Supabase client |
| `src/App.tsx`, `src/main.tsx`, `src/index.css`, `src/vite-env.d.ts` | 4 | 195 | Router + entry |
| **Frontend total** | **57** | **17,055** | React 18 + react-router-dom v6 + Tailwind + lucide-react |
| `server/` | 4 `.ts` | 403 | Express 4; ~208 lines are **dead code** |
| `scripts/` | 2 `.js` | 161 | Playwright screenshot capture; one is a scratch script |
| `supabase/migrations/` | 7 `.sql` | 686 | 7 tables created; 3 tables used by the client are **missing** |
| **Application source total** | **70** | **≈18,300** | Excludes `node_modules`, `dist`, `new pages/`, `page-screenshots/` |

Tracked repository size: **11.5 MB across 148 files** — of which roughly 4 MB is screenshots/design references and 360 KB is a committed database dump (§1.15).

Non-source tracked assets that matter to migration:

| Path | Contents | Migration relevance |
|---|---|---|
| `new pages/` (10 files, ~350 KB) | Approved HTML design/content references: `landing.html`, `about.html`, `features.html`, `dashboard.html`, `document.html`, `login.html`, `open.html`, `privacy.html`, `terms.html`, and `singup.html` (**0 bytes**) | These are the design source-of-truth. They are already static HTML + Tailwind — directly reusable as Django template raw material for the public pages. |
| `page-screenshots/` (34 PNG) | Rendered route screenshots | Usable as a **partial** visual baseline only; see [§8.1](#81-the-existing-visual-baseline-is-not-usable-for-authenticated-pages). |
| `docs/tables.md` (279 lines) | Prior schema audit | Accurate; independently re-verified this pass. Superseded by §1.7 but worth keeping. |
| `docs/prompt.md` | The prompt that produced `scripts/screenshot.js` | Historical. |
| `backups/` | `db_cluster-12-08-2025@20-15-27.backup` (329 KB) + `.gz` + `qpjclqmszrmdgdqcbels.storage.zip` (22 bytes) | **Committed database dump** — a security item, §7. |
| `archive/` | one stale Vite timestamp artefact | Dead. |
| `.bolt/` | `prompt` (design instruction), `supabase_discarded_migrations/20250614161723_bright_heart.sql` | The discarded migration is the only surviving record of an intended FK — see §1.7 note on `scheduled_events.created_by`. |
| `.commandcode/taste/taste.md` | Empty template | Dead. |

### 1.2 Current runtime architecture

```
                         BROWSER (React SPA, single bundle 744 KB)
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ react-router-dom routes (App.tsx, 25 routes, NO 404 route)               │
  │                                                                          │
  │  AuthContext ── supabase-js ─────────────┐                               │
  │     (getSession / onAuthStateChange)     │                               │
  │                                          │                               │
  │  src/lib/templates.ts   ─┐               │                               │
  │  src/lib/scheduler.ts   ─┼─ supabase-js ─┼──►  Supabase PostgREST (RLS)  │
  │  src/pages/FilledTemplates ─ supabaseClient.ts (2nd client, no guard) ───┤──► Supabase Storage
  │  src/lib/activity.ts   ──┘  (localStorage + mock only)                   │
  │                                                                          │
  │  src/services/ai.ts                                                      │
  │     processWithGroq ──── fetch ──► https://api.groq.com  (VITE_ key) ────┼──► Groq
  │     transcribeAudio ──── fetch ──► http://localhost:3001/api/transcribe  │
  │     synthesizeSpeech ─── fetch ──► http://localhost:3001/api/tts         │
  │                                                                          │
  │  Browser-only: getUserMedia, MediaRecorder, Blob, FileReader, Audio      │
  └──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                         SERVER (Express, 403 lines, port 3001)
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ app.use("/api",  transcriptionRoute)   POST /api/transcribe → Google STT │
  │ app.use("/api/tts", ttsRoute)          POST /api/tts        → Google TTS │
  │ static: ../client (dist/client) + SPA catch-all                          │
  │ routes/transcribe.ts = DEAD (never mounted)                              │
  └──────────────────────────────────────────────────────────────────────────┘
```

Two things in that picture drive the whole plan:

1. **The Express backend is a thin, stateless proxy** (403 lines, one of which is dead). It holds no sessions, no business logic, no database access. It is the easiest thing in the repository to port.
2. **All business logic and all database access live in the browser**, using the Supabase anon key. That is the hard part — not because the logic is complex, but because moving it server-side changes *where authority lives* for every ownership column, every RLS policy, and every session.

### 1.3 Routes

From `src/App.tsx` (25 routes). "Shell" = how the route is wrapped.

| # | Path | Component | File lines | Shell | Auth-gated in code | Primary data source |
|---|---|---|---|---|---|---|
| 1 | `/` | `Home` | 760 | Header+Footer | no | none (static) |
| 2 | `/features` | `Features` | 411 | Header+Footer | no | none |
| 3 | `/industries` | `Industries` | 263 | Header+Footer | no | none |
| 4 | `/security` | `Security` | 214 | Header+Footer | no | none |
| 5 | `/pricing` | `Pricing` | 255 | Header+Footer | no | none |
| 6 | `/about` | `About` | 181 | Header+Footer | no | none |
| 7 | `/contact` | `Contact` | 126 | Header+Footer | no | none |
| 8 | `/status` | `Status` | 293 | Header+Footer | no | none |
| 9 | `/help-center` | `HelpCenter` | 328 | Header+Footer | no | none (client-side search) |
| 10 | `/documentation` | `Documentation` | 385 | Header+Footer | no | none (+ clipboard) |
| 11 | `/terms` | `Terms` | 119 | Header+Footer | no | none |
| 12 | `/privacy` | `Privacy` | 313 | Header+Footer | no | none (+ clipboard) |
| 13 | `/open` | `Open` | 201 | Header+Footer | no | none |
| 14 | `/login` | `Login` | 223 | bare | no | Supabase Auth |
| 15 | `/signup` | `Signup` | 372 | bare | no | Supabase Auth |
| 16 | `/forgot-password` | `ForgotPassword` | 130 | bare | no | Supabase Auth |
| 17 | `/reset-password` | `ResetPassword` | 255 | bare | no | Supabase Auth |
| 18 | `/dashboard` | `Dashboard` | 834 | bare | yes (soft) | templates + shares + events + activity |
| 19 | `/templates` | `Templates` | 348 | bare | yes (soft) | `templates` |
| 20 | `/scheduler` | `Scheduler` | 854 | bare | yes (soft) | `scheduled_events` |
| 21 | `/manage-schedules` | `ManageSchedules` | 663 | bare | yes (soft) | `scheduled_events` |
| 22 | `/scheduler-settings` | `SchedulerSettings` | 917 | bare | yes (soft) | **localStorage only** |
| 23 | `/filledtemplates` | `FilledTemplates` | 116 | bare | yes (soft) | `filled_templates` |
| 24 | `/AIVoiceAutoFill` | `AIVoiceAutoFill` | 757 | bare | yes (soft) | Google STT/TTS + Groq + `filled_templates` |
| 25 | `/activitylog` | `ActivityLog` | 392 | bare | yes (soft) | **localStorage only** |

Route-level facts that the Django URLconf must reproduce:

- **No 404 route.** An unknown path renders an empty `<div className="min-h-screen bg-white">`. The Django version must decide deliberately (recommend a real 404).
- **No route guard component.** There is no `ProtectedRoute`, no `<Navigate>` wrapper in `App.tsx`. Each app page does its own check: `if (authLoading) return spinner; if (!user) return null;` (e.g. `AIVoiceAutoFill.tsx:373-386`). So an unauthenticated visit to `/dashboard` renders **blank**, not a redirect. Reproducing "blank" exactly is not desirable; this is flagged in §11.
- **Broken share route.** `src/lib/templates.ts:586-588` generates `${origin}/templates/shared/${templateId}` but no such route exists. Share links are dead ends today.
- **Case sensitivity hazard.** `Dashboard.tsx:38-42` imports `'../components/team/...'` while the directory on disk is `src/components/Team/`. This resolves on Windows/macOS but **fails on a case-sensitive filesystem**. It also means any build/CI on Linux would break — relevant because the Django build will likely run in Linux containers.
- **Route naming inconsistency.** `/AIVoiceAutoFill` is camel-case while everything else is lower-case; `ActivityLog.tsx:409` carries a comment insisting on `/activitylog` (lower-case) for all links.

### 1.4 Pages — where the migration weight is

Ranked by size, with the migration-relevant characteristic of each:

| Page | Lines | Data / IO | Migration weight |
|---|---|---|---|
| `SchedulerSettings.tsx` | 917 | localStorage keyed `scheduler_settings_{user.id}`; large settings form | Medium — big form, but zero server logic. Mostly a template conversion. |
| `Scheduler.tsx` | 854 | `scheduled_events` CRUD + `searchEvents` + stats | High — full CRUD with client-side filtering. |
| `Dashboard.tsx` | 834 | 5 fetches (templates, shares with/without, upcoming events, activity) + 5 modals + localStorage settings + mobile drawer | **Highest** — the hub; composes the app shell, the modals and three data domains. |
| `Home.tsx` | 760 | static | Low, but largest public page. |
| `AIVoiceAutoFill.tsx` | 757 | mic capture → STT → Groq → form autofill → audio playback → DB insert | **Highest along with Dashboard** — this is the product's core loop and the only place with a genuine JS requirement. |
| `ManageSchedules.tsx` | 663 | `scheduled_events` + a local shadow `getEventStats()` at `:295` | High — duplicated stats logic. |
| `Features.tsx` | 411 | static | Low. |
| `ActivityLog.tsx` | 392 | `src/lib/activity.ts` → **localStorage + mock seed data** | Medium — needs a decision: port the mock as-is, or back it with a real table. |
| `Documentation.tsx` | 385 | static + clipboard | Low. |
| `Signup.tsx` | 372 | Supabase Auth signUp w/ metadata | High — auth semantics. |
| `Templates.tsx` | 348 | `templates` list + builder modal | High. |
| `HelpCenter.tsx` | 328 | static + client-side filter | Low. |
| `Privacy.tsx` | 313 | static + clipboard (PGP key) | Low. |
| `Status.tsx` | 293 | static | Low. |
| `Industries.tsx` | 263 | static | Low. |
| `Pricing.tsx` | 255 | static | Low. |
| `ResetPassword.tsx` | 255 | `supabase.auth.updateUser({password})` | High — see the reset-flow defect in §1.9. |
| `Login.tsx` | 223 | password + OAuth | High. |
| `Security.tsx` | 214 | static | Low. |
| `Open.tsx` | 201 | static (Apache 2.0 text) | Low. |
| `About.tsx` | 181 | static | Low. |
| `ForgotPassword.tsx` | 130 | `resetPasswordForEmail` | Medium. |
| `Contact.tsx` | 126 | static form (no submit target found) | Low. |
| `Terms.tsx` | 119 | static | Low. |
| `FilledTemplates.tsx` | 116 | `filled_templates` select/delete | Medium. |

Two pages exist on disk but are **not routed**: `Industries` (routed) vs — more precisely, every page file is referenced by `App.tsx` except none; the orphan risk is instead in components (§1.5).

### 1.5 Components

Import usage was verified by grepping every `src/**/*.{ts,tsx}` file outside `components/` for an import of each component's basename.

| Folder | File | Lines | Status | Purpose | Consumers |
|---|---|---|---|---|---|
| — | `Header.tsx` | 70 | **live** | Public nav | 13 public routes; uses `useAuth` |
| — | `Footer.tsx` | 58 | **live** | Public footer | 13 public routes |
| — | `ScrollToTop.tsx` | 15 | live (delete) | Scroll-to-top on route change | `App.tsx:39` — **becomes unnecessary** with server-rendered navigation |
| `Team/` | `TeamMembersModal.tsx` | 612 | live but **unreachable** | Team member management | Imported by `Dashboard.tsx:39`, rendered at `:870`, but `showTeamModal` (`:85`) is **never set to `true`** — its only writers are `onClose` (`:871`) and an `onInvite` callback (`:873`). The modal cannot open. |
| | `ReviewQueueModal.tsx` | 599 | live | Review queue | `Dashboard.tsx:42`; **localStorage + mock seed** (`mockReviewItems`) |
| | `ShareNewTemplateModal.tsx` | 422 | live | Share templates with team | `Dashboard.tsx:40`; `lib/templates` |
| | `SharedTemplateCard.tsx` | 417 | live | Card for a shared template | `Dashboard.tsx:41` |
| | `InviteMemberModal.tsx` | 317 | live | Invite by email | `Dashboard.tsx:38`; **localStorage-only** |
| `TemplateBuilder/` | `TemplateBuilderModal.tsx` | 769 | **live** | Create/edit template + file upload | `Templates.tsx`, `Dashboard.tsx`; drives `createTemplate`/`updateTemplate`/`uploadTemplateFile` |
| | `TemplateCard.tsx` | 458 | **live** | Template card | `Templates.tsx`; delete / visibility toggle / export / share link |
| `Dashboard/` | `RecentActivity.tsx` | 193 | **DEAD** | Activity feed widget | none |
| `Dashboard/` | `TeamTemplates.tsx` | 196 | **DEAD** | Shared-template list widget | none |
| `Scheduler/` | `UpcomingEvents.tsx` | 178 | **DEAD** | Upcoming events widget | none |
| `Scheduler/` | `ScheduleStats.tsx` | 103 | **DEAD** | Stat tiles | none |
| `Stats/` | `StatsCard.tsx` | 48 | **DEAD** | Generic stat tile | none |
| `Team/` | `TemplateReviewModal.tsx` | 481 | **DEAD** | Review a template (Team variant) | none — and it renders an **undefined `AlertTriangle`** (`:306`), so it would throw if ever mounted |
| `TemplateBuilder/` | `TemplateReviewModal.tsx` | 388 | **DEAD** | Review a template (builder variant) | none |
| `TemplateBuilder/` | `ShareTemplateModal.tsx` | **0** | **DEAD** | — | **Empty file** |

**Dead component total: 8 files, 1,587 non-blank lines — 30% of `src/components/`.** Only **10 components** are reachable today.

Component-level facts the migration must handle:

- **Only 2 of the dead widgets would have been useful.** `Dashboard/RecentActivity`, `Dashboard/TeamTemplates`, `Scheduler/UpcomingEvents` and `Scheduler/ScheduleStats` duplicate data that `Dashboard.tsx` and `Scheduler.tsx` already fetch *inline* (`Dashboard.tsx:163,176`; `Scheduler.tsx:129-133`). In Django these become **partials**, not components — the dead files are simply not ported, and the markup worth keeping is lifted out of the *pages*.
- **Duplicated modal pair.** `Team/TemplateReviewModal.tsx` (481) and `TemplateBuilder/TemplateReviewModal.tsx` (388) are two implementations of one concept with byte-identical `STATUS_OPTIONS`, `getAverageRating`, `getStatusColor`, `formatDate`, star widget, rating histogram and Helpful/Not-helpful row. The Team variant is localStorage-backed with a fake 1-second submit; the builder variant is Supabase-backed. **Both are dead**, so nothing needs preserving — but the builder variant documents the intended UX and should be consulted when building the single Django review fragment.
- **Duplicated card pair.** `TemplateBuilder/TemplateCard.tsx` (458) and `Team/SharedTemplateCard.tsx` (417) are ~80% identical (shell, dropdown, click-catcher, hide/show, delete-confirm, `CATEGORY_ICONS`, `formatTimeAgo`). Both are live. In Django they become one `partials/_template_card.html` with a `variant` flag.
- **Every "modal" is a `useState` boolean + conditional render** in the parent. That maps cleanly onto HTMX (`hx-get` a fragment swapped into a `<dialog>` container). `Dashboard.tsx` alone holds five such booleans (`:84-87`).
- **13 modal/dialog surfaces** (11 top-level + 2 nested), all sharing one shell: `fixed inset-0 bg-black/50` plus a `max-h-[90vh] overflow-y-auto` panel with a `p-6 border-b` header and `p-6 border-t` footer. **None** use `<dialog>`, a focus trap, Escape-to-close, or body-scroll-lock; dismissal relies on a click-catcher `<div>`. Two structural outliers: `ReviewQueueModal.tsx:506-637` is a **modal nested inside a modal** (`z-60`, a non-standard class), and `TeamMembersModal.tsx:501-537` is an inline panel, not an overlay. → **one Django modal macro**, and the Django version should adopt native `<dialog>` for focus/Escape behaviour. That is a deliberate accessibility improvement, flagged in §11.
- **3 wizard flows:** the template builder (Basic Info → Creation Method → field builder *or* upload, `TemplateBuilderModal.tsx`, with the field-editor JSX **duplicated verbatim** at `:454-551` and `:635-731`); the voice flow (`AIVoiceAutoFill.tsx:52` `'select' | 'chat' | 'review'`); password recovery across `ForgotPassword` → `ResetPassword`. In Django the first two become server-driven step partials; the third becomes two views.
- **Duplicated stats logic.** `lib/scheduler.ts::getEventStats` (exported, dead) and a locally shadowing `getEventStats` in `ManageSchedules.tsx:295`. Django gets exactly one queryset aggregate.
- **Duplication worth collapsing while porting (measured):** the `CATEGORY_ICONS` map appears **5×**; the category list **3×**; the `GITHUB_REPO` string **9×**; `EVENT_TYPES` **2×**; `PRIORITY_COLORS` **3×**; `formatTime` **3×**; a four-line "wheel listener with `preventDefault`" boilerplate **4×** (all Team modals bypass native scroll). All of these disappear by construction in Django templates.
- **Name collisions to resolve:** `getEventStats` (exported *and* locally shadowed); `formatTimeAgo` (`lib/activity.ts:154` and `SharedTemplateCard.tsx:110`; `ActivityLog.tsx` imports the former and uses neither); `SchedulerSettings` is both an interface (`:28`) and the component (`:99`).
- **`ScrollToTop`** exists only because this is a SPA. Server-rendered navigation resets scroll naturally — this component is *deleted*, not ported.

### 1.6 Shared modules

| Module | Lines | What it does | Fate |
|---|---|---|---|
| `lib/templates.ts` | 610 (535 non-blank) | 21 exported functions over `templates`, `template_shares`, `template_reviews`; file upload to Storage; export-to-JSON via Blob; share-link generation | Becomes `templates/services.py` + `templates/selectors.py` |
| `lib/scheduler.ts` | 280 | CRUD + range/status/type filters + stats + search over `scheduled_events` | Becomes `scheduler/` app |
| `lib/activity.ts` | 183 | Activity feed — **localStorage first, mock seed data if empty** | Requires a product decision (§11) |
| `lib/supabase.ts` | 99 | Lazy-Proxy Supabase client + 6 auth helpers | Deleted; replaced by `accounts/services/gotrue.py` |
| `lib/supabaseClient.ts` | 6 | **A second, non-lazy `createClient`** with no env guard | **Deleted.** Two GoTrue clients in one app is a bug. |
| `lib/aiVoiceService.ts` | 347 | `ElevenLabsService`, `GroqService`, `MockElevenLabsService`, `MockGroqService`, `createAIVoiceServices()` | **DEAD** — imported by nothing (§1.14). Deleted. |
| `services/ai.ts` | 432 (372 non-blank) | `transcribeAudio` → local Express; `synthesizeSpeech` → local Express; `processWithGroq` → Groq directly from the browser; audio player helper; JSON-scraping fallback parser | Becomes the Django AI service layer |
| `contexts/AuthContext.tsx` | 74 | `user`/`session`/`loading` + `signOut`, via `getSession` + `onAuthStateChange` | Becomes Django middleware + `request.user` |
| `config/api.ts` | 19 | Google URLs + `VITE_GROQ_API_KEY` + `VITE_LLAMA_API_KEY` | Deleted; keys move server-side |
| `config/credentials.ts` | 16 | Imports `../../service-account.json` into the client graph | **Deleted** (§7) |

### 1.7 Data model

Verified against all seven migration files; independently re-derived and matching `docs/tables.md`.

**Tables created by migrations (7):**

| Table | Created in | Owner column | RLS |
|---|---|---|---|
| `templates` | `20250612153114_spring_water.sql:23-34` | `created_by` → `auth.users(id)` ON DELETE CASCADE | enabled `:37`, re-enabled `20250612154531_dry_lantern.sql:53` |
| `scheduled_events` | `20250614161822_turquoise_king.sql:33-50` | `created_by` — **no FK at all** | enabled `:53` |
| `users` | `20250628064052_twilight_disk.sql:24-33` | `id` → `auth.users(id)` CASCADE | enabled `:36` |
| `teams` | `20250628064557_aged_tree.sql:55-62` | `owner_id` — **no FK** | enabled `:125` |
| `team_members` | `aged_tree.sql:65-82` | `user_id` **nullable, no FK** | enabled `:126` |
| `team_invites` | `aged_tree.sql:85-98` | `invited_by` — **no FK** | enabled `:127` |
| `team_activity` | `aged_tree.sql:101-109` | `user_id` — **no FK** | enabled `:128` |

**Tables the client uses that no migration creates (3):**

| Table | Used by | Migration state |
|---|---|---|
| `template_shares` | `lib/templates.ts` — 8 write sites, 4 read sites, 3 nested embeds | `20250628065741_precious_brook.sql:37` only runs `ENABLE ROW LEVEL SECURITY`; no `CREATE TABLE` exists |
| `template_reviews` | `lib/templates.ts` — 3 write sites, 2 read sites, 3 nested embeds | `precious_brook.sql:40` — same |
| `filled_templates` | `FilledTemplates.tsx:18,31`; `AIVoiceAutoFill.tsx:347` | **Nothing at all** — no DDL, no RLS, no policies |

`contact_submissions` is referenced in the scratch script `scripts/test.js` but appears in no migration and no `src/` file.

**Policy summary** (full detail in `docs/tables.md` plus the audit for this plan):

| Table | Policies | Effective behaviour |
|---|---|---|
| `templates` | 8 accumulated across 3 migrations; `humble_fire.sql:16-37` adds 4 with **no `TO` clause → role `PUBLIC`** | Owner-only. The `visibility`-aware policy (`spring_water.sql:47-51`) was **dropped** by `dry_lantern.sql:19` and never restored. |
| `scheduled_events` | 4, all `TO authenticated`, `created_by = auth.uid()` | Owner-only |
| `users` | SELECT `USING (true)` (`twilight_disk.sql:39-43`), UPDATE/INSERT self-scoped. **No DELETE policy.** | 🔴 Every authenticated user can read **every** user's email, name, company, industry. Deletes are denied for everyone. |
| `teams`, `team_members`, `team_invites`, `team_activity` | 2 each, owner/member-scoped | Correct in intent, but **no client code reads or writes any of these tables** (§1.8). `team_members`' policies contain self-referencing subqueries on their own table — a classic PostgreSQL *"infinite recursion detected in policy"* hazard **[unverified]**. |
| `template_shares`, `template_reviews` | one SELECT policy each, `USING (true)` | 🔴 Reads are open to all authenticated users; **writes are denied to everyone** (no INSERT/UPDATE/DELETE policy exists). |

**Functions / triggers:** seven `updated_at` stampers plus `handle_new_user()` (`twilight_disk.sql:61-73`, `SECURITY DEFINER`) fired by `on_auth_user_created` (`:77-79`) on `auth.users` insert, copying `first_name`/`last_name` from `raw_user_meta_data`. It has **no `ON CONFLICT`**, and `users.email` is `UNIQUE` — a collision aborts the signup. `Signup.tsx:80-85` also passes `company` and `industry`, which the trigger **silently discards**.

**Enums:** there are no `CREATE TYPE` statements in the repository. Every enumerated value is `text` + `CHECK`. The only enum values without a DB constraint belong to the three tables that have no DDL (`template_shares.role`, `template_reviews.status`).

**Views / RPC:** none. `grep 'rpc('` over `src/` returns zero hits.

**Storage:** no storage DDL exists anywhere. The single bucket in use is **`template-files`**, touched only at `lib/templates.ts:596-598` (`upload`) and `:605-607` (`getPublicUrl`), with paths built as `templates/{templateId}.{ext}` at `:594`. `getPublicUrl` is only useful if the bucket is public. The only caller that persists the result stores the **path**, not the URL: `TemplateBuilderModal.tsx:257` → `updateTemplate(id, { uploaded_file: fileData.path })`.

### 1.8 Supabase call-site matrix

This is the authoritative list of what must move behind Django, and it is the basis of [Appendix B](#appendix-b--supabase-call-site--django-view-map).

| Table | Operation | Call site |
|---|---|---|
| `templates` | INSERT | `lib/templates.ts:72` |
| | SELECT (+ 2 nested embeds) | `lib/templates.ts:86`, `:123`, `:161` |
| | UPDATE | `lib/templates.ts:198`, `:220` |
| | DELETE | `lib/templates.ts:209` |
| `scheduled_events` | INSERT | `lib/scheduler.ts:55` |
| | UPDATE | `lib/scheduler.ts:136`, `:202`, `:216` |
| | DELETE | `lib/scheduler.ts:148` |
| | SELECT | `lib/scheduler.ts:84`, `:112`, `:125`, `:163`, `:178`, `:190`, `:236`, `:242`, `:249`, `:256`, `:273` |
| `template_shares` | INSERT | `lib/templates.ts:254`, `:297` |
| | SELECT | `lib/templates.ts:314`, `:344`; embeds at `:89`, `:126`, `:164` |
| | UPDATE | `lib/templates.ts:396`, `:414` |
| | DELETE | `lib/templates.ts:370`, `:381` |
| `template_reviews` | INSERT | `lib/templates.ts:452`, `:517` |
| | SELECT | `lib/templates.ts:468`, `:550`; embeds at `:99`, `:136`, `:174` |
| | UPDATE | `lib/templates.ts:535` |
| `filled_templates` | SELECT | `FilledTemplates.tsx:18` |
| | DELETE | `FilledTemplates.tsx:31` |
| | INSERT | `AIVoiceAutoFill.tsx:347` |
| `auth` | getSession / onAuthStateChange | `contexts/AuthContext.tsx:29`, `:38` |
| | signInWithOAuth | `lib/supabase.ts:30` (called from `Login.tsx:60`, `Signup.tsx:100`) |
| | signInWithPassword | `lib/supabase.ts:60` |
| | signUp | `lib/supabase.ts:68` |
| | signOut | `lib/supabase.ts:80`, `AuthContext.tsx:51` |
| | getUser | `lib/supabase.ts:85` (**dead export**) + `lib/templates.ts:233,268,308,340,430,464,498` |
| | resetPasswordForEmail | `lib/supabase.ts:95` |
| | updateUser({password}) | `ResetPassword.tsx:57` |

Facts that fall out of this matrix:

- **`lib/templates.ts` is a chokepoint.** 21 of the 38 data call-sites live in one 610-line file, and it already has a service-oriented shape. It maps almost one-to-one onto Django service functions — the single best structural asset in the codebase for this migration.
- **Two Supabase clients.** `filled_templates` is reached through `lib/supabaseClient.ts` (a second `createClient` with no environment guard) while everything else uses the lazy `lib/supabase.ts`. Two GoTrue clients in one page.
- **Client-supplied ownership.** `created_by` (`TemplateBuilderModal.tsx:216`, `Scheduler.tsx:276`), `shared_by` (`templates.ts:248,289`), `reviewer_id` (`templates.ts:441,509`) and `filled_templates.user_id` (`AIVoiceAutoFill.tsx:349`) are all *client-supplied* and only partly enforced by `WITH CHECK` — and for `filled_templates`, not enforced at all. The client also writes its own `updated_at` strings (`templates.ts:249,290,399,447,512,538`), bypassing the DB triggers.
- **PostgREST filter injection.** `lib/scheduler.ts:275` builds `.or(\`title.ilike.%${query}%,...\`)` by interpolating raw user input into a filter expression.
- **Fan-out to components.** `lib/templates.ts` is imported by 8 components and `lib/scheduler.ts` by 5 — this is why the shared-component phase (P6) has to exist before the page phase (P7).

### 1.9 Authentication and session behaviour

| Concern | Today |
|---|---|
| Identity provider | Supabase GoTrue (cloud), project `aajgkpzuffhuuffaneqi` |
| Session storage | Browser localStorage, managed by `supabase-js` |
| Session restoration | `getSession()` on mount + `onAuthStateChange` subscription (`AuthContext.tsx:29,38,45`) |
| Password sign-in | `signInWithPassword` (`lib/supabase.ts:60`) |
| Sign-up | `signUp` with `options.data` metadata (`:68`) + `emailRedirectTo: ${origin}/dashboard` (`:73`) |
| OAuth | `signInWithOAuth` for `google` (`Login.tsx:60`, `Signup.tsx:100`) and `microsoft` (`Signup.tsx:100`) |
| Sign-out | `supabase.auth.signOut()` then clear local state (`AuthContext.tsx:48-64`) |
| Password reset | `resetPasswordForEmail` → `redirectTo` = `${origin}/reset-password` in dev, **`https://your-production-domain.com/reset-password` in a PROD build** (`lib/supabase.ts:91-93`) |
| Reset completion | `ResetPassword.tsx:57` `updateUser({password})`, relying on the SDK detecting the recovery token in the URL |
| Profile sync | DB trigger `on_auth_user_created` → `handle_new_user()` copies `first_name`/`last_name` only |
| Route protection | **None centrally.** Per-page `if (!user) return null;` |

**Defects found in the auth path:**

1. 🔴 **OAuth can never succeed.** `lib/supabase.ts:28` logs `` `${supabaseUrl}` ``, but `supabaseUrl` is declared with `const` *inside* `getSupabase()` at `:8`. It is out of scope at module level, so the call throws `ReferenceError`, which the `try/catch` at `:53` swallows and returns as an error. Every Google/Microsoft button is dead. This ships because `npm run build` runs `tsc` with the **root `tsconfig.json`, which includes only `server/**/*.ts`** (`tsconfig.json:14`) — the frontend is never type-checked by the build.
2. 🔴 **Password reset targets a placeholder domain in production** (`lib/supabase.ts:92`).
3. 🟠 **The reset page's token check is ineffective.** `ResetPassword.tsx:30-35` reads `access_token`/`refresh_token` from the **query string**, but GoTrue's implicit-flow recovery link delivers them in the **URL fragment**. The page therefore always shows "Invalid reset link", while the actual reset works only if `supabase-js` happens to parse the fragment first.
4. 🟠 **`microsoft` is not a standard Supabase provider id** (it is normally `azure`). Moot today because of defect 1; relevant when re-implementing.
5. 🟠 **`getCurrentUser` (`lib/supabase.ts:84`) is dead.**
6. 🟠 **`company`/`industry` are collected at signup and silently dropped** by the trigger.

### 1.10 AI, speech-to-text and text-to-speech

There are **two parallel AI stacks**, one live and one dead:

**Live (`src/services/ai.ts`, 432 lines):**

| Function | Transport | Notes |
|---|---|---|
| `transcribeAudio` | `POST http://localhost:3001/api/transcribe` with base64 data URL + MIME type | Validates MIME and a 10 MB base64 limit client-side; the URL is **hardcoded** (`ai.ts:91`) |
| `synthesizeSpeech` | `POST http://localhost:3001/api/tts` | Hardcoded URL (`ai.ts:173`); returns `data:audio/mp3;base64,...`; swallows all errors and returns `''` |
| `processWithGroq` | **Direct browser → `https://api.groq.com`** with `VITE_GROQ_API_KEY` | Model `llama3-70b-8192`, temperature 0.3, `max_tokens` 2048. Parses the model's JSON with `JSON.parse` then a regex fallback. |
| `createAudioPlayer` | `new Audio(url)` | Wraps `MediaError` codes and a 10 s timeout |
| `extractDataFromText` | — | Dead regex fallback (defined at `:394`, never called) |

The system prompt (`ai.ts:283-308`) instructs the model to return `{ response, extractedData }` with field IDs as keys. Field matching back onto the form is done client-side by `normalizeKey` (`AIVoiceAutoFill.tsx:185`) comparing normalized field id **or** label.

**Dead (`src/lib/aiVoiceService.ts`, 347 lines):** `ElevenLabsService` (`https://api.elevenlabs.io/v1/speech-to-text`, `whisper-1`), `GroqService`, plus mock implementations and a `createAIVoiceServices()` factory. **Imported by nothing.** It is the only trace of the ElevenLabs integration that `README.md:63` still advertises.

**Express backend (`server/`, 403 lines):**

| File | Lines | Mounted | Behaviour |
|---|---|---|---|
| `index.ts` | 25 | — | `cors()` wide open, 20 MB body limit, mounts two routes, serves `../client` with an SPA catch-all |
| `routes/transcription.ts` | 74 | `POST /api/transcribe` | Google Cloud Speech `recognize`; MIME→encoding map; sample-rate map; splits the base64 data URL |
| `routes/tts.ts` | 170 | `POST /api/tts` | Google Cloud TTS `synthesizeSpeech`; text validation (≤5000 chars); aggressive character stripping; returns base64 audio |
| `routes/transcribe.ts` | 208 | **never mounted** | **DEAD.** Near-duplicate of `transcription.ts`, written with `require()` in a `.ts` file, plus its own mock-transcript branch. |

Both live routes build a `SpeechClient`/`TextToSpeechClient` with `keyFilename: "service-account.json"` — a **relative** path, so they only work when the process CWD is the repo root.

### 1.11 Browser-only APIs — the irreducible JavaScript surface

Every occurrence, with the file that owns it:

| API | Occurrences | Purpose | Can Python replace it? |
|---|---|---|---|
| `navigator.mediaDevices.getUserMedia` | `AIVoiceAutoFill.tsx:118` | Microphone capture with `sampleRate: 16000`, `channelCount: 1`, echo cancellation, noise suppression | **No.** |
| `MediaRecorder` | `AIVoiceAutoFill.tsx:58,127,131` | `audio/webm;codecs=opus`, 1 s timeslice, chunk accumulation | **No.** |
| `Blob` | `AIVoiceAutoFill.tsx:141`; `lib/templates.ts:569` | Assemble recorded chunks; build the JSON export blob | **No** (client-side export could move server-side; capture cannot) |
| `FileReader` | `AIVoiceAutoFill.tsx:209-214` | Convert the recording to a base64 data URL | **No** — but see §2.9: it can be replaced by a `multipart/form-data` POST, which removes this API entirely |
| `URL.createObjectURL` / `revokeObjectURL` | `AIVoiceAutoFill.tsx:143`; `lib/templates.ts:572,582` | Audio preview URL; download link | **No** for capture; **Yes** for export (server can stream a file) |
| `new Audio()` / `<audio>` playback | `AIVoiceAutoFill.tsx:220,260,322`; `services/ai.ts:214-247` | Play the TTS reply and the recorded preview | **No** — playback control is inherently client-side, though a plain `<audio controls>` element needs no JS |
| `navigator.clipboard.writeText` | `Documentation.tsx:152`, `Privacy.tsx:31`, `TemplateCard.tsx:133` | Copy code block, PGP key, share link | **No.** Small JS, or a form-based fallback |
| `localStorage` | 30 call sites across 8 files | Activity feed, dashboard settings, scheduler settings, team members, invites, review queue | **No** — but most of these are *data* that should move server-side (§1.12) |
| `window.location.origin` | `lib/supabase.ts:33,73,93`; `lib/templates.ts:587` | Build redirect/share URLs | **Yes** — `request.build_absolute_uri()` |
| Route-change scroll reset | `components/ScrollToTop.tsx` (whole file) | SPA artefact | **Yes** — deleted; server navigation resets scroll |
| `new Date().toLocaleString()` / `formatTimeAgo` | `FilledTemplates.tsx:103`; `lib/activity.ts:154` | Timestamp formatting | **Yes** — Django template filters |

**Conclusion:** the genuinely irreducible set is *microphone capture, audio blob/playback, and clipboard*. Everything else on this list is either replaceable by ordinary HTML form mechanics or by server-side rendering. This is quantified in [§2.9](#29-the-audio-and-media-bridge-design).

### 1.12 Mock, localStorage-only and cosmetic features

Critical for setting expectations: **several features that appear functional are not backed by the database.**

| Feature | State | Evidence |
|---|---|---|
| Team members / invites | **localStorage only.** No client code touches `teams`, `team_members`, `team_invites`, `team_activity` | `TeamMembersModal.tsx:128,170,176,215,244,283,328`; `InviteMemberModal.tsx:138,151` |
| Team member list | Seeded with **2 fake members** ("Alex Chen", "Maria Johnson") | `TeamMembersModal.tsx:146-165` |
| Review queue | **localStorage, seeded with mock items** | `ReviewQueueModal.tsx:124,142-187,191` |
| Template reviews (Team variant) | **localStorage first, API fallback** | `Team/TemplateReviewModal.tsx:60,72,127,166,188` |
| Activity log | **localStorage, seeded with hardcoded mock items; no DB table** | `lib/activity.ts:20-87,100-146` |
| Dashboard settings | localStorage, key `voiceform_dashboard_settings`, **not per-user** | `Dashboard.tsx:93,214` |
| Scheduler settings | localStorage, key `scheduler_settings_{user.id}` — the only user-scoped key | `SchedulerSettings.tsx:169,194` |
| "Share with team" | 🔴 Shares with the **caller's own email address**; writes no real recipients | `lib/templates.ts:277-301` |
| Shared-template visibility toggle | Writes `message: 'hidden_by_user'` into a share row as a flag — a schema hack | `lib/templates.ts:393-406` |
| `pendingInvites` key | **Written by two components** (`InviteMemberModal.tsx:151`, `TeamMembersModal.tsx:215,244`) but read by only one — unowned schema | `TeamMembersModal.tsx:176` |
| `reviewQueueItems` / `templateReviews_<id>` keys | **Shadow the real `template_reviews` table** — the two will diverge after migration | `ReviewQueueModal`, `Team/TemplateReviewModal` |
| `template_shares` / `template_reviews` writes | **+11 write sites against tables whose RLS denies writes** | §1.7 |
| `filled_templates` | No RLS; reachable with the anon key | §1.7 |
| Public/visible templates | Dead — the enabling policy was dropped | §1.7 |
| Share links (`/templates/shared/:id`) | Route does not exist | §1.3 |

**Parity rule adopted by this plan:** the migration ports **observed behaviour**. Backing a mock with a database is a *behaviour change* and is therefore an explicit, approved decision — **[§2.12](#212-application-state-ownership--resolving-the-localstoragemock-contradiction) resolves which of these are ported as-is and which are properly implemented or deleted**, and it must be settled before P7 wave 4. It is not left to the implementing agent to choose.

**The localStorage key set is closed and small** — 7 application keys plus the implicit Supabase auth token:

| Key | Written by | Read by | Backing store after migration |
|---|---|---|---|
| `recentActivity` | `lib/activity.ts` (all mutations) | `lib/activity.ts` | none (mock) — see §11 Q6 |
| `voiceform_dashboard_settings` | `Dashboard.tsx:214` | `Dashboard.tsx:93` | none — see §11 Q5 |
| `scheduler_settings_<user.id>` | `SchedulerSettings.tsx:194` | `SchedulerSettings.tsx:169` | none — see §11 Q5 |
| `pendingInvites` | `InviteMemberModal`, `TeamMembersModal` | `TeamMembersModal` | none (mock) |
| `teamMembers` | `TeamMembersModal` | `TeamMembersModal` | none (mock, pre-seeded) |
| `reviewQueueItems` | `ReviewQueueModal` | `ReviewQueueModal` | shadows `template_reviews` |
| `templateReviews_<templateId>` | `Team/TemplateReviewModal` | `Team/TemplateReviewModal` | shadows `template_reviews` |

### 1.13 Hardcoded URLs and environment variables

| Value | Where | Problem |
|---|---|---|
| `http://localhost:3001` | `services/ai.ts:91`, `services/ai.ts:173`, `AIVoiceAutoFill.tsx:13` | Breaks in any deployed build |
| `import.meta.env.MODE === "development" ? "http://localhost:3001" : ""` | `App.tsx:33` | Third copy of the same base URL, and `API_BASE` is **unused** in the file |
| `VITE_API_URL` | `.env` (value present), **absent from `.env.example`** | Advertised but never read by any source file |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | `.env`, `.env.example` | Shipped to the browser (expected for anon key) |
| `VITE_GROQ_API_KEY`, `VITE_LLAMA_API_KEY`, `VITE_LLAMA_API_URL`, `VITE_GROQ_API_URL` | `.env`, `.env.example` | 🔴 **Secret in the browser bundle** |
| `VITE_GOOGLE_CLOUD_PROJECT_ID/PRIVATE_KEY/CLIENT_EMAIL` | `.env.example` only | Intended but unused; `config/credentials.ts` reads the JSON file instead |
| `GOOGLE_PRIVATE_KEY`, `GOOGLE_CLIENT_EMAIL`, `GROQ_API_KEY` | `.env` (non-`VITE_`, so not browser-exposed) | Server-side keys that the current Express code does not actually read (it uses `service-account.json`) |
| `https://your-production-domain.com/reset-password` | `lib/supabase.ts:92` | 🔴 Placeholder shipped in PROD builds |
| `https://github.com/DanielWill-1/Audentra` | `Dashboard.tsx:55` and several pages | Product/repo identity is "Audentra"; the folder and `package.json` name say `VoiceForm`/`vite-react-typescript-starter` |

`.env` is correctly listed in `.gitignore` and is **not** tracked. Good — and it should be the model for the Python configuration too.

### 1.14 Dead, duplicated, empty and broken code

| Item | Kind | Action in migration |
|---|---|---|
| `src/components/**` — 8 files, 1,587 lines (`Dashboard/RecentActivity`, `Dashboard/TeamTemplates`, `Scheduler/UpcomingEvents`, `Scheduler/ScheduleStats`, `Stats/StatsCard`, `Team/TemplateReviewModal`, `TemplateBuilder/TemplateReviewModal`, `TemplateBuilder/ShareTemplateModal`) | **Dead components** — no import outside `components/`; verified by grep | Do not port. Lift any useful markup directly out of `Dashboard.tsx` / `Scheduler.tsx`, which already render equivalent data inline |
| `Team/TeamMembersModal.tsx` | Imported and rendered but **unreachable** — `setShowTeamModal(true)` is never called (`Dashboard.tsx:85` vs `:871,873`) | Do not port as-is; flag as a product question (§11 Q7) |
| `server/routes/transcribe.ts` (208 lines) | Dead — never imported by `server/index.ts` | Do not port |
| `src/lib/aiVoiceService.ts` (347 lines) | Dead — imported by nothing | Do not port |
| `src/lib/supabaseClient.ts` (6 lines) | Duplicate client, no env guard (still *used*, so not dead) | Delete after `filled_templates` moves |
| `src/components/TemplateBuilder/ShareTemplateModal.tsx` | **Empty (0 bytes)** | Delete |
| `new pages/singup.html` | **Empty (0 bytes)** | Ignore |
| `services/ai.ts::extractDataFromText` | Dead function | Do not port |
| `lib/supabase.ts::getCurrentUser` | Dead export | Do not port |
| `lib/scheduler.ts::getEventStats` | Exported but imported by nothing (its only consumers were the dead `ScheduleStats.tsx`) | Do not port; fold the aggregate into the scheduler view |
| `Team/TemplateReviewModal.tsx` vs `TemplateBuilder/TemplateReviewModal.tsx` | Near-duplicate pair (481 + 388 lines), **both dead** | Collapse to one review fragment, using the builder variant as the UX reference |
| `TemplateBuilder/TemplateCard.tsx` vs `Team/SharedTemplateCard.tsx` | Near-duplicate pair (~80% identical), **both live** | Collapse to one partial with a variant flag |
| `lib/activity.ts::formatTimeAgo` vs `SharedTemplateCard.tsx:110` | Duplicate time formatter | Collapse into a Django template filter |
| `lib/scheduler.ts::getEventStats` vs `ManageSchedules.tsx:295` | Shadowed duplicate aggregate logic | Collapse to one |
| `Team/TemplateReviewModal.tsx:306` | Renders `<AlertTriangle>` without importing it — would throw if mounted | N/A (dead) |
| `TeamMembersModal.tsx:19` | Dead `supabase` import | Drop |
| `App.tsx:33` `API_BASE` | Unused constant (third copy of the localhost URL) | Drop |
| `RecentActivity.tsx:197` | Links to `/activity`, which is not a route (it is `/activitylog`) | N/A (dead) |
| `Login.tsx:209-212` | "Keep me signed in" checkbox wired to no state or storage — purely cosmetic | Do not port as a no-op; either implement or remove (§11 Q8) |
| `Contact.tsx` | Form has **no submit handler and no network call** | Port as-is (parity) or wire it up as a separate change |
| `archive/` | Stale Vite artefact | Delete |
| `.commandcode/` | Empty template dir | Delete |
| `App.tsx:38-42` lowercase `components/team` import | Case-sensitivity bug — works on Windows, **fails on Linux/Docker** | N/A (file deleted), but it means the current app cannot build in Linux CI |

**Total identified dead code: ~2,150 non-blank lines (≈12% of application source)** — 1,587 component lines, 347 `aiVoiceService` lines, ~208 dead Express route lines, plus scattered dead functions and constants.

### 1.15 Secrets and credential handling

| Finding | Evidence | Severity |
|---|---|---|
| **A Google Cloud service-account private key is committed to git** | `service-account.json` (2,399 B, fields include `private_key`, `private_key_id`) is tracked — confirmed by `git ls-files`. `.gitignore` does not exclude it. | 🔴 **Critical** |
| **The same key is copied into the published build artefact** | `package.json` script `copy-service-account: cp service-account.json dist/`; `dist/service-account.json` (2,399 B) exists on disk | 🔴 **Critical** |
| The key is imported into the **client module graph** | `config/credentials.ts:1` → `config/api.ts:1` → `services/ai.ts:7` | 🟠 High — currently **not** in the built bundle (see below), but only by accident |
| **The Groq API key is in the shipped client bundle** | `VITE_GROQ_API_KEY` (`config/api.ts:15`). Static check of the present build output: `dist/client/assets/index-DnWuFiMr.js` (743,867 B) **contains a `gsk_…` string**. | 🔴 **Critical** |
| A **database backup dump** is committed | `backups/db_cluster-12-08-2025@20-15-27.backup` (329,496 B) and `.gz` — both tracked | 🔴 **Critical** (likely contains user PII) |
| `helpers` for API keys exist but are unused | `config/api.ts:18-19` `LLAMA_API_KEY` / `LLAMA_API_URL` — imported nowhere | 🟡 Hygiene |

**An important correction to an earlier informal assessment.** The service-account key is **not** currently present in the built JS bundle. Static inspection of `dist/client/assets/index-DnWuFiMr.js` returns 0 matches for `BEGIN PRIVATE KEY`, `private_key`, `token_uri`, `client_email` and `service_account`. The reason is incidental: `services/ai.ts` imports `GOOGLE_CLOUD_CONFIG` but never uses it (it calls the local Express API instead), so the bundler tree-shook the whole `credentials.ts` → `service-account.json` module away. **This is luck, not design**: the moment any code reads `GOOGLE_CLOUD_CONFIG`, the private key is inlined into a public asset. The correct classification is "committed secret + published in `dist/`", not "leaked in the bundle" — and it must be rotated regardless, because git history is forever.

Also noted: `.env` contains a plaintext `GOOGLE_PRIVATE_KEY` entry whose stored length (23 characters) suggests a placeholder rather than a real key. **This must be verified by a human** before remediation is considered complete (§7).

### 1.16 Build, deployment and testing tooling

| Concern | State |
|---|---|
| Frontend build | `vite build` → `dist/client`. Production bundle: 743,867 B JS + 51,985 B CSS. |
| Backend build | `tsc` using the **root** `tsconfig.json`, which includes only `server/**/*.ts` (`tsconfig.json:14`) → `dist/server`. **The frontend is never type-checked** by the build script. |
| Start | `npm start` → `node dist/server/index.js`; Express serves `../client` relative to `dist/server` = `dist/client`. Correct, but fragile. |
| Dev | `npm run dev` (Vite, 5173) + `npm run server` (ts-node, 3001) — two processes, hardcoded cross-origin calls |
| Tailwind | v3 via PostCSS (`postcss.config.cjs`), config `tailwind.config.js` exporting tokens (`primary #004ac6`, `voice #7C3AED`, full `surface-*` ramp, `display-hero`/`headline-h2`/`body`/`metadata` type scale, `section-*`/`margin-*` spacing). **This file is the design system and must survive the migration intact.** |
| Fonts | Google Fonts: Hanken Grotesk + JetBrains Mono, loaded from `index.html:16-19` |
| **Tests** | **None.** Zero `*.test.*` / `*.spec.*` files; no `vitest`/`jest`/`playwright.config.*` anywhere. `playwright` is a devDependency used only by `scripts/screenshot.js`. |
| Screenshot tooling | `scripts/screenshot.js` (169 lines) discovers routes by regex over `src/App.tsx`, starts the dev server, and captures full-page PNGs at 1440×900 with a 3-attempt retry. Emits 24 routes (its own fallback list omits `/activitylog`). **Reusable in Python via Playwright-for-Python.** |
| CI | **None.** No `.github/`. |
| Deployment config | **None.** No Dockerfile, `vercel.json`, `netlify.toml`, `Procfile`, `render.yaml`, `fly.toml`, `app.yaml` or `docker-compose.yml`. |
| Lint | ESLint 9 flat config (`eslint.config.js`), `typescript-eslint`, react-hooks, react-refresh |
| Editor/AI config | `.bolt/prompt` (design instruction: "beautiful, not cookie cutter"; JSX + Tailwind + lucide-react only), `.commandcode/taste/taste.md` (empty) |

The absence of tests and of any deployment configuration is load-bearing for the plan: **P1 must build the parity harness from scratch, and P10 must invent the deployment story rather than port it.**

### 1.17 Findings that change the migration's scope

These are the audit results that alter what a "migration" has to mean:

1. **The backend is trivial; the frontend is the project.** 403 lines of Express versus 17,055 lines of React. A Python backend alone leaves 93% of the codebase untouched.
2. **Business logic lives in the browser.** All 38 Supabase data call-sites, all AI orchestration, and all ownership stamping are client-side. Moving them changes *where authority lives*, which is the actual difficulty — not the porting of any individual function.
3. **`lib/templates.ts` is an existing service layer.** 21 exported functions with a consistent shape. This is the strongest structural asset for the migration and should be ported function-for-function to preserve behaviour.
4. **Three tables have no DDL.** `template_shares`, `template_reviews`, `filled_templates` cannot be recreated from the repo. **The live schema must be reconciled (P5a) before any data-access work can start.** This is the hardest blocker in the plan, and it is explicitly *not* solved by guessing `CREATE TABLE` statements.
5. **Eleven write call-sites target tables whose RLS denies writes.** Whether the live database has additional policies not in the repo is unknown **[unverified]**.
6. **Several features are cosmetic.** Team, invites, review queue and activity are localStorage mocks — and the plan does **not** preserve the mocks for parity's sake; they are implemented or deleted by explicit decision (§2.12).
7. **No tests, no CI, no deploy config.** Everything about verification and deployment is greenfield.
8. **There is no error handling contract.** Failures surface as `setError('...')` strings and `console.error`. Django needs a deliberate design (messages framework + HTMX error fragments) or behaviour will drift.
9. **The product identity is inconsistent** (Audentra vs VoiceForm) and the repo has no LICENSE file despite `README.md:171` acknowledging that.

---

## 2. Target architecture

### 2.1 Principles

1. **Server owns truth.** Every write path goes through Django. The browser never holds a Supabase credential after P11.
2. **Preserve behaviour, not implementation.** Route paths, page copy, visual design, data semantics and observable behaviour are preserved. React component structure is explicitly *not* preserved.
3. **RLS remains the last line of defence.** The data-access design (§2.5) is chosen so that a missing scoping filter in Django is caught by Postgres, not by the user.
4. **JavaScript is opt-in and enumerated.** Every JS module must have a documented reason in [§6](#6-what-cannot-or-should-not-be-converted-to-python). No JS by default.
5. **Small reversible steps.** Twelve phases (P0–P11). Each ends in a state that can be shipped or reverted. The old stack stays runnable until P11.
6. **Parity is measured, not asserted.** Golden screenshots, route-matrix tests, RLS scenario tests, and dual-run data comparisons (§8).
7. **No behaviour "improvements" smuggled into the migration.** Fixes go in P0 (security) or in a follow-up backlog (§11), never silently inside a parity phase.

### 2.2 Layer ownership

| Concern | Owned by | Rationale |
|---|---|---|
| Routing, URL structure | **Django URLconf** | Replaces `react-router-dom`; gives real 404s, real redirects, server-rendered links |
| Page rendering / HTML structure | **Django templates + HTMX attributes** | Replaces JSX. Jinja-style inheritance (`base.html`, `partials/`) replaces component nesting |
| Visual design system | **Tailwind CSS, unchanged tokens** | `tailwind.config.js` content globs re-point to `templates/**`; no token changes |
| Business logic (templates, shares, reviews, events) | **Django services/selectors** (Python) | Ported function-for-function from `lib/templates.ts`, `lib/scheduler.ts` |
| Validation | **Pydantic v2 + Django forms/ModelForms** | Replaces TypeScript interfaces (which validate nothing at runtime) |
| AI orchestration (Groq prompt, extraction, field mapping) | **Python service layer** | Removes the API key from the browser |
| Speech-to-text / text-to-speech | **Python service layer → Google Cloud** | Direct port of `server/routes/*.ts` using `google-cloud-speech` / `google-cloud-texttospeech` |
| Auth orchestration (sign-in, sign-up, OAuth, reset) | **Django views + GoTrue HTTP API** | Session ownership moves to Django; identity stays with GoTrue (§2.4) |
| Database access | **Django (psycopg 3 + ORM) as the `authenticated` role with the user's JWT claims** | Preserves RLS while keeping the ORM (§2.5) |
| File storage | **Django view → Supabase Storage (user JWT) or S3 session token** | Preserves RLS on `storage.objects` |
| Session/cookie handling | **Django sessions, `HttpOnly`, `SameSite=Lax`** | Replaces localStorage tokens |
| Microphone capture, audio encode/playback | **Small vanilla JS module** | Irreducible (§1.11) |
| Clipboard, file picker, scroll, focus | **Native HTML where possible; ≤30 lines of JS otherwise** | §2.8 |
| Background jobs (later) | Not in scope today; `django-q`/`rq` when reminders are implemented | `scheduled_events.reminder_minutes` exists but nothing sends reminders today |

### 2.3 The Supabase decision

Three options were considered.

**Option A — Supabase stays exactly where it is; only the backend becomes Python.**
Rejected as the target: it leaves all business logic in the browser, so it fails the stated goal. It is, however, exactly **P2–P3** of this plan, which is why those phases are useful on their own.

**Option B — Supabase remains the host for Postgres + Auth + Storage; Django owns all application access. (RECOMMENDED)**
- Postgres and RLS stay exactly as they are.
- GoTrue remains the identity provider, so existing password hashes, confirmed emails, and OAuth identities keep working and no user has to reset anything.
- Storage stays in the `template-files` bucket.
- Django becomes the only application client: it holds the service configuration, obtains user tokens server-side, and executes user-scoped queries with RLS enforced.
- The browser keeps **no** Supabase credential.

**Option C — Leave Supabase entirely: self-host Postgres, replace GoTrue with Django auth (`django-allauth`).**
Rejected for now, and explicitly deferred: it invalidates every existing password hash (forcing a global password reset), requires re-implementing OAuth identity linking, and requires re-implementing every RLS policy as ORM scoping with no database-level backstop. It is a *possible future* migration once Django ownership is proven, and Option B keeps the door open because Django talks to ordinary Postgres.

**Recommendation: Option B**, staged. Concretely:

| Responsibility | Before | After | Preserved? |
|---|---|---|---|
| Postgres hosting, schema, triggers | Supabase | Supabase | ✅ unchanged |
| RLS policies | Supabase | Supabase, **unchanged and still enforced** | ✅ unchanged |
| Identity / password hashes / OAuth identity | GoTrue | GoTrue | ✅ unchanged |
| Session token ownership | browser localStorage | Django session cookie; tokens held server-side | ⚠️ improved, see §2.4 |
| Table access | browser + anon key | Django only | ⚠️ deliberate change |
| Storage bucket `template-files` | browser + anon key | Django only, using the user's JWT | ⚠️ deliberate change |
| Anon key in browser | yes | **no** | ✅ security win |

**Explicit consequence to accept:** after the migration, the browser cannot talk to Supabase directly. That is the point, but it means the anon key can be rotated/disabled for browser use, and it removes an entire class of client-side trust bugs (see §1.8 on client-supplied `created_by`).

### 2.4 Auth and session design

**Identity stays with GoTrue. Session authority moves to Django — but only for Django-rendered routes, and only as they migrate.**

This distinction is load-bearing and was wrong in v0.1 of this document. During the migration the application is **two applications sharing one database**, and both must be able to authenticate the same users:

| Period | Django-rendered routes | Still-React routes |
|---|---|---|
| P0–P3 | none | authenticated by the browser Supabase session |
| P4–P7 (dual stack) | Django session cookie | authenticated by the browser Supabase session |
| P7 end – P10 | Django session cookie | (only routes not yet migrated) |
| P11 | Django session cookie | none — the SPA is gone |

**Therefore: Django auth is built and validated *in parallel* in P4; the legacy SPA is explicitly allowed to keep its browser Supabase session until its own protected routes are migrated.** "No Supabase token in the browser" is **not** a P4 gate — it is a **late-P7/P10 gate for Django-rendered routes** and a **P11 gate for the application as a whole** (§5 P11).

**Dual auth on `/api/*` during the transition.** Because the React voice page (`AIVoiceAutoFill`) is not migrated until P7 wave 7, the Django speech/AI endpoints must accept **either**:

1. a **Django session cookie** (Django-rendered callers), **or**
2. a **Supabase access token presented as `Authorization: Bearer <jwt>`** — validated server-side against GoTrue's JWKS / `GET /auth/v1/user` (the still-React caller).

This window is deliberate, documented, and **has an end date: P11 deletes the bearer path.** It is not a hidden bridge: it is one authentication class with two accepted credential types, tested in both modes. See [P3](#p3--python-service-layer) and [P4](#p4--auth-and-session-migration).

| Flow | Design (Django-rendered routes) |
|---|---|
| Password sign-in | `POST /login` → Django calls `POST {SUPABASE_URL}/auth/v1/token?grant_type=password` **server-side** → stores `access_token`/`refresh_token`/`sub` in the Django session → sets the session cookie. The Django-rendered page never sees a token. |
| Sign-up | `POST /signup` → Django calls `POST {SUPABASE_URL}/auth/v1/signup` with the same metadata → GoTrue sends the confirmation email → the existing trigger creates the `public.users` row. |
| Email confirmation | GoTrue link carries `{{ .TokenHash }}` → Django `GET /auth/confirm/?token_hash=…&type=signup` calls `/auth/v1/verify` and establishes the session. |
| **OAuth (Google, Azure)** | **PKCE is mandatory — the implicit flow is not an option.** Django generates a `code_verifier`/`code_challenge`, stores the verifier in the session, redirects to GoTrue's authorize URL with `code_challenge_method=s256` and `redirect_to=${SITE_URL}/auth/callback`, then exchanges the returned `code` for tokens server-side. Rationale: server-side code **cannot read URL fragments**, so the implicit flow is structurally unusable here. **The `microsoft` provider id must be corrected to `azure`** — see §1.9 defect 4. |
| Token refresh | A **service-layer helper** refreshes the access token near expiry using the stored refresh token and re-stores it, guarded per-session against concurrent refresh races. |
| Sign-out | `POST /logout` flushes the Django session and calls `/auth/v1/logout`. Legacy SPA sign-out remains `supabase.auth.signOut()` until its routes migrate. |
| Password reset | `POST /forgot-password` → GoTrue `recover`. **The email template must be changed** from `{{ .ConfirmationURL }}` to a link carrying `{{ .TokenHash }}`, so the token arrives as a plain query parameter (`?token_hash=…&type=recovery`) that Django can read server-side. Django calls `/auth/v1/verify` and renders the set-password form. |
| Set new password | Django calls `PUT /auth/v1/user` with the verified user's token. |
| Route protection | `LoginRequiredMixin` on Django views, replacing per-page `if (!user) return null;`. Deliberate behaviour change (redirect to `/login?next=…` rather than a blank page) — flagged in §11. |

**What `request.user` actually is.** There is **no Django user model** and no `django.contrib.auth` `User` in the application path (see the state decision below). `request.user` is a frozen dataclass principal hydrated by `apps/accounts/middleware.py`:

```python
@dataclass(frozen=True)
class SupabaseUser:
    id: uuid.UUID            # == auth.users.id == public.users.id
    email: str
    user_metadata: dict
    is_authenticated: bool = True
    is_active: bool = True
    is_anonymous: bool = False
    @property
    def pk(self) -> uuid.UUID: return self.id
```

`AnonymousSupabaseUser` is the same shape with `id = None`, `is_authenticated = False`. This satisfies `django.contrib.auth.mixins.LoginRequiredMixin` and `@login_required` (which only require `is_authenticated`), while avoiding `django.contrib.auth`'s model machinery — `django.contrib.auth.login()` is **not** used, because it stores `user._meta.pk.value_to_string(user)` and would require a real model. Session establishment is done explicitly: `request.session.cycle_key()` plus a call into `apps.accounts.services.tokens`.

**The principal deliberately carries no credentials.** An earlier draft put `access_token` on this object; that is removed. `request.user` is routinely rendered by templates, logged, serialised in error reports and exposed to debugging tools, so a bearer token on it would spread the token's blast radius across every place a user object is displayed. The rule:

| Holds | Where |
|---|---|
| `id`, `email`, `user_metadata`, auth flags | `request.user` (safe to render) |
| `access_token`, `refresh_token`, `expires_at` | **`apps/accounts/services/tokens.py` only** — the session-backed server-side store |
| Claims used for RLS | built on demand inside `rls_context()` from the principal's `id` |
| Token for Storage / GoTrue calls | requested from the token service at the call site, held in a local variable |

`apps/storage/services.py` and `apps/accounts/services/gotrue.py` therefore call `tokens.get_access_token(request.session)` rather than reading anything off `request.user`. A test asserts that no rendered page or log line can contain `access_token`/`refresh_token`, and that the principal has no such attribute.

**Where Django's own state lives (new decision — §11 Q19).** Django needs tables for sessions and migration bookkeeping. These must **not** be mixed into the `public` schema alongside Supabase's application tables. The plan adopts:

| Django-owned object | Where | Why |
|---|---|---|
| `django_session` | **dedicated Postgres schema `django`** | Session rows are Django's, not the application's; keeping them out of `public` prevents accidental exposure through PostgREST and keeps the Supabase surface unchanged |
| `django_migrations` | same schema | Bookkeeping |
| Application tables (`templates`, …) | `public`, `managed = False` | Owned by Supabase migrations, never by Django |
| Identity | GoTrue `auth.users` (Django never writes it) | Unchanged |

Mechanically: the Supabase connection uses `OPTIONS: {"options": "-c search_path=django,public"}` for Django's own tables, and the RLS-scoped application connection pins `search_path=public` inside its transaction. `django.contrib.admin` is **not** enabled initially (it would drag in `auth_user`, `auth_permission` and `django_content_type`); if operational admin is wanted later it is a separate, explicit decision (§11 Q20). An alternative — **Redis/cache-backed sessions** (`SESSION_ENGINE = django.contrib.sessions.backends.cache`) — removes `django_session` entirely and is preferred **if** a Redis instance is available; the difficulty table assumes the database schema approach.

**Gap to solve:** the current `public.users` row is created by a DB trigger that ignores `company`/`industry`. Django writes those columns on first login (an idempotent "profile completion" step) — additive, resolves §1.9 defect 6 without touching existing rows.

### 2.5 Data-access design

**Chosen: Django ORM + psycopg 3, with every authenticated query executed inside an explicit, verified RLS transaction context.**

The SQL pattern is unchanged from v0.1 — and Supabase now documents this exact pattern for RLS-scoped direct PostgreSQL access, so the architecture is externally validated rather than assumed:

```sql
BEGIN;
SELECT set_config('request.jwt.claims', '{"sub":"<uuid>","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
-- application queries run HERE, subject to RLS
COMMIT;
```

`auth.uid()` reads `sub` out of `request.jwt.claims`, so every existing policy (`auth.uid() = created_by`, the `users` self-update rule, the team-membership subqueries) evaluates exactly as it does for today's browser client. **RLS behaviour is preserved rather than re-implemented.**

**What changed in v0.2, and why it matters most.** v0.1 placed this in `config/middleware/db_claims.py`. **That is wrong**, and it is the most important technical correction in this revision:

- Django middleware runs **outside** the view's `ATOMIC_REQUESTS` transaction, and `process_response` runs **after** commit. `SET LOCAL` is transaction-scoped, so a value set in middleware is gone by the time the view queries — or worse, applies to an unrelated transaction on a pooled connection.
- Template rendering can also occur outside the intended transaction.
- A "best effort" middleware therefore produces **silent, intermittent RLS bypass**: queries that run without claims are not rejected, they simply match fewer rows — or, if a stale/absent claim yields a NULL `auth.uid()`, they fail silently in ways that look like empty data.

**Required design: an explicit RLS access context, not middleware.**

```
apps/db/rls.py
├── rls_context(user, *, using="supabase")     # context manager / decorator
│     opens transaction.atomic(using=using)
│     on the SAME connection executes:
│         set_config('request.jwt.claims', <json>, true)
│         SET LOCAL ROLE authenticated
│         SET LOCAL search_path = public
│     marks a ContextVar as ACTIVE for the duration
│     yields; COMMIT (or ROLLBACK) resets everything automatically
├── require_rls_context()                       # raises if not ACTIVE
└── class RLSQueryGuard                         # DB wrapper hook: every query on
                                                # alias "supabase" MUST have an
                                                # ACTIVE context, else raise
                                                # UnauthenticatedQuery
```

Non-negotiable properties:

1. **Same connection, same transaction.** The claims, the role and every application query execute inside one `transaction.atomic(using="supabase")` block. Nothing is set outside it.
2. **Fail closed, structurally.** `RLSQueryGuard` (wired through `connection_created`/a `DatabaseWrapper` subclass, or a thin `apps/db/router.py` plus a queryset wrapper) raises **`UnauthenticatedQuery` at query time** if a query targets the `supabase` alias while no context is active. It is not a convention or a code-review rule; an un-scoped query cannot execute. A test asserts this by issuing a raw query outside the context and expecting the exception.
3. **Two database aliases, two roles.** `default` → Django's own tables in the `django` schema (service role, **no** claims ever set). `supabase` → application tables (`public`), **only** usable inside `rls_context`. Mixing them is a configuration error; a test asserts `django_session` is unreachable via the `supabase` alias.
4. **No service-role connection on any request path.** The service role exists only in `apps/db/admin_ops.py`, used by management commands, the reconciliation phase and backfills — never importable from a view. A test asserts no view module imports it.
5. **Prepared once, verified always.** `set_config` uses a parameterised `%s`, never string interpolation, so a hostile `sub` cannot inject SQL into the claims JSON.

**Verify before committing (P5b gate, not an assumption):** that the connecting role may `SET LOCAL ROLE authenticated`; that `SET LOCAL` survives Supabase's pooler in **transaction** mode (it should — the setting is transaction-scoped and PgBouncer in transaction mode keeps one transaction on one connection); that `auth.uid()` resolves from `request.jwt.claims`; and that the guard actually fires. **This is the single highest-risk technical assumption in the plan.** Fallback if it fails: Option B2.

**Option B2 (fallback): service-role connection + ORM scoping.**
Every ownership filter becomes explicit application logic:
- `templates`: `filter(created_by=request.user.id)` on every read; `created_by=request.user` on every write.
- `scheduled_events`: same via `created_by`.
- `template_shares` / `template_reviews`: **must not** be scoped by `created_by` (they have none) — scope via the parent template or `shared_by`/`reviewer_id`.
- `users`: **remove** the `USING (true)` SELECT policy first (§7).
Cost: RLS stops being a backstop, and each of the 38 call-sites becomes a security-critical line. Documented as the fallback only. Note that Option B2 also breaks the fail-closed property above, which is precisely why it is a fallback.

**Timestamps and ownership become server-authoritative.** Django sets `created_by`, `shared_by`, `reviewer_id`, `user_id` and `updated_at`; the client can no longer supply them. Closes §1.8's client-supplied-ownership class of bugs.

**The missing-DDL gap is handled by a dedicated phase, not by guessing.** v0.1 proposed authoring `CREATE TABLE` statements for `template_shares`, `template_reviews` and `filled_templates` from client code. That is unsafe: if those tables already exist in the live project, running such a migration is wrong, and a historical `CREATE TABLE` over an existing table is never acceptable. See **[P5a — Schema reconciliation](#p5a--schema-reconciliation-mandatory-before-any-data-access-work)**, which is a mandatory predecessor to P5b.

### 2.6 Validation and schema design

Today there is **no runtime validation** — TypeScript interfaces are erased and the DB `CHECK` constraints are the only guard. The plan introduces:

- **Pydantic v2 models** mirroring the DB `CHECK` constraints (templates category/visibility, events type/priority/status, shares role, reviews status), used by the service layer.
- **`form_data` contract.** This `jsonb` column holds `{ fields: [ { id, label, type, required, options? } ], ... }` and is consumed by `TemplateBuilderModal.tsx` and `AIVoiceAutoFill.tsx`. It gets a Pydantic model (`FormDefinition`) so the AI extraction service and the form renderer share one definition.
- **Strictness policy — important for parity.** Validation runs in **log-only strict mode** during P3–P9: payloads that the old app accepted must not start failing. A payload that violates the new model is logged as a warning, then passed through exactly as before. Strict mode is switched on only after the dual-run period, and that switch is a deliberate, separately-approved change (§11 Q9).

### 2.7 HTMX interaction patterns

Mapping the existing React interaction model onto HTMX:

| React pattern | Current example | Django + HTMX replacement |
|---|---|---|
| `useState` boolean modal + conditional render | `Dashboard.tsx:84-87` (five modals) | `hx-get="/templates/new/"` → swap a fragment into a single `<dialog id="modal">` container |
| Form submit with loading + error state | `TemplateBuilderModal.tsx` (769 lines) | `hx-post` → return the form fragment with errors, or `HX-Redirect` / `hx-swap-oob` on success |
| List + filter/sort | `Templates.tsx`, `ManageSchedules.tsx` | `hx-get` with query params, swapping the list partial |
| Delete with optimistic removal | `FilledTemplates.tsx:28-41` | `hx-delete` → return the list partial (or `hx-swap="outerHTML swap:200ms"` on the row) |
| Client-side search | `lib/scheduler.ts:271` (and the injection bug) | Server-side `icontains` with `hx-trigger="keyup changed delay:300ms"` |
| Loading spinner | `Loader2` + `isLoading` state | `hx-indicator` + a CSS spinner; `htmx.config.globalViewTransitions` where useful |
| Toasts / success banners | `setSuccess(...)` + `setTimeout` | `django.contrib.messages` + an OOB-swapped messages partial |
| Stats tiles | `getEventStats()` | Template include fed by one `.aggregate()` queryset |
| Multi-step flow (`AIVoiceAutoFill` steps) | `step` state (`:112`) | Server-rendered steps with `hx-post` between them; **except** the recording step, which is the JS bridge |

**Anti-patterns to avoid:** no `hx-*` attribute soup inside deeply nested markup (use partials), no HTMX for the audio capture loop, no HTMX-driven polling where a page reload is clearer.

### 2.8 Alpine.js usage policy

Alpine is allowed only for **local, presentational** state that has no server consequence:

**Allowed:** mobile nav drawer (`Dashboard.tsx:80`, `Header`), password show/hide toggles (`Login`, `Signup`, `ResetPassword`), disclosure/collapse sections, tab selection inside an already-rendered page, copy-to-clipboard buttons, "confirm before delete" prompts.

**Banned:** data fetching, form submission (use HTMX), any authentication logic, any ownership/authorization logic, anything that writes to the database.

**Not needed at all:** `ScrollToTop` (deleted), timestamp formatting (Django filters), `window.location.origin` (Django `request.build_absolute_uri`), route links (real `<a href>`), static page content.

Estimated Alpine footprint in the end state: **4–6 components, all under 15 lines each.**

### 2.9 The audio and media bridge design

This is the one place where JavaScript is genuinely load-bearing. Design goals: keep it small, keep it isolated, keep it dependency-free.

**Capture (replaces `MediaRecorder` + `FileReader` + base64):**

```
static/js/voice-recorder.js   (~80–120 lines, vanilla, no build step)
  • getUserMedia({ audio: { sampleRate: 16000, channelCount: 1,
                            echoCancellation: true, noiseSuppression: true } })
  • MediaRecorder('audio/webm;codecs=opus'), 1 s timeslice
  • On stop: build ONE Blob, POST it as multipart/form-data to /api/transcribe/
  • Emit CustomEvents: voice:start, voice:stop, voice:upload, voice:result, voice:error
  • Expose a <audio controls> preview via URL.createObjectURL
```

Improvements over the current path that reduce risk (each is a deliberate, reviewable change): multipart upload instead of base64-in-JSON removes a 33% size penalty and the 10 MB limit becomes a 20 MB body limit; `FileReader` disappears entirely; the upload is no longer a data URL, so Django uses `request.FILES`.

**Playback (TTS reply):** Django returns base64 audio as today; a `<audio controls src="data:audio/mp3;base64,…">` element in the swapped fragment plays it with **no JavaScript at all**. Keep the existing `data:` URL contract to preserve behaviour. (A later optimisation — `django-storages`-backed audio URLs — is out of scope.)

**Export/download:** replaces `lib/templates.ts:559-583` (`Blob` + synthetic `<a download>` + `createObjectURL`). Django returns `Content-Disposition: attachment` from a view. **This removes two browser APIs and one dead code path.**

**Clipboard:** keep a 3-line Alpine component for the three existing copy buttons, with a `<textarea>` fallback for non-secure contexts.

**Everything else on the §1.11 list is designed away**, not ported.

### 2.10 AI and speech service layer

| Component | Design |
|---|---|
| `apps/speech/services.py` | `transcribe(audio_file, mime_type) -> Transcript`, `synthesize(text, voice_options) -> bytes`. Direct port of `server/routes/transcription.ts` (74 lines) and `tts.ts` (170 lines), including the MIME→encoding map, the sample-rate rules, the 5,000-character TTS cap and the text-cleaning regex. Credentials from `GOOGLE_APPLICATION_CREDENTIALS` **env var or a secret store — never a file path relative to CWD** (fixes the `keyFilename: "service-account.json"` fragility). |
| `apps/ai/services.py` | `extract(user_input, form_definition, current_values, history) -> ExtractionResult`. Ports `processWithGroq` (`services/ai.ts:262-391`), including the **system prompt verbatim** (`ai.ts:283-308`), model `llama3-70b-8192`, temperature 0.3, `max_tokens` 2048, `top_p` 0.9. Keep the defensive parse (JSON.parse → regex extract). Groq key comes from Django settings, server-side only. |
| `apps/ai/schemas.py` | Pydantic `ExtractionResult(response: str, extracted_data: dict[str, Any])` and `FormDefinition`. |
| Field matching | Port `normalizeKey` (`AIVoiceAutoFill.tsx:185-199`) and `applyExtractedDataToForm` into a tested Python function — **this is business logic currently buried in a 757-line component** and is exactly what the migration is for. |
| `apps/speech/views.py` | `POST /api/transcribe/`, `POST /api/tts/`, `POST /api/ai/extract/` — all login-required, all CSRF-protected, replacing three unauthenticated hardcoded-localhost endpoints. |
| Provider abstraction | The dead `aiVoiceService.ts` shows ElevenLabs was once intended. Define a `SpeechBackend` protocol with a Google implementation now, so an ElevenLabs or local model can be added without touching views. Do **not** port the dead file. |
| Mocks | `MockSpeechBackend` / `MockAIBackend` under `settings.DEBUG` or an explicit `USE_MOCK_AI` flag, preserving the current mock-fallback behaviour (`services/ai.ts:274-280`) for local development without keys. |

### 2.11 Static assets and Tailwind

- `tailwind.config.js` keeps its **exact token set**; only `content` changes to `['./templates/**/*.html', './apps/**/templates/**/*.html', './static/js/**/*.js']`.
- Build with the **Tailwind standalone CLI** (a native binary, no Node required) driven by a Python management command or a Makefile target, so the runtime and CI do not need Node. `django-tailwind` is an alternative but pulls Node/npm into the build.
- Fonts stay as Google Fonts links in `base.html` (or are self-hosted later — out of scope).
- lucide-react becomes **inline SVG partials** (`templates/partials/icons/*.html`), a `{% include %}` per icon, or hand-rolled sprite. Icons used today: `Mic, Home, FileText, LayoutGrid, Activity, Users, Settings, BookOpen, LogOut, ArrowRight, ArrowUpRight, Plus, Calendar, CheckCircle, AlertCircle, Loader2, RefreshCw, Share2, MessageSquare, UserPlus, Github, Menu, X, Trash2, ArrowLeft, Brain, Zap, Lock, Eye, EyeOff, Shield, Search, Copy, Download, ChevronDown` and others. **Recommendation: a single SVG sprite file** generated once from the icon set actually used — this is a concrete, bounded task in P6.
- `public/favicon.svg` and `public/image.png` move to `static/`. `index.html`'s `<title>`/meta/description move into `base.html`.

### 2.12 Application state ownership — resolving the localStorage/mock contradiction

v0.1 of this plan contained a real contradiction, and this section resolves it:

- §6.1 estimated only ~110–150 lines of hand-written JavaScript in the end state, implying **no** localStorage islands; but
- §11 Q5 recommended *preserving* per-browser dashboard/scheduler settings, and Q6 recommended *preserving* the team / review-queue / activity localStorage mocks.

Both cannot be true. Recreating mock React-era architecture purely for parity would defeat the stated goal — maintainable application structure owned in Python — and would leave four features that *look* implemented but write nothing durable. **This revision takes the position that the contradiction is resolved by decision, not by deferral, and that both decisions require explicit sign-off (§11 Q5, Q6, Q21) because they are product changes, not migration mechanics.**

**Decision A — user preferences move to Postgres (recommended: approve).**

| Preference | Today | Target |
|---|---|---|
| Dashboard settings (`language`, `voiceSensitivity`, `aiProcessingSpeed`, `industrySpecialization`) | `localStorage['voiceform_dashboard_settings']`, **not per-user** | `public.users.preferences jsonb` (column already conceptually exists via `users.company`/`industry` sibling columns; add `preferences` in P5a's reconciliation if absent), or a new `user_preferences` table |
| Scheduler settings | `localStorage['scheduler_settings_<user.id>']` | same |

Consequences: settings follow the user across devices (an intentional improvement); no JS island; the write path becomes a normal HTMX form POST. This is a **behaviour change** and is listed as an intentional difference in §8.4.

**Decision B — mock and unreachable functionality is resolved per feature, explicitly, before P7 wave 4 (recommended: implement or delete — do not recreate the mocks).**

| Feature | State today | Options | Recommendation |
|---|---|---|---|
| Team members / invites | `teamMembers`, `pendingInvites` in localStorage; seeds 2 fake members; the real `teams`, `team_members`, `team_invites`, `team_activity` tables exist with correct RLS and **zero client usage** | (i) implement against the real tables; (ii) remove the UI | **Implement** — the schema and RLS already exist and this is the only mock that maps onto a real, correctly-policed data model. Bounded work; scope agreed before W4. |
| Review queue | `reviewQueueItems` shadowing the real `template_reviews` table | (i) implement against `template_reviews`; (ii) remove | **Implement** — the real table exists and `lib/templates.ts` already has the service functions. |
| Activity log (`/activitylog` + dashboard feed) | `recentActivity` localStorage, seeded with hardcoded fake items; **no table exists** | (i) add a table; (ii) remove the UI | **Decide explicitly** (§11 Q6). This is the only one requiring new schema. If the feed is not wanted, `/activitylog` is removed and the route count drops from 25 to 24 — which changes Appendix A, the route manifest and the 404 behaviour, so it must be settled **before P1's baseline is captured**. |
| `TeamMembersModal` | reachable but **never opened** (`setShowTeamModal(true)` is never called) | (i) implement; (ii) delete | **Delete**, unless Decision B row 1 is approved, in which case it becomes the real team UI. |
| 8 dead components | imported nowhere | — | **Not ported** (§1.14) |

**Effect on the JavaScript budget.** With Decisions A and B approved:

- Hand-written JS = the voice recorder module (~80–120 lines) + clipboard helper (~10 lines) = **~90–130 lines**, and **zero localStorage**.
- Alpine components = mobile nav drawer, password show/hide, disclosure sections, copy buttons = **4–5 components, under 15 lines each**.

If instead strict localStorage parity is chosen for preferences (Decision A rejected), add ~40–60 lines of JS plus 2–3 Alpine components, and the settings become permanently per-browser — which contradicts the maintainability goal. **The plan's cost estimates in §9 assume Decisions A and B are approved as recommended.**

---

## 3. End-state folder tree

```
audentra/
├── manage.py
├── pyproject.toml                    # uv/hatch; single source of deps
├── uv.lock
├── .env.example                      # no secrets, no VITE_ prefix
├── .gitignore                        # includes service-account.json, *.backup, dist/
├── Makefile                          # css, dev, test, migrate, e2e targets
├── README.md
├── LICENSE                           # Apache 2.0 (currently missing; see README:171)
├── Dockerfile
├── docker-compose.yml                # web + tailwind watcher (dev)
├── config/                           # Django project
│   ├── settings/
│   │   ├── base.py
│   │   ├── dev.py
│   │   └── prod.py
│   ├── urls.py                       # mirrors the 25 legacy routes exactly
│   └── asgi.py  wsgi.py
│   # NOTE: there is deliberately no config/middleware/ package.
│   #       Session hydration lives in apps/accounts/middleware.py (principal only).
│   #       Token refresh lives in apps/accounts/services/tokens.py.
│   #       RLS claims live in apps/db/rls.py, inside the query transaction — never in middleware.
├── apps/
│   ├── db/                            # RLS access layer — the security-critical module
│   │   ├── rls.py                     # rls_context(), require_rls_context(), RLSQueryGuard
│   │   ├── admin_ops.py               # the ONLY service-role path; never imported by views
│   │   ├── router.py                  # alias separation: default (django schema) vs supabase (public)
│   │   └── connections.py             # DatabaseWrapper / guard wiring
│   ├── api/
│   │   └── auth.py                    # dual credential check: Django session OR Supabase bearer (P3→P11)
│   ├── accounts/                      # auth orchestration (GoTrue client, no user model)
│   │   ├── services/gotrue.py         # GoTrue HTTP calls (password, signup, OAuth/PKCE, verify, recover)
│   │   ├── services/tokens.py         # THE ONLY holder of access/refresh tokens (server-side session store)
│   │   ├── principals.py              # SupabaseUser / AnonymousSupabaseUser — identity ONLY, no tokens
│   │   ├── middleware.py              # hydrates request.user (principal) from the session; no DB, no tokens
│   │   ├── selectors.py               # user preferences (§2.12 Decision A)
│   │   ├── views.py  urls.py  forms.py
│   │   └── templates/accounts/{login,signup,forgot_password,reset_password,confirm_email}.html
│   ├── core/                          # public marketing pages, base template, icons, health
│   │   ├── views.py  urls.py
│   │   └── templates/core/{home,features,industries,security,pricing,about,
│   │                       contact,status,help_center,documentation,
│   │                       terms,privacy,open}.html
│   ├── templates_app/                 # 'templates' is a Django keyword-adjacent name; keep the
│   │   ├── models.py                  #   URL path /templates/ but name the app distinctly
│   │   ├── selectors.py               # reads (ported from lib/templates.ts)
│   │   ├── services.py                # writes
│   │   ├── schemas.py                 # Pydantic: FormDefinition, TemplateIn, ShareIn, ReviewIn
│   │   ├── forms.py
│   │   ├── views.py  urls.py
│   │   └── templates/templates_app/
│   │       ├── list.html  card.html  detail.html
│   │       ├── partials/{builder_modal,review_modal,share_modal,card}.html
│   │       └── shared_list.html
│   ├── scheduler/
│   │   ├── models.py  selectors.py  services.py  forms.py  views.py  urls.py
│   │   └── templates/scheduler/{list,manage,settings,partials/*}.html
│   ├── dashboard/
│   │   ├── selectors.py               # the 5 dashboard queries, one place
│   │   ├── views.py  urls.py
│   │   └── templates/dashboard/{home,partials/*}.html
│   ├── voice/                         # AIVoiceAutoFill: capture → STT → extract → fill → save
│   │   ├── views.py  urls.py  services.py
│   │   └── templates/voice/{autofill,filled_list,partials/*}.html
│   ├── speech/                        # Google STT + TTS
│   │   ├── services.py  backends/{google.py,mock.py}  views.py  urls.py
│   ├── ai/                            # Groq extraction
│   │   ├── services.py  schemas.py  backends/{groq.py,mock.py}
│   ├── activity/                      # activity feed (see §11 Q6 for scope)
│   │   ├── services.py  views.py  urls.py
│   └── storage/                       # Supabase Storage upload/download proxy
│       ├── services.py                # user-JWT scoped, RLS respected
│       └── views.py
├── templates/                         # cross-app shell
│   ├── base.html                      # <title>, fonts, css, htmx, alpine, icons sprite
│   ├── base_public.html               # Header + Footer shell (13 public routes)
│   ├── base_app.html                  # sidebar app shell (11 app routes)
│   └── partials/
│       ├── header.html  footer.html  sidebar.html  mobile_nav.html
│       ├── messages.html  modal.html  pager.html
│       └── icons/sprite.svg
├── static/
│   ├── css/{input.css,dist.css}       # tailwind entry + built output (dist.css gitignored)
│   ├── js/
│   │   ├── voice-recorder.js          # THE audio bridge (§2.9) — the one substantial module
│   │   ├── clipboard.js               # ~10 lines, 3 buttons
│   │   └── vendor/{htmx.min.js,alpine.min.js}
│   ├── img/{favicon.svg,image.png}
│   └── data/pgp-key.asc               # Privacy page key, currently an inline TS constant
├── supabase/
│   ├── migrations/                    # existing 7 files: UNCHANGED, append-only
│   │   ├── 20250612153114_spring_water.sql
│   │   ├── 20250612154531_dry_lantern.sql
│   │   ├── 20250612155158_humble_fire.sql
│   │   ├── 20250614161822_turquoise_king.sql
│   │   ├── 20250628064052_twilight_disk.sql
│   │   ├── 20250628064557_aged_tree.sql
│   │   ├── 20250628065741_precious_brook.sql
│   │   └── <ts>_reconcile_<name>.sql   # NEW (P5a): guarded, idempotent, ADDITIVE only
│   ├── baseline/
│   │   └── 00000000000000_baseline.sql # NEW (P5a): intended end state for FRESH environments only
│   ├── schema_dump/                   # NEW (P5a)
│   │   ├── live-schema.sql            #   pg_dump --schema-only of the live project
│   │   ├── replayed-schema.sql        #   same, from a clean replay of the 7 migrations
│   │   ├── DIFF.md                    #   every delta classified D1–D5
│   │   └── live-data-inventory.md     #   row counts / null checks for the undelivered tables
│   └── config.toml                    # NEW: bucket + auth config intent (D4)
├── docs/
│   ├── tables.md                      # existing, keep
│   ├── prompt.md                      # existing, keep
│   ├── python-migration-plan.md       # THIS DOCUMENT
│   ├── schema-reconciliation.md       # NEW (P5a): what diverged and which artefact fixes it
│   ├── django-owned-state.md          # NEW (P2): the Q19 decision, recorded
│   ├── security-remediation.md         # NEW (P0): rotations, incidents, transitional controls
│   └── parity/{baseline,reports}/
├── scripts/
│   ├── schema_diff.py                 # NEW (P5a): normalise + diff two pg_dump outputs
│   ├── capture_baseline.py            # Playwright: authenticated state matrix
│   └── compare_screenshots.py
├── tests/
│   ├── conftest.py                    # RLS-impersonating fixtures
│   ├── unit/                          # services, selectors, schemas, field matching
│   ├── rls/                           # per-policy allow/deny matrix + fail-closed guard tests
│   ├── contract/                      # legacy base64-JSON vs multipart contract tests
│   ├── views/                         # Django test client, per route
│   ├── e2e/                           # Playwright-for-Python, the state matrix
│   └── fixtures/{groq,google_stt,google_tts}/*.json
├── design_reference/                  # renamed from 'new pages/' + 'page-screenshots/'
│   ├── html/*.html
│   └── screenshots/*.png
└── legacy/                            # TEMPORARY, deleted in P11
    ├── src/                           # the current React app, frozen
    ├── server/
    ├── scripts/
    ├── package.json  package-lock.json
    ├── vite.config.ts  tsconfig*.json  eslint.config.js  postcss.config.cjs
    └── README-legacy.md
```

**Naming notes.** The Django app that owns the `templates` table is called `templates_app` here to avoid confusion with Django's own template machinery, while **URL paths remain unchanged** (`/templates`, `/templates/<id>/`). Django's `TEMPLATES` setting and `templates/` directories are unrelated to the data concept; the collision is only cosmetic and worth avoiding in code.

---

## 4. Dependency list

### 4.1 Python runtime dependencies

| Package | Purpose | Replaces |
|---|---|---|
| `django` (5.x LTS) | Web framework, ORM, templates, sessions, messages | React + react-router + Express |
| `psycopg[binary]` (3.x) | Postgres driver used by the Django ORM **and** for the RLS transaction context (`SET LOCAL`/`set_config`) | `@supabase/supabase-js` (PostgREST) |
| `django-environ` (or `python-dotenv`) | Typed settings from `.env` | Vite's `import.meta.env` |
| `pydantic` (v2) | Validation for `form_data`, extraction results, service inputs | TypeScript interfaces (which validate nothing) |
| `httpx` | Server-side calls to GoTrue (`/auth/v1/*`), Groq, Supabase Storage REST | browser `fetch` |
| `PyJWT` + `cryptography` | Validating the legacy Supabase bearer token during the dual-auth window (P3–P11) | `supabase-js` token handling |
| `google-cloud-speech` | Speech-to-text | `@google-cloud/speech` |
| `google-cloud-texttospeech` | Text-to-speech | `@google-cloud/text-to-speech` |
| `groq` (or `openai` with `base_url`) | LLM extraction | browser → `api.groq.com` |
| `whitenoise` | Static file serving | Express `express.static` |
| `gunicorn` + `uvicorn` workers | Production WSGI/ASGI server | `node dist/server/index.js` |
| `django-redis` *(optional)* | Cache-backed sessions — removes the `django_session` table entirely (Q19) | — |
| `django-htmx` *(optional)* | Request/response helpers for HTMX | — |
| `boto3` *(optional)* | Supabase Storage via the S3 protocol with a session token | — |

**Deliberately not used:** `supabase-py`. Django talks to Postgres directly via `psycopg`, and to GoTrue/Storage over `httpx`. This avoids a second opinionated client layer and keeps the RLS context explicit. **Also deliberately not used: `django.contrib.auth`'s `User` model and `django.contrib.admin`** — see §2.4 and Q19/Q20.

**Non-Python tooling that is required:** the **Supabase CLI** (`supabase start` / `db reset` / `db dump`) for the local Supabase stack used in P1, P5a and P9. This is a local development and CI dependency, not a runtime one.

### 4.2 Python development dependencies

`pytest`, `pytest-django`, `pytest-cov`, `ruff` (lint + format), `mypy` + `django-stubs`, `playwright` (Python — golden screenshots and E2E), `pytest-playwright`, `responses`/`respx` (HTTP fixture mocking for Groq and GoTrue), `model-bakery` or `factory-boy` (test data), `django-debug-toolbar`, `pre-commit`.

### 4.3 Frontend assets (no build step, vendored)

| Asset | Size | Purpose |
|---|---|---|
| `htmx.min.js` | ~14 KB | Fragment swapping; the interaction layer |
| `alpine.min.js` | ~15 KB | The allowed local-presentational state (§2.8) |
| Tailwind CSS | standalone CLI binary | **Native binary — no Node required** |
| `voice-recorder.js` | ~100 lines, hand-written | The audio bridge (§2.9) |
| `clipboard.js` | ~10 lines | Three copy buttons |
| `icons/sprite.svg` | one file | Replaces `lucide-react` |

### 4.4 What happens to the Node toolchain

| Tool | Fate |
|---|---|
| `vite`, `@vitejs/plugin-react`, `react`, `react-dom`, `react-router-dom`, `lucide-react` | Removed in P11 |
| `express`, `body-parser`, `cors`, `@google-cloud/speech`, `@google-cloud/text-to-speech`, `@supabase/supabase-js` | Removed in P11 |
| `tailwindcss`, `postcss`, `autoprefixer` | Replaced by the standalone Tailwind CLI; PostCSS config is dropped |
| `typescript`, `ts-node`, `@types/*`, `typescript-eslint`, `eslint` | Removed in P11 |
| `playwright` (Node) | Replaced by Playwright-for-Python |
| **Node itself** | **Not required at runtime or build** once Tailwind runs from its standalone binary. This is a deliberate goal; the alternative (`django-tailwind` + npm) keeps Node alive and is listed in §11 Q12. |

---

## 5. Phased migration plan

### 5.0 Phase map

Thirteen phases: P0–P11, with P5 split into **P5a** (schema reconciliation) and **P5b** (data access) because they have different blockers, different artefacts and different rollback semantics.

| Phase | Name | Outcome | Difficulty | Ships independently |
|---|---|---|---|---|
| **P0** | Security & secrets remediation | Secrets rotated, history cleaned, live leaks closed | **S** | ✅ yes |
| **P1** | Behaviour/UI baseline & test capture | A real, authenticated **state matrix** exists on a Supabase environment | **M** | ✅ yes |
| **P2** | Django foundation | Django runs beside the SPA on two DB aliases; Django's own state isolated | **S** | ✅ yes |
| **P3** | Python service layer | STT/TTS/AI in Python, **contract-compatible with the legacy client**, differential-tested | **M** | ✅ yes |
| **P4** | Auth migration (parallel) | Django sessions for Django routes; **legacy Supabase session retained** | **L** | ⚠️ needs P2, P3 |
| **P5a** | Schema reconciliation | Live schema known; baseline + guarded additive migrations; **zero-delta proof** | **M–L** | ⚠️ needs live DB access |
| **P5b** | Data-access migration | All 38 call-sites behind Django, RLS enforced via a fail-closed context | **XL** | ⚠️ needs P4, P5a |
| **P6** | Shared UI/template components | Base templates, partials, modal macro, icon sprite, Tailwind, **allowlisted proxy** | **M** | ✅ after P2 |
| **P7** | Page-by-page migration | All routes served by Django in 7 waves | **XL** | ⚠️ per-wave |
| **P8** | Browser audio/media bridge | The one substantial JS module; browser switches to multipart | **M** | ⚠️ needs P3, P7 |
| **P9** | Testing & parity verification | Automated parity gate; every phase re-verified | **L** | ✅ continuous |
| **P10** | Deployment transition | Django deployed; legacy stack retired from production | **M** | ⚠️ needs P7, P9 |
| **P11** | Removal of React/TS/Express | `legacy/` deleted; legacy API contracts and the Supabase-bearer path deleted | **S** | ⚠️ needs P10 + soak |

Relative sizes are indicative only — see [§9](#9-estimated-relative-difficulty-per-phase) for the effort split.

---

### P0 — Security and secrets remediation

**Objective.** Close every live credential exposure and remove committed secrets **before** any architectural work. This phase is deliberately independent of the migration and should not wait for approval of the rest of this plan.

**Prerequisites.** None.

**Existing files affected.** `service-account.json` (untrack), `.gitignore`, `package.json` (`copy-service-account` script), `src/config/credentials.ts`, `src/config/api.ts`, `src/services/ai.ts`, `lib/supabase.ts`, `.env`, `.env.example`, `README.md`, `backups/`, `supabase/migrations/20250628064052_twilight_disk.sql`, `supabase/migrations/20250628065741_precious_brook.sql`, `src/lib/scheduler.ts`.

**New files.** `docs/security-remediation.md` (record of what was rotated, when, by whom); `supabase/migrations/20260630NNNNNN_security_hardening.sql` (policy fixes); `.env.example` rewrite.

**Work items** (each is a separately reviewable change; full list in [§7](#7-security-checklist--must-fix-before-migration-begins)):

1. **Rotate the Google Cloud service-account key** in GCP; review its audit log for unexpected use; delete the old key. **Rotation is the protection** — the history rewrite below is cleanup after an assumed compromise, and must not be treated as a substitute for it.
2. **Rotate the Groq API key** — it is confirmed present in the built client bundle (`gsk_…` in `dist/client/assets/index-DnWuFiMr.js`).
3. **Rewrite git history so that _every_ tracked blob containing any of the compromised material is gone** — not just the one file the example names. The scope is defined by a scan, and must cover at minimum:
   - `service-account.json` (the Google private key) in **all** revisions where it existed, including `dist/service-account.json` if it was ever committed;
   - the **built client bundle** containing the embedded `gsk_…` Groq key (`dist/` may be gitignored today but must be checked across history);
   - the committed **database dump** `backups/db_cluster-12-08-2025@20-15-27.backup(.gz)`;
   - `.env` **if it was ever committed in any earlier revision** (it is gitignored now, which says nothing about history);
   - any other blob the scan flags.
   Mechanically: `git filter-repo` (or BFG) driven by a **path + content list produced by a full-history scan**, then force-push, expire reflogs and run `git gc --prune=now` on the mirror, then require every contributor to re-clone. Keep a mirror backup of `.git` before rewriting.
4. **Run a full-history secret scan as the acceptance test** — `gitleaks detect --log-opts=--all` (or `trufflehog git --since-epoch`) over **all** refs and **all** revisions, plus a re-scan of the rewritten history. **Zero findings is the exit criterion**, and the scan is wired into CI/pre-commit so it cannot regress. Record the scan command and its output in `docs/security-remediation.md`.
5. **Untrack and delete the committed database dump** in `backups/` (329 KB `.backup` + `.gz`) — untrack, purge from history (item 3), and rotate the Supabase database password if the dump contains credentials or connection strings. If a private copy is wanted for local restore, store it outside the repository.
6. **Delete the `copy-service-account` script** and the `dist/service-account.json` artefact; stop publishing keys with the build.
7. **Delete `src/config/credentials.ts`** and its import in `src/config/api.ts`, so the key can never enter the client graph again.
8. **Fix the `users` SELECT policy** (`USING (true)` → self-scoped) — currently any authenticated user can read every user's email/name/company/industry.
9. **Fix `filled_templates` exposure** (no RLS today) — either add RLS + policies, or accept that **P5b** removes browser access and schedule the policy fix there. **Recommendation: add RLS now**, since the anon key remains public until P10. The table's DDL is established in P5a, not assumed here.
10. **Remove the PUBLIC-role duplicate policies** from `20250612155158_humble_fire.sql`'s effects (they add nothing but confusion).
11. **Replace the interpolated PostgREST filter** in `lib/scheduler.ts:275` with a parameterised query.
12. **Verify** whether `.env`'s `GOOGLE_PRIVATE_KEY` is a real key or a placeholder, and whether `.env` was ever committed in an earlier revision (item 3 covers the remediation if it was).

**Dependencies.** GCP console access, Groq console access, Supabase dashboard access, GitHub force-push rights. **All four are human-gated.**

**Data-flow change.** None — this phase changes no application behaviour.

**Risks.** Force-pushing history breaks every existing clone (mitigation: announce, coordinate, provide a re-clone script). Rotating the Google key breaks the current Express STT/TTS until the new key is deployed (mitigation: deploy the new `service-account.json` out-of-band, keeping it out of git; the `keyFilename` path is relative to CWD, so verify deployment CWD). Rotating the Groq key breaks the browser AI path until `.env` is updated (it currently has no server equivalent — mitigation: accept a brief voice-feature outage, or land P3's `/api/ai/extract/` first).

**Blockers.** Q4 (**is the GitHub repo public?** — if yes, treat the keys as already leaked and P0 becomes urgent), Q2 (are the Google/Groq keys still active?), Q15 (who owns the production secrets store?).

**Rollback.** Each rotation is reversible by issuing a new key. History rewriting is *not* reversible locally — take a mirror backup of `.git` before rewriting.

**Acceptance criteria.**
- **A full-history secret scan over all refs and all revisions returns zero findings** (`gitleaks detect --log-opts=--all` or `trufflehog git --since-epoch`), and the same scan passes on the rewritten history. This is the primary exit criterion.
- `git log --all -- service-account.json` and `git log --all -- backups/` return nothing; both are untracked and gitignored.
- A scan of history finds **no** revision containing a `gsk_…` string, a `BEGIN PRIVATE KEY` block, or the database dump.
- `grep -r "gsk_" dist/` and a fresh `vite build` contain no API key material.
- The Google key in GCP is new and the old key ID is disabled; the Groq key is new.
- The `users` SELECT policy is self-scoped; a test proves user A cannot read user B's row.
- `filled_templates` has RLS enabled and an owner-scoped policy.
- `docs/security-remediation.md` records the dates, actors, old and new key IDs, the history-rewrite scope, and the exact scan command with its output.

**Tests.** A pytest (or `psql`) script that authenticates as `authenticated` with user A's claims and asserts `SELECT count(*) FROM users` returns 1, not N. The full-history secret scan above, wired into CI and pre-commit so it cannot regress.

**Must remain untouched.** All application behaviour, all Supabase data, all RLS policies *other* than the two being fixed, and every file the migration will later port. P0 changes no UI and no business logic.

**Difficulty.** **S** — days. Almost entirely console work plus three small code changes.

---

### P1 — Behaviour/UI baseline and test capture

**Objective.** Build the measurement apparatus that makes every later phase verifiable. Because the repository has **zero tests, no CI and no deployment config**, this phase creates them from scratch.

**Prerequisites.** **P0, and Q21 answered** (activity log: make it real or delete it). Q21 must precede this phase because deleting `/activitylog` and the dashboard feed changes the route manifest from 25 routes to 24, and the manifest is the source of truth for the baseline, the proxy allowlist and the URLconf — capturing a baseline before that decision means re-capturing it afterwards. Q5/Q6 are **not** required here (they affect the W4 implementation, not the baseline of what exists today), but the baseline should note the current localStorage behaviour so the eventual change is measurable.

Note also that the screenshot harness must be able to authenticate, which needs a test account — the legacy Supabase sign-in works in P1, and P4 later adds a Django path without invalidating it.

**Existing files affected.** `scripts/screenshot.js` (read and reimplemented, not modified), `src/App.tsx` (the route source of truth), `page-screenshots/` (kept as a historical record; a new baseline supersedes it).

**New files.**
- `scripts/capture_baseline.py` — Playwright-for-Python.
- `tests/e2e/test_route_matrix.py` — asserts the Django URLconf covers exactly the 25 React routes (+ any deliberate additions).
- `tests/e2e/test_visual_parity.py` — screenshot comparison with a pixel tolerance.
- `tests/fixtures/` — a **seeded test user with representative data** (templates with `form_data`, shares, reviews, events, filled templates, an uploaded file).
- `docs/parity/baseline/*.png` — the golden set, committed.
- `docs/parity/README.md` — how to re-capture and how to interpret diffs.
- `.github/workflows/` (or equivalent CI) — lint, pytest, and an E2E job.

**Dependencies.** Playwright (Python), a running legacy stack (Vite + Express), a Supabase test project **or** a local Postgres with the migrations applied, Google Cloud + Groq credentials **or** the mock backends.

**Data-flow change.** None.

**Risks.**
- **The existing screenshots are not a usable baseline.** Several authenticated captures are byte-identical to `login.png` (e.g. `login.png`, `AIVoiceAutoFill.png`, `manage-schedules.png`, `scheduler.png`, `scheduler-settings.png` are all 208,612 B), which is what a logged-out visit to a guarded page produces — a blank page. **The current baseline therefore proves nothing about the authenticated app.** Re-capturing with a real session is the core deliverable of this phase.
- Seeding production-like data in a shared project risks polluting real data. Mitigation: a **dedicated staging Supabase project**, or the local Supabase stack.
- Playwright rendering differences across OS/font stacks cause false-positive visual diffs. Mitigation: run the baseline and the comparison in the same container image; compare with a per-region tolerance and masks, not byte equality.
- No CI exists to run any of this. Mitigation: this phase creates it.

**The baseline is a state matrix, not a single screenshot per route.** "A re-run produces a diff of zero" is not an achievable or meaningful acceptance criterion — rendering is not byte-stable. Capture the following matrix, and compare within tolerance with explicit masks:

| Axis | Values |
|---|---|
| Auth state | anonymous-public · anonymous-auth-pages · authenticated-app |
| Viewport | **desktop 1440×900** (the existing harness's viewport) · **mobile 390×844** (the app has a mobile drawer, `Dashboard.tsx:80`, and responsive breakpoints) |
| Data | one **seeded, stable fixture set** (templates with `form_data`, shares, reviews, events, filled templates, one uploaded file) — no production data |
| Time | **frozen clock** (Playwright `page.clock` / injected `Date`) so relative times ("2 hours ago") are deterministic |
| Motion | `prefers-reduced-motion: reduce` **and** CSS animations/transitions disabled |
| Masks | relative timestamps, absolute timestamps, avatars, generated UUIDs, the audio element's duration, chart randomness |

**Mitigation for a shared project, removed:** the fallback is **not** plain Postgres. It is a **local Supabase stack** (`supabase start`, CLI/Docker) — see the blocker below.

**Blockers.** B1: **a reachable Supabase environment and test credentials.** Given the DNS failure noted in `README.md:122`, this is a hard gate for the whole migration (§11 Q2, Q3).

- **Preferred fallback: the local Supabase stack** (`supabase start` / CLI + Docker), which reproduces GoTrue, `auth.uid()`, the `anon`/`authenticated`/`service_role` roles, Storage and Storage RLS. This is the **only acceptable environment** for parity, RLS and auth verification, because a plain Postgres instance reproduces none of those.
- **A plain Postgres instance is acceptable only for isolated ORM/unit tests** (model behaviour, migrations syntax, selector logic with RLS disabled or simulated). It is **not** a parity, RLS or auth environment, and no visual/behavioural baseline may be captured from it.

**Rollback.** Nothing is changed; new files are additive. Delete them.

**Acceptance criteria.**
- A single command brings up the legacy app against a seeded environment and captures the **full state matrix**, including **all 12 app routes while authenticated** (the current baseline captures none of them).
- A re-run reproduces the matrix with **diffs inside the agreed tolerance and only within masked regions**.
- A route-inventory test enumerates the routes from a single source of truth (a JSON manifest) that the legacy capture, the proxy allowlist and the Django URLconf are all checked against.
- CI runs the capture job and fails on regression.
- For every interactive flow (13 modals, 3 wizards, all CRUD), a documented manual checklist exists with at least a screenshot per step — automation where feasible, a written script where not.
- **The environment used is a real Supabase environment (staging project or local stack), and this is recorded in `docs/parity/README.md`.**

**Tests.** The baseline capture is itself the test. Additionally: an "app boots" smoke test, a "login works" test, and a "routes are reachable" test that asserts HTTP 200 and a non-blank body for every authenticated route (exactly what the existing baseline failed to prove).

**Must remain untouched.** The legacy application's behaviour. Any temptation to "fix" something discovered during capture must be deferred — record it, do not change it.

**Difficulty.** **M** — one to two weeks, dominated by environment plumbing (auth against Supabase from a script, seeding, CI).

---

### P2 — Django foundation

**Objective.** Stand up Django beside the existing app, serving nothing user-facing. Prove the toolchain, settings layout, database connectivity, static pipeline and deployment shape before any behaviour moves.

**Prerequisites.** P1 (baseline exists). **Q19 answered** — where Django's own state lives (§2.4) — because it determines settings, database aliases and the migration story from this phase forward. Note that **P2 only needs `SELECT 1` against the database**: the full schema picture is not required until P5a.

**Existing files affected.** None. The legacy app keeps running untouched. `.gitignore` gains Python entries.

**New files.** `manage.py`, `pyproject.toml`, `uv.lock`, `config/settings/{base,dev,prod}.py`, `config/urls.py`, `config/{wsgi,asgi}.py`, `apps/db/{router.py,connections.py}`, `supabase/bootstrap/django_app_role.sql` (idempotent: creates the `django` schema + the least-privilege `django_app` role; touches nothing in `public`), `templates/base.html`, `apps/core/` (stubbed; real content in P6), `Makefile`, `Dockerfile`, `docker-compose.yml`, `tests/conftest.py`, `.env.example` (rewritten, no `VITE_`), `docs/django-owned-state.md`.

**Dependencies.** All of §4.1. A decision on where Tailwind builds (§11 Q12). `psycopg` and, if Redis-backed sessions are chosen, `django-redis`.

**Data-flow change.** None to the application. Django is configured with **two database aliases** from day one (§2.5):

| Alias | Target | Role | Contents |
|---|---|---|---|
| `default` | `django` schema (`search_path=django`) | **`django_app` — a dedicated least-privilege login role** (see below) | `django_session`, `django_migrations` — Django's own bookkeeping only |
| `supabase` | `public` schema | `authenticated`, **only** inside an RLS context (P5b) | Application tables, `managed = False` |

**The `default` alias must not use `service_role`.** Supabase documents that `service_role` carries **`BYPASSRLS`** and full elevated access across the project. Using it for ordinary session and migration traffic would undermine the two-alias isolation this design depends on: a bug that misroutes a query, or a future contributor who "just adds" a read to the `default` alias, would silently bypass RLS for application tables. The requirement is therefore:

- **`django_app`** is a login role whose grants are limited to the `django` schema: `USAGE` on the schema, and `SELECT/INSERT/UPDATE/DELETE` on Django's own tables. It has **no privileges on any `public` application table** and **no `BYPASSRLS`**.
- `service_role` exists in exactly one place: `apps/db/admin_ops.py`, for management commands, backfills and P5a's verification runs. It is never a request-path connection — the `supabase` alias never uses it either (that alias impersonates `authenticated`).
- The role is created by an explicit, reviewed, **idempotent bootstrap SQL step** in **P2** (`supabase/bootstrap/django_app_role.sql`, operator-run once per environment, documented in `docs/django-owned-state.md`). It creates the `django` schema and the `django_app` role and grants, and **touches nothing in `public`** — which is what keeps it out of P5a's remit. Its grants are asserted by a test.

`/healthz` runs `SELECT 1` on each alias and asserts the identity of the connection (`current_user`, `current_schema()`, and that `current_user` is **not** `service_role` on `default`), so the split is verified rather than assumed.

**Risks.** Connecting Django and the legacy app to the same database concurrently is safe for reads but means schema changes must be coordinated from here on. Mitigation: **no schema change to `public`** is made by P2 at all — the only DDL Django runs is its own bookkeeping, and it lives in the dedicated `django` schema (§2.4), so it cannot collide with or shadow any Supabase object. All other schema work is scheduled in P0 (hardening) and P5a (reconciliation), each as a committed migration.
`managed = False` is mandatory for **every** model mapped to a `public` table, so Django can never generate DDL for one. **This is a hard rule from P2 onward**, enforced by a test that inspects `Model._meta.managed` for every model in the `supabase` alias.

**Blockers.** None, provided the database is reachable. If it is not, use the **local Supabase stack** (§P1) — not a plain Postgres instance, because Django must be developed against the real `anon`/`authenticated`/`service_role` roles and GoTrue for P3/P4 to be meaningful. The committed dump in `backups/` may be used to seed *data* into that local stack, which is a legitimate reason to keep a private copy before purging it in P0.

**Rollback.** Delete the new files. Nothing depends on them; the legacy app never talks to Django.

**Acceptance criteria.**
- `uv run manage.py check` and `migrate` succeed.
- `/healthz` returns 200 and executes one query against each alias.
- `manage.py inspectdb` reproduces the four tables the client can already reach; the generated models are marked `managed = False`.
- Django's own tables exist **only** in the `django` schema: `SELECT tablename FROM pg_tables WHERE schemaname='public'` shows **no** Django-created table, and a test asserts it.
- The `default` connection authenticates as **`django_app`**, and a test asserts `current_user != 'service_role'` and that `django_app` has **no** privileges on any `public` application table (`has_table_privilege('django_app','public.templates','SELECT')` is false).
- A query against `django_session` through the `supabase` alias fails (wrong schema/role), proving the split.
- Tailwind builds from `templates/**/*.html` using the **standalone CLI**, with the existing tokens and no Node.
- `ruff` and `mypy` run clean; `pytest` runs (with one trivial test).
- Docker image builds and starts.

**Tests.** A connectivity test, a `check --deploy` run against prod settings, and a Tailwind build assertion (the compiled CSS contains `--color-primary`/`#004ac6` and the token classes the baseline uses).

**Must remain untouched.** Every legacy file. No route may be served by Django yet.

**Difficulty.** **S** — days.

---

### P3 — Python service layer

**Objective.** Move speech, TTS, AI extraction and validation into Python **without moving any user-facing page, and without breaking the running React client**. Django exposes parallel endpoints that are **contract-compatible with the legacy ones first**, so the React app can be pointed at them by changing a base URL and nothing else.

**Prerequisites.** P2.

**Existing files affected (read as the porting source).** `server/routes/transcription.ts` (74) and `server/routes/tts.ts` (170) — ported line-for-line; `server/routes/transcribe.ts` (**dead, not ported**); `src/services/ai.ts` (432) — `transcribeAudio`, `synthesizeSpeech`, `processWithGroq`, the audio-player helper (not ported — §2.9), `extractDataFromText` (dead, not ported); `src/pages/AIVoiceAutoFill.tsx:185-199` (`normalizeKey`, `applyExtractedDataToForm` — **business logic extracted from the component**); `src/lib/aiVoiceService.ts` (**dead, not ported**). The only legacy file **modified** in this phase is `src/services/ai.ts` (the base URL, two lines) — see the contract table below.

**New files.** `apps/speech/{services.py,backends/google.py,backends/mock.py,views.py,urls.py}`, `apps/ai/{services.py,schemas.py,backends/groq.py,backends/mock.py}`, `apps/voice/services.py` (field matching), `apps/api/auth.py` (the transitional dual-authentication class), `tests/fixtures/{groq,google_stt,google_tts}/*.json`, `tests/unit/test_speech.py`, `tests/unit/test_extraction.py`, `tests/unit/test_field_matching.py`, `tests/contract/test_legacy_contract.py`.

**Dependencies.** `google-cloud-speech`, `google-cloud-texttospeech`, `groq`/`openai`, `pydantic`, `httpx`, `respx`, `PyJWT` + `cryptography` (for GoTrue JWT validation).

**Input contract: legacy first, multipart added alongside — not replaced.**

v0.1 of this plan said P3 could switch the browser to multipart and pointed React at Django "with a base-URL change". That was two changes at once, and it would have broken the running client. The corrected sequence:

| Stage | `POST /api/transcribe/` accepts | `POST /api/tts/` accepts | Browser sends | Done in |
|---|---|---|---|---|
| **P3** | **legacy `application/json` `{audio: "data:audio/webm;base64,…", mimeType}`** — the exact current contract, byte-for-byte | legacy `{text}` JSON | unchanged (base64 JSON) | P3 |
| **P3** | **additionally** `multipart/form-data` with `audio` as `request.FILES['audio']` | unchanged | — | P3 (added, not used yet) |
| **P4–P7** | both | both | unchanged (React still base64) | — |
| **P8** | both | both | **multipart** (the new recorder module) | P8 |
| **P11** | multipart only — **the legacy JSON/base64 contract is deleted** | — | — | P11 |

Differential testing in P3 therefore compares **like for like**: the same recorded audio, sent as the same base64 JSON body to both Express and Django, with the responses compared. The multipart path is exercised by its own tests and only becomes the browser's path in P8. **No hidden bridge, and no phase requires the browser and the server to change contract simultaneously.**

**Authentication during P3 (explicit choice, not an invention).** The legacy React client sends **no credentials** today (`services/ai.ts` uses a bare `fetch` to `localhost:3001`), and Django session auth does not exist until P4. So P3 does **not** require authentication, and **must not pretend to**:

- **The actual P3 security boundary is network + origin, not a token:** the endpoints bind to **loopback/private networking only** and enforce a **strict `Origin`/`Referer` check plus a narrow CORS allowlist** (the legacy dev origins). That is what keeps them from being an open internet-facing proxy in P3. This is stated as the boundary because it is the honest one.
- `apps/api/auth.py` is **implemented** in P3 with two accepted credential types — a **Django session** (usable from P4) **or** a **Supabase access token in `Authorization: Bearer`**, validated against GoTrue (JWKS or `GET /auth/v1/user`). Both are implemented and tested in P3, and **neither is mandatory yet**.
- `INTERNAL_API_TOKEN` is **not a secret and must not be described as one**: the browser receives it, so it provides no confidentiality. It is a **temporary request-control marker** that (a) distinguishes intended app traffic from casual scanning and (b) gives the server a way to log and later count legacy-contract usage for P11's evidence gate. It is a speed bump *behind* the real boundary, not an authentication mechanism.
- **P4 makes authentication mandatory** (Django session *or* Supabase bearer). At that point the legacy React voice client attaches its existing Supabase access token (§P4) — because legacy users hold a Supabase session and no Django session during the dual-stack period (§2.4).
- **P11 deletes the Supabase-bearer path, the `INTERNAL_API_TOKEN`, and the legacy input contract**, leaving session-authenticated multipart endpoints only.

**Data-flow change.**

| Before | After (end of P3) | After (P8/P11) |
|---|---|---|
| browser → `POST localhost:3001/api/transcribe` (base64 JSON) | browser → `POST /api/transcribe/` (**same base64 JSON**) → `apps.speech.services.transcribe` | multipart; base64 contract deleted in P11 |
| browser → `POST localhost:3001/api/tts` | browser → `POST /api/tts/` (same JSON) → `apps.speech.services.synthesize` | unchanged |
| browser → `api.groq.com` **with the API key** | browser → `POST /api/ai/extract/` → `apps.ai.services.extract` → Groq (key server-side only) | unchanged |
| field matching in `AIVoiceAutoFill.tsx` | `apps.voice.services.apply_extraction()` (unit-tested) | used by the Django voice page |

**Parity requirements — port these verbatim, quirks included:**
- The MIME→encoding map and the MIME→sample-rate rules (`transcription.ts:12-36`).
- The 10 MB base64 limit and the "must contain a comma" data-URL check (`ai.ts:13-45`), plus the equivalent size limit on the multipart path.
- The TTS 5,000-character cap, the whitespace collapse and the `[^\w\s.,!?;:()\-'"]` strip (`tts.ts:36-49`).
- The Groq system prompt **word for word** (`ai.ts:283-308`), model `llama3-70b-8192`, temperature 0.3, `max_tokens` 2048, `top_p` 0.9.
- The defensive parse order: strict `JSON.parse`, then the regex fallback (`ai.ts:360-366`), then the identity fallback.
- The mock fallbacks that trigger when keys are absent (`ai.ts:274-280`) — preserved behind a `USE_MOCK_AI` setting.
- `normalizeKey` semantics: strip `[^a-zA-Z0-9]`, lowercase, match against field **id or label** (`AIVoiceAutoFill.tsx:185-199`).

**Risks.**
- **Prompt drift** changes extraction quality invisibly. Mitigation: golden-fixture tests over recorded transcripts asserting the extracted field values.
- **Google client credentials.** The current code uses `keyFilename: "service-account.json"` **relative to CWD**; the Python version must use an explicit path or `GOOGLE_APPLICATION_CREDENTIALS`, or it will fail differently from the thing it replaces.
- **Boundary transcription differences.** Google's `recognize` returns different results for the same audio between the two SDKs only if the config differs — hence the requirement to port the config exactly.
- **Request-size limits.** `body-parser` is configured for 20 MB (`server/index.ts:12-13`); Django needs `DATA_UPLOAD_MAX_MEMORY_SIZE`/`FILE_UPLOAD_MAX_MEMORY_SIZE` set to match, or larger payloads that worked before will start failing.
- 🟠 **Two contracts alive at once.** Mitigation: the legacy contract is the default and is what differential tests exercise; the multipart path has its own tests; P11 deletes the legacy one and a test asserts it is gone.
- 🟠 **A transitional request-control marker is not authentication, and must not be mistaken for it.** Mitigation: the honest boundary (private binding + strict Origin/CORS) is documented as the boundary; the marker is explicitly labelled non-secret; both have an owning removal phase (P11); and a reviewer checklist item requires that no P3 code comment describes it as securing the endpoint.

**Blockers.** Real Google Cloud and Groq credentials for live verification (mocks cover the rest). If the Groq key was rotated in P0 into a server-only variable, verify the browser no longer needs it.

**Rollback.** Trivial, and the main reason this phase is separate: revert the base-URL change in `src/services/ai.ts` (and the `INTERNAL_API_TOKEN` header); the Express server is still running and unchanged. **No contract migration has happened yet**, so rollback is genuinely a two-line revert.

**Acceptance criteria.**
- For a recorded audio fixture **sent as the legacy base64 JSON body**, `/api/transcribe/` returns a transcript equal to the Express route's (documented SDK variance allowed).
- `/api/tts/` returns byte-identical base64 MP3 for the same JSON input as the Express route.
- The **same fixture sent as `multipart/form-data`** returns an equivalent transcript, proving both input paths.
- `/api/ai/extract/` returns the same `extractedData` mapping as the browser path for the same transcript, across a fixture set covering name/email/phone/date/selection fields.
- `apps/api/auth.py` accepts a Django session and a valid Supabase bearer token, and rejects an expired/forged token (tests for all three) — **but does not yet require either**.
- **P3 rejects a request that is missing the transitional control** (wrong/missing `Origin`, or outside the CORS allowlist, or missing the request-control marker) with 403, and the endpoints are unreachable from outside loopback/private networking. **P4 makes authenticated session-or-bearer credentials mandatory**; P11 removes the transitional control entirely.
- Field matching passes unit tests ported from the component's behaviour.
- No API key appears in any client bundle.
- `docs/security-remediation.md` records the P3 boundary honestly: **origin/CORS + private binding as the boundary**, `INTERNAL_API_TOKEN` as a non-secret request-control marker, and both with an owning removal phase (P11).

**Tests.** Unit tests for all three services against recorded fixtures; a differential test that runs the same request against Express and Django and compares responses; a negative test asserting a request with a disallowed `Origin` or from outside the private network is rejected; `ruff`/`mypy`.

**Must remain untouched.** All 25 routes, all UI, all Supabase access, the Express server (kept running as the reference implementation until P11).

**Difficulty.** **M** — one to two weeks. The porting is mechanical; the parity fixtures and the extraction prompt's exact preservation are the careful parts.

---

### P4 — Auth and session migration (parallel, not cut-over)

**Objective.** **Build and validate Django-owned authentication in parallel with the legacy Supabase browser session** — not replace it. At the end of P4, Django-rendered routes authenticate via a Django session cookie, **while the still-React routes continue to authenticate exactly as they do today** via `supabase-js` and the browser Supabase session.

**What this phase explicitly does *not* do.** It does not remove the browser's Supabase session. v0.1 of this plan claimed both, which is impossible: between P4 and the end of P7, `Dashboard`, `Templates`, `Scheduler`, `ManageSchedules`, `SchedulerSettings`, `FilledTemplates`, `AIVoiceAutoFill` and `ActivityLog` are **still React components driven by `AuthContext` + `supabase-js`**. They need the browser session to function. Removing it in P4 would break every protected route that has not migrated yet.

**Therefore:** a user during the dual-stack period may hold **both** a Django session cookie (for migrated routes) and a Supabase browser session (for unmigrated ones). Both are legitimate; both are tested. "No Supabase token in the browser" becomes:

| Gate | Scope | Phase |
|---|---|---|
| Django-rendered pages never expose a Supabase token to the client | every migrated route | P4 |
| No Supabase credential is needed by **any** browser page except the legacy SPA | all migrated routes + `/api/*` via session | end of P7 wave 7 |
| No Supabase token or key exists in the browser at all | the entire application | **P11** |

**Prerequisites.** P2, P3. A staging Supabase project with email confirmation and OAuth configured.

**Existing files affected.** `src/lib/supabase.ts` (the reference implementation of every auth helper), `src/contexts/AuthContext.tsx`, `src/pages/{Login,Signup,ForgotPassword,ResetPassword}.tsx`, `supabase/migrations/20250628064052_twilight_disk.sql` (the `handle_new_user` trigger), `lib/supabase.ts:91-93` (the production reset placeholder).

**The one legacy file this phase modifies:** `src/services/ai.ts` — **and only to attach the Supabase access token the client already holds** to its `/api/*` requests (read it once via `supabase.auth.getSession()` and send it as `Authorization: Bearer`, plus `credentials: 'include'`). No React page and no auth component is altered: `src/lib/supabase.ts`, `src/contexts/AuthContext.tsx` and the four auth pages continue to work exactly as they do today. This is a documented, three-line, independently revertible change, not a silent bridge — it is what allows the still-React voice page to satisfy P4's mandatory authentication while its users have no Django session.

**New files.** `apps/accounts/{views.py,urls.py,forms.py,middleware.py}`, `apps/accounts/services/{gotrue.py,tokens.py}`, `apps/accounts/principals.py` (`SupabaseUser` / `AnonymousSupabaseUser`), `apps/accounts/templates/accounts/{login,signup,forgot_password,reset_password,confirm_email}.html`, `apps/api/auth.py` extended to make the dual credential types **mandatory** on `/api/*`, `tests/views/test_auth.py`, `tests/unit/test_gotrue_client.py`, `tests/unit/test_token_store.py`, `tests/unit/test_dual_auth.py`.

**Dependencies.** `httpx`, `PyJWT` + `cryptography` (Supabase bearer validation), Django sessions (per §2.4's state decision), `django-ratelimit` (or GoTrue's own rate limits), Supabase dashboard access **to edit email templates and redirect URLs**.

**Data-flow change (dual stack, both live simultaneously).**

| Flow | Legacy React routes (unchanged) | Django-rendered routes (new) |
|---|---|---|
| Session | localStorage Supabase token, read by `supabase-js` | Django session cookie (`HttpOnly`, `SameSite=Lax`, `Secure` in prod); Supabase tokens held server-side |
| Sign-in | `Login.tsx` → `supabase-js` (unchanged) | `POST /login` → Django → GoTrue `token?grant_type=password` → session cookie |
| Sign-up | `Signup.tsx` (unchanged) | `POST /signup` → Django → GoTrue `/auth/v1/signup` |
| OAuth | `signInWithOAuth` (unchanged, currently broken — §1.9) | `GET /auth/oauth/google/` → GoTrue (**PKCE, `code_challenge_method=s256`**) → `GET /auth/callback` (server-side code exchange) → session |
| Password reset | `resetPasswordForEmail` (unchanged) | `POST /forgot-password` → GoTrue `recover` → email link carries **`{{ .TokenHash }}`** as a query param → Django `/reset-password/?token_hash=…` verifies and renders the form |
| Sign-out | `supabase.auth.signOut()` (unchanged) | `POST /logout` → flush Django session + GoTrue logout |
| Identity | `AuthContext.user` (unchanged) | `request.user` — the `SupabaseUser` principal (§2.4) |
| Route guard | per-page `if (!user) return null` (unchanged) | `LoginRequiredMixin` → redirect to `/login?next=…` |
| `/api/*` | sends `Authorization: Bearer <supabase access token>` **or** the transitional internal header | Django session cookie; **no token in the page** |

**The email-template change and PKCE are both mandatory.** `{{ .TokenHash }}` puts the recovery token in a query string Django can read server-side; the implicit flow's URL fragment cannot be read by server code, which is why **PKCE is required rather than optional** for OAuth. If template editing is not permitted, a ~10-line JS shim is required for the reset leg only (documented in §2.8 as the fallback).

**Risks.**
- 🔴 **Lockout risk.** A bug in the session layer locks users out of the *migrated* routes. Mitigation: **there is no admin bypass and no special authentication hole** — the rollback mechanism is the preserved legacy host/route plus a feature flag/reverse-proxy switch that sends a route back to the React app, where the user's existing Supabase session still works. Additionally: test against staging, and enable the Django auth path one route at a time (it is first used by the W3 auth pages, which are low-traffic and self-contained).
- 🟠 **A user holding two independent sessions may see inconsistent identity** (e.g. sign out of Django, still signed in on the legacy SPA). Mitigation: document it as a known dual-stack artefact; the final sign-out consistency arrives when the last route migrates (P7 wave 7 → P11). Do **not** attempt to synchronise the two session stores.
- **Token refresh races.** Concurrent requests refreshing the same token can invalidate each other. Mitigation: a short expiry leeway plus a per-session lock.
- **OAuth return-URL allowlist** must include the new Django callback URLs, or every OAuth login fails with a redirect error.
- **`microsoft` is not a valid provider id** (it is `azure`) — carry the fix, do not preserve the bug.
- **`company`/`industry` are dropped by the trigger.** Django writes them on first login (idempotent), which is additive and safe.
- **CSRF.** Every state-changing route needs it; HTMX must send `X-CSRFToken`. Missing this is a silent 403 on every form.
- 🟠 **`INTERNAL_API_TOKEN` from P3 must now be removed** for the Django-session path, or the temporary control silently becomes permanent.

**Blockers.** B2: **Supabase dashboard access to change email templates and redirect URLs.** B3: a test/staging Supabase environment (never experiment against production identities). Q19 (Django-owned state) must be settled, since it determines the session backend.

**Rollback, stated honestly.**
- **Config-level rollback (fast):** flip the reverse-proxy/feature-flag switch for a route back to the legacy app. Because the legacy SPA kept its own session throughout, **most unprotected routes roll back transparently**.
- **Protected routes: a legacy re-login may be required.** The user's Supabase browser session may have expired while they were using Django-rendered routes (the legacy SPA only refreshes its token when the SPA is loaded). Rolling a route back to React can therefore present a signed-out SPA that needs a fresh Supabase sign-in. **This is documented, not hidden** — it is inherent to running two session authorities side by side, and it is the honest cost of the parallel approach.
- **Code-level rollback:** delete the Django auth views; the legacy `Login.tsx`/`Signup.tsx` were never modified, so they are already the working fallback.

**Acceptance criteria.**
- Sign-in, sign-up, Google OAuth, sign-out, password reset and password change all work end-to-end through Django on the migrated routes.
- **A user can simultaneously be signed in to a Django-rendered route and to the legacy SPA**, and both work — this is the explicit proof that P4 did not cut over.
- A user created by the legacy path can sign in through Django unchanged (password hashes untouched).
- `request.user` is the `SupabaseUser` principal in every authenticated view; anonymous access to a guarded Django route redirects to `/login?next=…`.
- The password-reset flow completes with **JavaScript disabled**.
- `/api/*` accepts a Django session **and** a valid Supabase bearer token, and rejects anonymous, expired and forged requests.
- The `public.users` row is created for new signups by the existing trigger, and `company`/`industry` are filled by Django on first login.
- Session fixation is prevented (`request.session.cycle_key()` on login); cookie flags verified.

**Tests.** Django test-client suites for each flow; a mocked-GoTrue unit suite using `respx` covering error codes (invalid credentials, unconfirmed email, rate limit); a **dual-auth test matrix** (session only, bearer only, both, neither, expired, forged); an E2E Playwright test for password reset with JS disabled; a test asserting **no `sb-`-prefixed localStorage key is written by any Django-rendered page** (the legacy SPA may still write them — that is expected in P4).

**Must remain untouched.** All Supabase data and policies; the `auth.users` table; `handle_new_user()` (unless the `company`/`industry` gap is fixed additively); the legacy auth path in `src/lib/supabase.ts` and `src/contexts/AuthContext.tsx`; every unmigrated page. **The only legacy file permitted to change is `src/services/ai.ts`, and only for the bearer-token attachment described above** — that exception is explicit so that no other legacy edit is justified by it.

**Difficulty.** **L** — two to four weeks. The most failure-prone phase, because auth failures are total and hard to observe — and now additionally because two authorities coexist.

---

### P5a — Schema reconciliation (mandatory before any data-access work)

**Objective.** Establish **what the database actually is**, and produce two *separate*, correctly-scoped artefacts: a baseline that can build a fresh environment, and a set of additive changes that are safe against the live one. **Never guess the live DDL, and never run a historical `CREATE TABLE` against a table that may already exist.**

v0.1 of this plan proposed a single migration with `CREATE TABLE` statements for `template_shares`, `template_reviews` and `filled_templates`. That is unsafe in both directions: if those tables already exist in the live project, applying it is wrong; and if they do not, a `CREATE TABLE IF NOT EXISTS` written from client code is still a guess about columns, types, constraints and FKs.

**Prerequisites.** P2. P1's staging/local Supabase environment. Read access to the live database (or an accepted decision that it is gone — §11 Q2/Q3).

**Existing files affected.** `supabase/migrations/*` (all seven — **read only, never edited**), `supabase/.temp/*` (project ref, versions), `docs/tables.md` (superseded as the schema record by the reconciliation output), `backups/` (the dump, as a cross-check only).

**New files.**

| File | Purpose |
|---|---|
| `supabase/schema_dump/live-schema.sql` | `pg_dump --schema-only --no-owner --no-privileges` of the **live** project |
| `supabase/schema_dump/replayed-schema.sql` | the same dump taken from a **clean local Supabase stack** after `supabase db reset` replays the seven committed migrations |
| `supabase/schema_dump/DIFF.md` | the normalised diff, with every delta classified and justified |
| `supabase/schema_dump/live-data-inventory.md` | row counts + null/duplicate checks for the three undelivered tables (does real data exist in them?) |
| `supabase/baseline/00000000000000_baseline.sql` | a **fresh-install baseline** representing the intended end state — used only for local/CI/new environments |
| `supabase/migrations/<ts>_reconcile_*.sql` | **additive, idempotent, guarded** migrations for the live project only |
| `scripts/schema_diff.py` | normalises and diffs two dumps (ordering, whitespace, `SET` noise, comments) |
| `docs/schema-reconciliation.md` | the written record: what diverged, why, and which artefact fixes which environment |

**Method (in order — each step is a deliverable).**

1. **Dump live.** `pg_dump --schema-only --no-owner --no-privileges` → `live-schema.sql`. Also capture `supabase/.temp/*` versions (GoTrue, Storage, Postgres) so role/extension differences are visible.
2. **Replay locally.** `supabase db reset` in a clean stack replays the seven committed migrations; dump → `replayed-schema.sql`. **This is expected to fail at `20250628065741_precious_brook.sql`** (§1.7 / `docs/tables.md`), which is itself the first finding: the committed history cannot build the live schema.
3. **Diff and classify.** Every delta goes into exactly one bucket:

| Bucket | Meaning | Correct artefact |
|---|---|---|
| **D1 — live-only objects** | tables/columns/indexes/FKs/policies present live, absent from the committed history (`template_shares`, `template_reviews`, `filled_templates`, and whatever else surfaces) | **baseline** (fresh installs) **+** a guarded additive migration that creates them **only if absent** |
| **D2 — history-only objects** | present in the replay, absent live (e.g. effects of the dropped `visibility` policy) | **do not** re-apply to live; record in `DIFF.md` |
| **D3 — divergent definitions** | same object, different definition (e.g. RLS policy sets, `humble_fire` PUBLIC-role policies, missing FKs on `created_by`/`owner_id`/`invited_by`) | decide per object: keep live's definition, or an explicit corrective migration |
| **D4 — configuration outside SQL** | storage buckets, storage policies, GoTrue settings (email templates, redirect URLs), extensions | **not** expressible as a Supabase migration alone — captured in `DIFF.md` and applied via CLI config/dashboard, with the intent committed as `supabase/config.toml` where possible |
| **D5 — data-shape findings** | does `filled_templates` actually contain rows? do the shares/reviews tables hold data? | `live-data-inventory.md` — this decides how much the missing tables matter |

4. **Build the baseline** (`supabase/baseline/00000000000000_baseline.sql`) — the **intended end state** for a *new* environment: the reconciled DDL for all tables, indexes, constraints, triggers, RLS policies and storage buckets. It is applied to fresh local/CI stacks **instead of** replaying history. History is preserved unchanged for audit. Document the switch explicitly in `docs/schema-reconciliation.md`; a fresh environment must be reproducible from the baseline alone.
5. **Build the live remediation** — **only** additive, **only** what the diff proves is missing, and **guarded so that applying it to an already-correct database is a no-op.** The mandatory patterns:
   - `CREATE TABLE IF NOT EXISTS` **only** where D5 proves absence of data and D1 proves absence of the object;
   - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` inside a `DO $$ ... IF EXISTS (...information_schema.tables...) $$` guard;
   - `CREATE POLICY` inside a `DO $$ ... IF NOT EXISTS (SELECT 1 FROM pg_policies...) $$` guard (the existing `precious_brook` migration already demonstrates this pattern — reuse it);
   - `CREATE INDEX IF NOT EXISTS`;
   - `ADD CONSTRAINT` guarded by a `pg_constraint` existence check;
   - **no `DROP` of anything** unless the diff proves it is Django-only or explicitly approved;
   - the whole file wrapped so a partial failure is visible and re-runnable.
6. **Verify both paths.** Apply the baseline to a clean stack → diff against the intended end state → zero deltas. Apply the live remediation to a **restored copy of live** → diff → zero deltas. Both diffs are committed.
7. **Record.** `docs/schema-reconciliation.md` states, for every bucket: what diverged, which artefact addresses it, which environment it was verified against, and what remains unknown.

**Data-flow change.** None at runtime. This phase only makes the schema knowable and reproducible.

**Risks.**
- 🔴 **Running a migration against production that was authored from an assumption.** Mitigation: every live remediation is guarded and idempotent, verified on a restored copy first, and the phase's exit criterion is a zero-delta diff — never a successful exit code alone.
- 🔴 **Live database unreachable** → the whole reconciliation degrades to a guess. Mitigation: if Q2/Q3 cannot be answered, **this phase stops and the migration stops with it.** The options are (a) obtain access, (b) restore from `backups/` and treat that as the reference — explicitly labelled as a possibly-stale snapshot, or (c) abandon the three tables' data and rebuild from the client contract, which requires written approval because it risks data loss.
- 🟠 **Storage buckets and GoTrue config are not in SQL.** Mitigation: bucket 4 of the classification above, with the intent captured in `supabase/config.toml` so it is at least reviewable.
- 🟠 **The replay failing at migration 7** may tempt someone to "fix" a committed migration. **That is forbidden** — the fix is the baseline, not an edit to history.
- 🟡 **`pg_dump` version skew** produces noisy diffs. Mitigation: `scripts/schema_diff.py` normalises ordering and strips non-semantic lines; pin the CLI version.

**Blockers.** **B4 (hard): live database access, or an explicit, written decision about its status.** B9: permission to introduce `supabase/baseline/` and `supabase/config.toml`.

**Rollback.** Nothing is applied to live during the analysis steps. The live remediation migration is additive and guarded; if it misbehaves, the correction is a **new forward migration**, not a revert — and because it only adds, the failure mode is "the object still doesn't exist", not data loss.

**Acceptance criteria.**
- `live-schema.sql`, `replayed-schema.sql`, `DIFF.md` and `live-data-inventory.md` all exist and are committed (secrets scrubbed).
- Every delta is classified into D1–D5 with a stated disposition.
- The **baseline builds a clean environment that matches the intended end state with zero diff.**
- The **live remediation applied to a restored copy of live produces zero diff**, and **applying it twice changes nothing** (idempotence proven).
- No committed migration file was edited (`git diff` on `supabase/migrations/` shows only additions).
- `docs/schema-reconciliation.md` records what remains unknown.

**Tests.** `scripts/schema_diff.py` normalisation tests; a CI job that builds a fresh stack from the baseline and diffs it; an idempotence test that applies the live remediation twice; a test asserting the guard clauses exist in every live-remediation statement (a static check on the SQL).

**Must remain untouched.** The seven existing migration files. The live database — no writes until the remediation is verified on a restored copy.

**Difficulty.** **M to L** — one to three weeks, dominated by obtaining access and by the classification/review rather than by SQL authoring. **Blocks P5b and therefore P7 W4 onward.**

---

### P5b — Supabase and data-access migration

**Objective.** Move all 38 data call-sites (plus the 6 nested PostgREST embeds) behind Django while keeping **every RLS policy in force**.

**Prerequisites.** **P5a complete.** P4. P0's policy fixes applied. A staging/local Supabase environment (not plain Postgres — §P1).

**Existing files affected (porting sources).** `src/lib/templates.ts` (610 lines, 21 functions — the chokepoint), `src/lib/scheduler.ts` (280 lines), `src/lib/activity.ts` (183), `src/pages/FilledTemplates.tsx`, `src/pages/AIVoiceAutoFill.tsx:347`, `src/components/TemplateBuilder/TemplateBuilderModal.tsx:216,249,257`, `src/components/TemplateCard.tsx`, `src/components/Team/*`, `src/lib/supabaseClient.ts` (deleted).

**New files.**
- `apps/db/rls.py` — the **RLS access context** (§2.5): `rls_context()`, `require_rls_context()`, `RLSQueryGuard`. **This replaces v0.1's `config/middleware/db_claims.py`**, which was architecturally wrong: middleware runs outside the view transaction and `SET LOCAL` is transaction-scoped.
- `apps/db/admin_ops.py` — the **only** module permitted to use the service role (management commands, backfills, P5a's verification runs). Never importable from a view.
- `apps/templates_app/{models.py,selectors.py,services.py,schemas.py,forms.py}`, `apps/scheduler/{models.py,selectors.py,services.py,forms.py}`, `apps/storage/services.py`, `apps/accounts/selectors.py` (preferences, per §2.12), plus `apps/activity/*` or its removal, per §11 Q6.
- `tests/rls/test_policies.py` — the allow/deny matrix.
- `tests/unit/test_rls_context.py` — the fail-closed proof.
- `tests/unit/test_selectors.py`, `tests/unit/test_services.py`.

**Dependencies.** `psycopg` (already present).

**Data-flow change.**

| Before | After |
|---|---|
| browser → PostgREST with the anon key | Django ORM, **only** inside `rls_context(request.user)` |
| Client-supplied `created_by`, `shared_by`, `reviewer_id`, `user_id` | Server-supplied from `request.user` |
| Client-supplied `updated_at` ISO strings | DB triggers (already exist) + server-side timestamps |
| `supabase.storage.from('template-files')` upload + `getPublicUrl` | `apps.storage.services.upload()` via the Storage REST API using the **user's JWT** (RLS-respecting), or the S3 protocol with a **session token minted from the user's JWT** — both preserve Storage RLS |
| Nested PostgREST embeds (`templates` + `template_shares` + `template_reviews`) | `select_related`/`prefetch_related` over FKs that **P5a proved exist** |
| Dashboard/scheduler settings in localStorage | `public.users.preferences` / `user_preferences`, per §2.12 Decision A |

**The RLS strategy.** Full design and its non-negotiable properties are in **[§2.5](#25-data-access-design)**. In summary: a proven `rls_context()` that opens `transaction.atomic()` on the `supabase` alias, sets `request.jwt.claims` and `SET LOCAL ROLE authenticated` **on that same connection inside that same transaction**, and a guard that makes an un-scoped query on that alias **impossible** rather than merely discouraged. This is the plan's single highest-risk assumption and the P5b entry gate; fallback is Option B2 (§2.5).

**Risks.**
- 🔴 **Cross-tenant leakage** if any code path reaches the `supabase` alias without a context. Mitigation: the `RLSQueryGuard` raises at query time (not a convention); a test issues an un-scoped query and expects the exception; the per-policy RLS matrix runs in CI.
- 🔴 **Connection pooling.** `SET LOCAL` is transaction-scoped and should survive PgBouncer in transaction mode, but this **must be verified against the actual pooler URL** in `supabase/.temp/pooler-url`, including the `RESET ALL` behaviour on connection return.
- 🟠 **Mixing the two aliases** (Django tables vs application tables). Mitigation: separate aliases, separate roles, separate schemas, plus tests asserting `django_session` is unreachable via `supabase`.
- 🟠 **Service-role leakage into a request path.** Mitigation: `admin_ops` is not importable from views; a CI check greps for it.
- 🟠 **`filled_templates` has no created-by enforcement**; Django must supply `user_id`.
- 🟡 **`searchEvents` injection** (`scheduler.ts:275`) must become a parameterised `icontains` query — a fix, not a port.
- 🟡 **The two role vocabularies** (`{admin,user}` vs `{viewer,editor,admin}`) must be reconciled or both preserved; they live in different features today.

**Blockers.** **B4** (via P5a). **B5: the pooling/`SET LOCAL`/guard spike.** Q19 (Django-owned state) settled in P2. Q5/Q6 (preferences and mocks) settled before the corresponding selector/service is written.

**Rollback.** The legacy Supabase client stays in place and the React app keeps working throughout P5b; Django's data layer is purely additive until P7 switches pages onto it. Revert by leaving pages on the legacy client. **No schema change is introduced by P5b** — P5a already reconciled the schema, so P5b is code-only and therefore cleanly revertible.

**Acceptance criteria.**
- All 38 call-sites (plus the 6 nested embeds) have a Django equivalent, each with a test.
- The RLS suite proves, per policy, that the owner can read/write and a non-owner cannot — for `templates`, `scheduled_events`, `template_shares`, `template_reviews`, `filled_templates` and `users`.
- **The fail-closed proof holds:** a query on the `supabase` alias outside `rls_context()` raises `UnauthenticatedQuery`; a query inside it returns only the acting user's rows.
- No view module imports the service role (CI grep).
- A dual-run harness writes the same logical operation through both stacks against the staging environment and diffs the resulting rows.
- Timestamps and ownership columns are server-supplied; a test attempts to inject a foreign `created_by` and is rejected.
- Storage upload/download round-trips under Storage RLS with the user's JWT (or S3 session token).

**Tests.** The RLS matrix (highest value in the project); the fail-closed/guard tests; the alias-separation tests; differential CRUD tests; storage round-trip under RLS.

**Must remain untouched.** The seven existing migration files and the P5a artefacts. **The RLS policies themselves — P5b adapts the application to the policies, not the policies to the application** (except the P0 security fixes).

**Difficulty.** **XL** — four to eight weeks. The largest phase, and the one where a mistake is a data breach.

---

### P6 — Shared UI and template components

**Objective.** Build the Django rendering skeleton — base templates, the app shell, the modal macro, the icon sprite, the css/js pipeline — and wire the **side-by-side proxy** that lets routes switch to Django one at a time with per-route rollback.

**Prerequisites.** P2. Can run in parallel with P3–P5b.

**Existing files affected (reference only).** `src/App.tsx` (the shell classification), `src/components/Header.tsx`, `src/components/Footer.tsx`, `src/pages/Dashboard.tsx:430-560` (the sidebar markup), `tailwind.config.js` (tokens — **copied verbatim**), `src/index.css`, `index.html` (title/meta/fonts), `new pages/*.html` (the design source of truth for public pages).

**New files.** `templates/base.html`, `templates/base_public.html`, `templates/base_app.html`, `templates/partials/{header,footer,sidebar,mobile_nav,messages,modal,pager}.html`, `templates/partials/icons/sprite.svg`, `static/js/clipboard.js`, `static/css/input.css`, `tailwind.config.js` (root, content globs updated), `apps/core/views.py::legacy_proxy`, `Makefile` targets `css`, `docs/parity/README.md`.

**Dependencies.** `htmx.min.js`, `alpine.min.js`, Tailwind standalone CLI.

**Data-flow change.** Introduction of an **explicitly allowlisted** proxy fallback: a *named* route from the route manifest that has not yet been implemented in Django is forwarded to the legacy stack by `legacy_proxy`, preserving cookies and bodies. This is what makes per-route migration and per-route rollback possible.

**The proxy must never be a generic catch-all.** v0.1 said "any unmatched path". That is a request-smuggling and information-disclosure hazard: it would forward `/api/*`, `/auth/*`, `/admin/*`, `/static/*`, health endpoints and arbitrary unknown URLs — including paths designed to probe the legacy server — straight through, and it would silently mask typos as "working" pages.

| Rule | Requirement |
|---|---|
| Match source | The **route manifest** (the single JSON source of truth from P1) — an allowlist of the exact 25 legacy paths, normalised for trailing slashes |
| Methods | Only those the legacy app actually serves for that path (GET/HEAD for pages; POST for the two form endpoints) |
| **Never proxied** | `/api/`, `/auth/`, `/admin/`, `/static/`, `/media/`, `/healthz`, `/favicon.ico`, and anything not in the manifest |
| Unknown paths | **404 or 405 from Django** — never forwarded |
| Response marking | Every proxied response carries `X-Legacy-Proxy: 1` and is logged with the path, so usage is measurable |
| Loop safety | The proxy targets a configured `LEGACY_ORIGIN` and refuses to proxy to itself |
| Header handling | Hop-by-hop headers stripped; `Host` rewritten; `X-Forwarded-*` set deliberately |

**Risks.**
- The proxy can mask a missing implementation (a route "works" because it is still legacy). Mitigation: the allowlist makes proxying explicit and countable; the route-matrix test asserts how many manifest routes are still proxied, and that count must reach **zero** before P11. Disabling the proxy is a one-setting change and is part of P11's gate.
- Tailwind content globs must cover both stacks during the transition, or styles silently drop on migrated pages.
- Duplicate `<head>` (fonts, meta) between `index.html` and `base.html` — they must match, or the visual baseline breaks.
- Icon parity: `lucide-react` icons have specific stroke widths (default 2, `currentColor`). The sprite must match, or icons will look subtly wrong and fail pixel comparison.

**Blockers.** None.

**Rollback.** Delete the templates; the proxy can also be disabled to make Django serve nothing.

**Acceptance criteria.**
- `base_public.html` renders Header + Footer identically to the React shell for all 13 public routes (empty page bodies initially, compared against the baseline's chrome regions).
- One modal macro reproduces the shared shell (`fixed inset-0 bg-black/50`, `max-h-[90vh]`, `p-6 border-b` header, `p-6 border-t` footer) using native `<dialog>`, with keyboard dismiss and focus handling.
- Tailwind builds from templates with **byte-comparable class output** for the tokens in use (`bg-surface-subtle`, `text-text-secondary`, `font-body-medium`, `px-margin-desktop`, `gap-space-lg`, `primary`, `voice`).
- The proxy forwards a **manifest** route correctly, including POST bodies and cookies.
- **The proxy refuses** a request to `/api/anything`, `/auth/anything`, `/admin/`, `/static/`, `/healthz` and a random unknown path — each returns 404/405 from Django and is **not** forwarded. This is a required test, not a nicety.
- Icon sprite contains every icon used by the 25 pages, at the correct stroke width.

**Tests.** A template-render test per partial; a CSS-token test; a proxy test (forwarded status/body/headers) **plus a negative proxy test for every never-proxy prefix**; a "no un-styled page" test that asserts every rendered page has a non-empty `dist.css` link.

**Must remain untouched.** The React app and the Express server — both are still serving production traffic. `tailwind.config.js` tokens must be copied, **not** reinterpreted.

**Difficulty.** **M** — one to two weeks.

---

### P7 — Page-by-page React → Django/HTMX migration

**Objective.** Move all 25 routes to Django in seven waves, smallest risk first, each wave independently shippable and independently revertible via the proxy.

**Prerequisites.** P6. Waves 3+ need P4; waves 4+ need **P5a and P5b**; wave 7 needs P8. **Wave 4 additionally needs §2.12's Decisions A and B signed off**, because the dashboard is where the localStorage preferences and the team/review mocks surface.

**Wave plan**

| Wave | Routes | React lines removed from the hot path | Depends on | Why this order |
|---|---|---|---|---|
| **W1** | `/terms`, `/privacy`, `/open`, `/about`, `/security`, `/pricing`, `/industries`, `/features`, `/contact`, `/status`, `/help-center` | ~2,700 | P6 only | Static content, no auth, no data. Proves the template/asset pipeline **and the allowlisted proxy rollback** on the real design system. |
| **W2** | `/`, `/documentation` | ~1,145 | W1 | Large but static; `Documentation` adds the clipboard island. |
| **W3** | `/login`, `/signup`, `/forgot-password`, `/reset-password` | ~980 | P4 | First Django-authenticated routes; the legacy auth path stays live for the SPA. |
| **W4** | `/dashboard` + the app shell | ~2,600 (834 page + ~1,750 reachable modals) | P5b, W3, §2.12 decisions | The hub; composes shell, 3 data domains and 4 reachable modals. Establishes the app-page pattern. |
| **W5** | `/templates` (+ builder, card, share/review modals) | ~1,575 | W4 | First full CRUD domain; exercises modals, file upload, storage. |
| **W6** | `/scheduler`, `/manage-schedules`, `/scheduler-settings` | ~2,500 | W5 | Largest and most intricate (calendar grids, filters, bulk actions, timezone math). Settings move server-side per §2.12 Decision A. |
| **W7** | `/AIVoiceAutoFill`, `/filledtemplates`, `/activitylog` | ~1,265 | P8, W6 | The product's core loop, migrated last when everything else is proven. **After W7 there is no React route left, so the legacy SPA's Supabase session is no longer needed by any route** — the P7/P10 gate in §2.4. |

**Existing files affected.** The page files listed in §1.4 become read-only references inside `legacy/src/pages/` (moved in P2/P6 or at the start of W1). Each wave's components in §1.5 are archived as they are superseded.

**New files per wave.** For each route: `apps/<app>/views.py` entry, `urls.py` entry, `templates/<app>/<page>.html`, plus `partials/` for every modal/list/form, and a view test. W4 adds `apps/dashboard/`; W5 adds `apps/templates_app/` templates; W6 adds `apps/scheduler/` templates; W7 adds `apps/voice/` and `apps/activity/`.

**Dependencies.** Incremental: HTMX patterns per §2.7, Alpine only per §2.8.

**Data-flow changes per wave.** None beyond P4/P5b — the waves only change *which process renders the HTML*. Every wave must consume the **P5b** data layer (inside `rls_context`), never PostgREST directly.

**Risks (all waves).**
- **Visual drift.** Mitigation: comparison against the P1 state matrix (both breakpoints) per wave, in the same container, with masks.
- **Behaviour drift in interaction details** — the modals' click-catcher dismissal, the 40+ `setTimeout` success banners, the four wheel-listener hacks, dropdown click-catchers. Mitigation: port the *outcome* (a banner appears, a dropdown closes) and accept simpler mechanisms; document each intentional difference.
- **HTMX + CSRF.** Every `hx-post`/`hx-delete` needs the CSRF token; a global `htmx:configRequest` hook is the safe pattern.
- **`hx-boost` hazards.** Using `hx-boost` on the whole body can break file uploads and third-party scripts; use it selectively on navigation only.
- **Dual-auth drift.** A migrated page must never depend on the browser Supabase session. Mitigation: a static check asserts no migrated template or JS references `supabase`; the wave's E2E run logs out of the legacy SPA and still passes.
- **Wave-specific:** W6 has a latent timezone bug (`toISOString().split('T')[0]` at `Scheduler.tsx:171,686` vs `toDateString()` at `:489`) that **must be reproduced or explicitly corrected** — decide before starting, not during (§11 Q13). W6 also has untransacted bulk actions (`ManageSchedules.tsx:207-219`) that need a Django transaction, and its settings move server-side per §2.12 Decision A. W5's builder modal duplicates its field-editor JSX twice (`:454-551`, `:635-731`) — collapse it. W5's file upload is a plain `<input type="file">` and needs **no JavaScript**, contradicting the assumption that the builder needs a JS island. W4 must resolve the mock features per §2.12 Decision B before starting.
- **W4's reachable modals and `TeamMembersModal`'s unreachability** — resolved by §2.12 Decision B, not by the implementer.

**Blockers.** Per wave: the corresponding upstream phase. W6 additionally needs Q13 answered.

**Rollback.** Per route: add the route back to the proxy allowlist and remove the Django URLconf entry; the legacy page is served again. **Caveat, stated honestly:** for a protected route the legacy SPA may present a signed-out state, because its Supabase browser session may have expired while the user was on Django-rendered pages (the legacy SPA only refreshes its token when loaded). A legacy re-login may therefore be required — see [P4](#p4--auth-and-session-migration-parallel-not-cut-over). This is the central safety property of the whole plan and must be verified in **W1**, before any authenticated route moves.

**Acceptance criteria (per wave).**
- Every route in the wave is served by Django (the proxied-route count decreases by exactly the wave's route count).
- Visual/behavioural comparison against the P1 state matrix is within the agreed tolerance at **both** breakpoints.
- All interactive flows in the wave are manually verified against the P1 checklist and automatically covered where feasible.
- No migrated template or JS references `supabase`, Groq, or `localhost:3001` (static check on `templates/` and `static/js/`), and the wave's E2E run passes **with the legacy SPA logged out**.
- The route still works with the legacy stack stopped.

**Tests.** Per-route view tests (status, context, template used, auth requirement); per-modal fragment tests; an E2E Playwright test per wave covering its primary flows; the route-matrix test updated each wave.

**Must remain untouched until their own wave.** Every not-yet-migrated page, and the entire legacy stack. **Do not refactor the React code** while migrating it — the frozen legacy stack is the reference implementation and must stay behaviourally identical to the baseline.

**Difficulty.** **XL** overall (roughly 50% of total project effort), distributed as: W1 S, W2 S, W3 M, W4 M, W5 L, W6 XL, W7 L.

---

### P8 — Browser audio and media bridge

**Objective.** Replace the React audio path with the single, isolated, dependency-free JS module — and remove every browser API that does not need to exist.

**Prerequisites.** P3 (the Python endpoints), P6 (static pipeline). Should land **before** W7.

**Existing files affected (porting source).** `src/pages/AIVoiceAutoFill.tsx:58,115-182,200-284,334-371,430-821` — capture, transcribe-and-process, submit; `src/services/ai.ts:214-247` (audio player — **not ported**, replaced by `<audio controls>`), `:559-583` (export via Blob — **replaced by a Django download view**).

**New files.** `static/js/voice-recorder.js`; `apps/voice/templates/voice/partials/{recorder,transcript,chat,form,review}.html`; `apps/templates_app/views.py::export_template` (server-side download); `tests/e2e/test_voice_flow.py`.

**Dependencies.** None new. No npm, no build step.

**Data-flow change.** **This is the phase where the browser finally switches input contract** — from the legacy base64-JSON body to `multipart/form-data`. The Django endpoints have accepted both since P3, so this is a **client-only change requiring no server change**, which is the whole point of the P3 sequencing.

| Before | After | Server-side change required? |
|---|---|---|
| `MediaRecorder` → `Blob` → `FileReader.readAsDataURL` → base64 in a JSON POST | `MediaRecorder` → `Blob` → `FormData` **multipart** POST to `/api/transcribe/` | **None** — the multipart path exists and is tested (P3) |
| Browser calls Groq with the API key | Browser posts the transcript to `/api/ai/extract/`; Groq is server-side | None — done in P3 |
| TTS audio returned as base64, played via `new Audio()` | TTS audio returned as base64 and played by a plain `<audio controls src="data:audio/mp3;base64,…">` in the swapped fragment | None |
| Form state in React `useState`; submit inserts into `filled_templates` | HTMX posts the form; Django supplies `user_id` and persists | None — P5b services |
| Field mapping in the component | `apps/voice.services.apply_extraction()` | None — P3 |
| Export: `Blob` + synthetic `<a download>` + `createObjectURL` | `GET /templates/<id>/export/` with `Content-Disposition: attachment` | New view (small) |
| Audio preview: `URL.createObjectURL` | `URL.createObjectURL` in the same small module (still required for local preview) | None |

**The legacy base64-JSON contract is *not* deleted here.** The Express routes and Django's legacy-input path are both removed in **P11**, after the last React page is gone. P8's job is to make the browser stop using it — nothing more.

**APIs eliminated:** `FileReader`, `Audio` constructor, `HTMLAudioElement` handling, `createAudioPlayer`, the synthetic download anchor, and one of the two `createObjectURL` uses.

**Risks.**
- **Browser/OS codec variance.** The current code hardcodes `audio/webm;codecs=opus` (`AIVoiceAutoFill.tsx:128`), which **Safari does not support**. Behaviour in Safari is already broken or silently different. Mitigation: feature-detect (`MediaRecorder.isTypeSupported`) and fall back to `audio/mp4`; document this as a fix.
- **Microphone permission prompts** are user-visible and cannot be automated reliably. Mitigation: Playwright with fake media devices (`--use-fake-device-for-media-stream`).
- 🟠 **Contract switch must be atomic on the client.** If the new module ships while a stale cached bundle is in a user's browser, they may still post base64 — which is why the **server keeps accepting both until P11**. Mitigation: keep both paths, and add a metric/log line recording which contract each request used, so the legacy path can be proven dead before removal.
- **Upload size limits.** The current limit is 10 MB of base64 (~7.5 MB of audio) enforced client-side and 20 MB at `body-parser`. Django's `FILE_UPLOAD_MAX_MEMORY_SIZE`, `DATA_UPLOAD_MAX_MEMORY_SIZE` and the proxy body limit must be raised to match, or recordings that worked will start failing.
- **Auto-play policy.** The current code auto-plays the AI reply (`AIVoiceAutoFill.tsx:260`). Browsers block autoplay without interaction; today it "works" because the user clicked record. Under HTMX the interaction may not be registered by the audio element. Mitigation: keep an explicit play control; document the difference.

**Blockers.** None hard. A Safari/iOS test device is strongly recommended.

**Rollback.** The React voice page remains until W7; revert by leaving `AIVoiceAutoFill` on the legacy client and removing the module. Because the server still accepts both contracts, rollback is **contract-safe in both directions** — which is the specific reason P8 does not delete anything server-side.

**Acceptance criteria.**
- Recording, upload, transcription, extraction, field autofill, review and submit all work end-to-end with **no framework** — a single ~100-line module.
- The module has no dependencies and is loaded only on the voice page.
- The transcript → field mapping produces identical results to `applyExtractedDataToForm` across the P3 fixture set.
- Export downloads a JSON file whose contents match `exportTemplate`'s output byte-for-byte.
- No `FileReader`, no `new Audio()`, no data-URL uploads remain.
- The page degrades gracefully when the microphone is denied (a visible error, matching the current message).

**Tests.** Unit-ish DOM tests for the module's event contract; Playwright with fake media devices; a fixture-driven test for the extraction → form mapping; a manual matrix across Chrome/Firefox/Safari.

**Must remain untouched.** The Python STT/TTS/AI endpoints from P3 (they are already verified); the other 24 routes.

**Difficulty.** **M** — one to two weeks. Small code, high care: it is the product's core loop.

---

### P9 — Testing and parity verification

**Objective.** Turn "we think it matches" into a gate. This phase is continuous from P1 but is formalised here: the full suite runs on every change, and the migration is not declared complete until it passes.

**Prerequisites.** P1's harness; all prior phases.

**Existing files affected.** None (verification only).

**New files.** `tests/rls/test_policies.py` (from P5b, extended), `tests/rls/test_schema_reconciliation.py` (from P5a), `tests/e2e/test_visual_parity.py` (extended to the full state matrix), `tests/e2e/test_flows.py`, `docs/parity/reports/*`, `.github/workflows/ci.yml` (or equivalent), `docs/parity/manual-checklist.md`.

**Dependencies.** `pytest`, `pytest-django`, `playwright`, `respx`, a CI runner with a container image pinned for screenshot stability, and a **Supabase** environment (staging project or the local Supabase stack) for layers 4–6. **Layer 4 and 5 cannot be run against plain Postgres.**

**Data-flow change.** None.

**The seven verification layers**

| Layer | What it proves | Mechanism |
|---|---|---|
| **1. Route parity** | Every legacy route exists and nothing extra | One JSON route manifest checked against `src/App.tsx` (until deleted), the **proxy allowlist**, and `config/urls.py` |
| **2. Visual parity** | The design did not drift | State matrix (anonymous/authenticated × desktop/mobile), same container, per-region tolerance + masks; **authenticated** captures for all 12 app routes |
| **3. Behaviour parity** | Flows still work | Playwright E2E per flow: 13 modals, 3 wizards, all CRUD, search, filters, bulk actions, export, upload — run **with the legacy SPA logged out** |
| **4. Data parity** | The same operation produces the same row | Dual-run harness: perform an operation via legacy (Supabase client) and via Django against a Supabase staging environment, then diff the resulting rows (ignoring server-set timestamps) |
| **5. Security/RLS parity** | Access control is preserved, and fails closed | Per-policy allow/deny matrix as `authenticated` with a given `sub`; the `UnauthenticatedQuery` guard test; the alias-separation test |
| **6. Contract parity** | STT/TTS/AI responses match | Recorded fixtures compared between the Express and Django implementations, in **both** the legacy base64-JSON and the multipart input shapes, with documented tolerance |
| **7. Schema parity** | The database is reproducible and remediations are idempotent | Build from the baseline → zero diff; apply the live remediation twice → no change; no committed migration edited |

**Risks.**
- **Over-fitting the matrix.** A pixel-perfect target can lock in bugs. Mitigation: the baseline is captured from the *legacy* app, so it encodes current behaviour by construction; intentional differences are enumerated and excluded.
- **Flaky E2E.** Mitigation: deterministic seeded data, frozen clock, animations disabled, masked dynamic regions, retries only for infrastructure errors.
- **The dual-run harness needs a Supabase staging environment** — the same blocker as P1/P5a/P5b.
- **Nobody runs the tests** — a suite that is not in CI is decoration. This phase's real deliverable is the CI job.

**Blockers.** B1 (Supabase staging environment). Without it, layers 4–6 degrade to local-only checks and **layer 6's contract comparison is meaningless**.

**Rollback.** N/A — additive.

**Acceptance criteria.**
- CI runs all seven layers on every pull request; the job is required to merge.
- The route manifest matches exactly across the manifest, the proxy allowlist and `config/urls.py`, with **zero proxied routes**.
- The RLS matrix covers every policy in every migration, plus the P5a reconciliation migration.
- The fail-closed guard test and the alias-separation test pass.
- Every intentional behavioural difference is enumerated in `docs/parity/manual-checklist.md` with a justification.
- A documented, reproducible "parity report" is generated per release candidate.

**Tests.** This phase *is* the tests.

**Must remain untouched.** Nothing.

**Difficulty.** **L** — two to four weeks of harness work, then continuous cost.

---

### P10 — Deployment transition

**Objective.** Run the Django stack in production, retire the legacy stack from production, and keep a one-command path back.

**Prerequisites.** P7 complete for all routes; P9 green; **Q1 answered (where does this run today?)**.

**Existing files affected.** `package.json` (scripts become legacy-only), `README.md` (rewritten for the Django app), `.env.example`, `.gitignore`.

**New files.** `Dockerfile`, `docker-compose.yml` (web + optional worker), `deploy/` (reverse-proxy config, systemd or platform manifest), `docs/runbook.md` (deploy, rollback, backup/restore, incident), `.github/workflows/deploy.yml`.

**Dependencies.** A hosting target. There is **no existing deployment configuration of any kind** — this phase invents it. Options: a container host with a reverse proxy; a PaaS (Render/Fly/Railway); or bare metal. Requirements in all cases: a Gunicorn/Uvicorn process, static files via WhiteNoise or the proxy, TLS, a real domain, database connection pooling, and secret injection from the platform rather than files.

**Data-flow change.** DNS/traffic moves from the SPA host to Django. The legacy app can remain reachable at a temporary hostname for rollback. **The Django deployment must run the legacy API contracts until P11**, because cached client bundles may still use them (§P8).

**Backward-compatibility requirement (this is what makes rollback safe).** Every schema change made by P5a and any later migration must be **additive and backward-compatible**: new columns nullable or defaulted, new tables new, no renamed or dropped columns, no tightened constraints, no changed types. The legacy stack and the Django stack must be able to run **simultaneously against the same schema**. This is the specific property that reduces rollback to a traffic change.

**Risks.**
- 🔴 **No rollback target if the legacy deployment is torn down too early.** Mitigation: keep the legacy stack deployed and DNS-switchable for a full soak period; only then execute P11.
- 🟠 **OAuth and email redirect URLs hardcode the origin** (`lib/supabase.ts:33,73`; GoTrue allowlist). Every one must be updated to the production domain, or logins and resets break at cutover. **Note: adding the production URL to the allowlist is additive; removing the old one is not part of this phase.**
- 🟠 **The production reset placeholder** (`lib/supabase.ts:92`) must be resolved as part of this phase (it becomes `SITE_URL`).
- 🟠 **Static file serving** differs from Express; a misconfigured `STATIC_ROOT`/WhiteNoise produces an unstyled site that looks like a CSS bug.
- 🟠 **Sessions in production** require the `django` schema to exist, migrations to have run there, and a stable `SECRET_KEY` (§2.4).
- 🟠 **Model cold-start latency** for the speech clients (the current Express code constructs clients per process; Django should do the same or pay per-request cost).
- 🟡 **The README is substantially wrong** (claims `npm`-based setup, references a dead Supabase ref) and must be rewritten, including a LICENSE file (currently absent, acknowledged at `README.md:171`).

**Blockers.** B6: **production access and a domain.** B7: **a rollback window** agreed with whoever owns the users.

**Rollback — traffic and code only.**
- Rollback **is** a DNS/reverse-proxy change (plus redeploying the previous Django image if the fault is in Django). Because every schema change is backward-compatible by requirement above, the legacy stack keeps working against the same database, so **no data rollback is needed for an ordinary rollback**.
- **"Rolling back data" is not a thing this plan does.** If a *bad deployment corrupts or mis-writes data*, that is a **data incident**, handled with a targeted corrective migration or backfill, an assessment of what was affected, and (where the write was destructive) a restore from backup — never a generic "revert the new stack's data". Conflating the two is how a reversible deploy turns into an irreversible data loss.
- Data written by Django while it was live is **valid data** and is deliberately not reverted; the legacy stack can read it because the schema is shared and additive.

**Acceptance criteria.**
- All 25 routes, all flows and the voice loop verified in production against the P1 checklist.
- No client bundle contains Supabase, Groq or Google credentials.
- **Backward-compatibility verified:** the legacy stack and Django both run against production simultaneously during the soak, with no schema-related errors on either side.
- Monitoring: error tracking, request logging with correlation IDs, and an alert on 5xx rate.
- Backup and restore procedures tested by actually restoring into a scratch database.
- A written rollback procedure (traffic/code only) and a **separate** data-incident procedure, both executed once as drills.

**Tests.** A production smoke suite (route matrix + login + one CRUD flow + one voice flow) run against the live host; a post-deploy verification job in CI; a **dual-stack soak test** asserting the legacy app still reads and writes the shared schema without error.

**Must remain untouched.** The database schema (append-only), the storage bucket, and the legacy deployment (until P11).

**Difficulty.** **M** — one to two weeks, mostly environment work.

---

### P11 — Removal of React, TypeScript and Express, and closure of the transitional surfaces

**Objective.** Delete the legacy stack **only after sustained production parity**, and close every transitional mechanism introduced for the dual-stack period. This is the phase that makes the repository Python-owned **and** removes the temporary bridges.

**Prerequisites.** P10 green for a full soak period (recommend ≥2 weeks of production traffic with no rollback).

**Existing files affected (deleted).** `src/` (57 files, 17,055 non-blank lines), `server/` (4 files), `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `postcss.config.cjs`, `index.html`, `scripts/screenshot.js`, `scripts/test.js`, `node_modules/`, `dist/`, `archive/`, `.bolt/`, `.commandcode/`, `src/config/credentials.ts` (already gone from P0).

**Transitional surfaces removed in this phase** — each was introduced deliberately, with this end date:

| Surface | Introduced | Removed here |
|---|---|---|
| The **proxy allowlist** and `legacy_proxy` view | P6 | deleted (gated on zero forwards during the soak) |
| The **Supabase-bearer credential path** in `apps/api/auth.py` | P3 | deleted — session auth only |
| The **legacy base64-JSON input contract** on `/api/transcribe/` | P3 | deleted — multipart only |
| The `INTERNAL_API_TOKEN` header control | P3 | deleted |
| The **legacy Supabase browser session** and `supabase-js` in the bundle | pre-existing | gone with `src/` — **this closes the final §2.4 gate: no Supabase token or key exists in the browser at all** |
| `supabase/.temp` linkage and the legacy stack deployment | pre-existing | the deployment is torn down; local dev uses the local Supabase stack |

**New files.** `docs/legacy-removal.md` (what was deleted, when, the commit SHA and tag to recover it from, and the list of transitional surfaces now closed).

**Dependencies.** None. Removing `package.json` removes the last Node dependency **provided** Tailwind runs from its standalone binary (§4.4, §11 Q12).

**Data-flow change.** None — everything already routes through Django.

**Risks.**
- **Deleting the reference implementation** removes the ability to answer "how did this behave before?". Mitigation: the git tag from P10 preserves it forever; the deletion commit message must reference the tag; `docs/parity/` keeps the baseline.
- **A migration not actually complete** (a route still proxied, a feature only reachable from the SPA). Mitigation: the proxy is disabled **before** deletion, and P11's gate is "the proxy has logged zero forwards for the soak period".
- 🟠 **Deleting the legacy input contract while a cached client bundle still uses it.** Mitigation: **do not delete on schedule — delete on evidence.** The P8 request logging must show **zero** legacy-contract requests for the soak period before the path is removed.
- **Losing useful artefacts** — `new pages/*.html` (design source of truth), `page-screenshots/`, `docs/tables.md`. Mitigation: these move to `design_reference/` and are explicitly **not** deleted.
- **The committed database dump** (`backups/`) — deleted in P0 from git; if a private copy is retained for local restore, it stays out of the repo.

**Blockers.** B8: soak-period agreement. Plus the evidence gate above.

**Rollback.** Traffic/code rollback ceased to be available at P10's end (the legacy deployment is torn down here). The pre-deletion state is a **git tag**; `git revert` or a branch reset restores the code, and the legacy stack would have to be redeployed. This is the *only* phase whose rollback is a history/redeploy operation rather than a config change — hence the strict prerequisite and the evidence gate.

**Acceptance criteria.**
- `git ls-files` contains no `.ts`, `.tsx`, `.jsx`, `package.json` or `package-lock.json` (except vendored third-party JS in `static/js/vendor/`).
- No proxied routes; the proxy view and its allowlist are deleted.
- `apps/api/auth.py` accepts **only** Django sessions (no bearer path); a test asserts a Supabase bearer token is now rejected.
- `/api/transcribe/` accepts **only** multipart; a test asserts the legacy base64-JSON body is now rejected.
- `INTERNAL_API_TOKEN` no longer exists in settings or code.
- **No Supabase key or token is present in anything served to the browser** (static scan of the built assets).
- The repository builds, tests and deploys with **no Node**.
- `docs/parity/` and `design_reference/` are intact.
- README describes only the Python stack, and a LICENSE file exists.

**Tests.** The full P9 suite runs green against a checkout without `node_modules` and without Node installed; negative tests for each removed transitional surface (bearer rejected, legacy contract rejected, proxy 404s).

**Must remain untouched.** `supabase/migrations/*` (all of them, forever — including the P5a reconciliation and the baseline), `design_reference/`, `docs/tables.md`, and the Supabase project itself.

**Difficulty.** **S** — days of mechanical deletion, gated by a long prerequisite and an evidence check.

---

## 6. What cannot or should not be converted to Python

Stated plainly, because "100% Python" is not the goal.

### 6.1 Cannot — physically impossible in a browser

| Capability | Where it lives today | Why Python cannot replace it |
|---|---|---|
| Microphone capture | `AIVoiceAutoFill.tsx:118` `getUserMedia` | Runs in the user's browser process under the browser's permission model |
| Audio encoding/recording | `AIVoiceAutoFill.tsx:127-147` `MediaRecorder` | Same |
| Audio playback | `AIVoiceAutoFill.tsx:220,260,322` `new Audio()` | Same |
| Local object URLs | `AIVoiceAutoFill.tsx:143`, `lib/templates.ts:572` `createObjectURL` | Same |
| Clipboard writes | `Documentation.tsx:152`, `Privacy.tsx:31`, `TemplateCard.tsx:133` | Same |
| Focus, Escape, scroll, drag/drop | Throughout the modals | Same |
| CSS animations/view transitions | Throughout | Same |
| DOM swapping after a click | Every React `onClick` | Replaced by **HTMX**, which is server-driven HTML — but the *client-side* mechanism is still JS (vendored, not written by us) |

**Total hand-written JavaScript in the end state: ~90–130 lines** (the recorder module plus the clipboard helper) **and zero localStorage**, down from 17,055 lines of TS/TSX — *conditional on [§2.12](#212-application-state-ownership--resolving-the-localstoragemock-contradiction) Decisions A and B being approved as recommended*. If per-browser preferences are kept for strict parity, add ~40–60 lines of JS plus 2–3 Alpine components, and the settings remain per-browser permanently.

### 6.2 Should not — converting would make the application worse

| Thing | Why it stays as-is / non-Python |
|---|---|
| **HTMX and Alpine** | Vendored third-party JS. Rewriting them in Python via PyScript/Brython would add a large runtime, hurt performance and break accessibility. |
| **Tailwind CSS** | A CSS framework; the *build tool* changes to a native binary but the framework and tokens stay identical. |
| **Google Fonts links** | Plain `<link>` tags in `base.html`. |
| **Supabase GoTrue for identity** | Replacing it with `django-allauth` invalidates every password hash and forces a global reset. See §2.3 Option C. |
| **Supabase-managed Postgres + RLS** | RLS is Postgres's own feature and is *more* valuable now that a server accesses the data. Re-implementing it in the ORM removes the backstop. |
| **The seven applied migrations** | Append-only. Editing an applied migration is how schema drift starts. |
| **`dev-status.md`-style docs and the committed backups** (excluding the PII dump) | Historical value; no reason to port or delete. |
| **The 42-cell month grid and 24×7 week grid** (`Scheduler.tsx`) | Server-rendered HTML is the right medium, but the date arithmetic must be done **carefully in Python** with explicit timezone handling — not blindly translated from the current mixed `toISOString()`/`toDateString()` code. |
| **Client-side filtering with instant feedback** (e.g. `HelpCenter`) | Where a round-trip is genuinely worse, `hx-trigger="keyup changed delay:300ms"` keeps it server-side; only if a page needs true zero-latency filtering is a small Alpine filter justified. |

### 6.3 Deliberately not converted yet

| Thing | Reason |
|---|---|
| Background job runner (reminders, `scheduled_events.reminder_minutes`) | Nothing sends reminders today. Adding it is new functionality, not migration. |
| Streaming transcription (`StreamingRecognize`) | The current app records then uploads. Changing to streaming is a product change with a cost implication. |
| Real-time UI updates (Supabase Realtime) | Not used anywhere (`grep` finds no `channel`/WebSocket/EventSource). |
| Moving off Supabase entirely | Deferred (§2.3 Option C) — a possible follow-up migration, not this one. |

---

## 7. Security checklist — must fix before migration begins

Ordered by severity. Items 1–6 are **P0 blockers**; the schema items (7, 8, 11, 13, 14) are actioned in **P5a** as guarded additions; the rest are `must-fix` before **P5b** or P10.

| # | Issue | Evidence | Severity | Fix | Gate |
|---|---|---|---|---|---|
| 1 | Google Cloud **service-account private key committed to git** | `service-account.json` tracked (`git ls-files`) | 🔴 Critical | Rotate in GCP; purge from history; untrack; gitignore | P0 |
| 2 | Same key **copied into `dist/`** on every build | `package.json` `copy-service-account`; `dist/service-account.json` exists | 🔴 Critical | Delete the script and the artefact | P0 |
| 3 | **Groq API key in the shipped client bundle** | `VITE_GROQ_API_KEY` (`config/api.ts:15`); `gsk_…` found in `dist/client/assets/index-DnWuFiMr.js` | 🔴 Critical | Rotate; move server-side in P3; remove the `VITE_` variable | P0 |
| 4 | **Database dump committed** | `backups/db_cluster-12-08-2025@20-15-27.backup` + `.gz` tracked (329 KB) | 🔴 Critical | Untrack, purge, store privately if a local restore is needed; rotate the DB password if present in the dump | P0 |
| 5 | `users` SELECT policy is `USING (true)` | `20250628064052_twilight_disk.sql:39-43` | 🔴 Critical | Replace with a self-scoped (and minimal-column) policy | P0 |
| 6 | `filled_templates` has **no RLS** | no DDL anywhere; used with the anon key | 🔴 Critical | Add RLS + owner-scoped policies (the table's existence and columns are established in **P5a**, not assumed) | P0 (policy) + P5a (DDL) |
| 7 | `template_shares` / `template_reviews` **writes denied** (SELECT-only policies) | `precious_brook.sql:50,66` | 🟠 High | Complete the policy sets — **as guarded, idempotent additions**, in the P5a reconciliation migration | **P5a** |
| 8 | `template_shares` / `template_reviews` **reads open to all authenticated users** (`USING (true)`) | same file | 🟠 High | Scope reads to the share/review participants, in the same guarded migration | **P5a** |
| 9 | Credentials imported into the **client module graph** | `config/credentials.ts:1` → `config/api.ts:1` | 🟠 High | Delete the file (it is not in the bundle today only by tree-shaking luck) | P0 |
| 10 | **PostgREST filter injection** | `lib/scheduler.ts:275` interpolates raw user input into `.or(...)` | 🟠 High | Parameterised query in Python | **P5b** |
| 11 | Duplicate PUBLIC-role policies on `templates` | `20250612155158_humble_fire.sql:16-37` | 🟡 Medium | Drop them (guarded, idempotent) | P0 or P5a |
| 12 | Express API routes are **unauthenticated**, CORS `*`, 20 MB body | `server/index.ts:11`, `routes/transcription.ts:15` | 🟠 High | P3 adds the dual credential check + a **temporary** `INTERNAL_API_TOKEN` on loopback; **P4 makes auth mandatory** (Django session or Supabase bearer); **P11 deletes the bearer path and the token** | P3 → P4 → P11 |
| 13 | Possible **self-referencing RLS recursion** on `team_members` | `aged_tree.sql:158-162,181-186,195-199` | 🟡 Unverified | Test against the live DB in P5a's classification; if it errors, rewrite with a `SECURITY DEFINER` helper in the reconciliation migration | **P5a** |
| 14 | `on_auth_user_created` has **no `ON CONFLICT`**; `users.email` is UNIQUE | `twilight_disk.sql:61-73` | 🟡 Medium | Add `ON CONFLICT DO NOTHING` or handle the collision — a guarded addition | **P5a** |
| 15 | Errors returned to the client include `error.message` | `transcription.ts:70` | 🟡 Low | Generic external messages; log details | P3 |
| 16 | No rate limiting anywhere | — | 🟡 Medium | Per-IP/per-user limits on auth and AI endpoints | P3/P4 |
| 17 | `.env` `GOOGLE_PRIVATE_KEY` — real or placeholder? | length 23 suggests a placeholder | ⚠️ Unknown | **Verify by a human**; if real, rotate | P0 |

**Also required (hygiene, not exploitation):** add a `gitleaks`/`trufflehog` pre-commit hook; add `*.backup`, `*.zip`, `service-account.json` and `dist/` to `.gitignore`; document the incident and remediation in `docs/security-remediation.md`.

**Judgement call to record explicitly:** the Google key and the Groq key must be treated as **compromised** and rotated regardless of whether the repository is public, because git history cannot be recalled and clones may exist.

---

## 8. Parity verification strategy

### 8.1 The existing visual baseline is not usable for authenticated pages

Five of the committed screenshots are **byte-identical in size** to `login.png` (208,612 B): `login.png`, `AIVoiceAutoFill.png`, `manage-schedules.png`, `scheduler.png`, `scheduler-settings.png`. That is the signature of a logged-out visit to a guarded route, which renders a blank page (§1.3 — `if (!user) return null`). Consequently **the current `page-screenshots/` set captures none of the authenticated application.** Any plan that treats it as a golden set would "verify" a blank page.

P1's first deliverable is therefore an **authenticated capture harness with seeded data**, on a **real Supabase environment** (staging project or the local Supabase stack — never plain Postgres, which reproduces none of GoTrue, `auth.uid()`, the Supabase roles or Storage RLS).

### 8.2 The seven layers

See the table in [P9](#p9--testing-and-parity-verification). Summary of what each proves and its cost:

| Layer | Confidence it buys | Cost |
|---|---|---|
| Route parity | Nothing is missing | Low — a manifest and a test |
| Visual parity | The design did not drift | Medium — needs a pinned container, seeded auth, a state matrix and masks |
| Behaviour parity | Flows still work | High cost, high value — E2E per flow, run with the legacy SPA logged out |
| Data parity | Writes are equivalent | High — needs a **Supabase** environment + dual-run harness |
| Security/RLS parity | **Security is preserved, and fails closed** | Medium — the highest value per hour in the project |
| Contract parity | AI/STT/TTS behave the same, **in both input contracts** | Medium — recorded fixtures |
| Schema parity | The database is reproducible; remediations are idempotent | Medium — baseline build + double-apply test |

### 8.3 Tooling

- **Playwright for Python** replaces `scripts/screenshot.js`, reusing its good ideas: route discovery from a manifest, retry with backoff, `waitUntil: networkidle`, `document.fonts.ready`, image-completeness waits, full-page capture — at **both 1440×900 and 390×844**.
- **The baseline is a state matrix, not one screenshot per route:** `{anonymous public, anonymous auth pages, authenticated app} × {desktop, mobile}`, with a frozen clock, `prefers-reduced-motion: reduce`, animations disabled, and masked dynamic regions. "Diff zero" is explicitly **not** an acceptance criterion; "diff within tolerance, only inside masks" is.
- **Golden storage:** `docs/parity/baseline/` (committed), reports per run in `docs/parity/reports/` (gitignored except for release candidates).
- **RLS harness:** a pytest fixture that opens the **same** transaction context the application uses (`rls_context`), runs a query as a given user, and asserts the row count. One test per policy, per direction (owner allowed, non-owner denied), plus a **fail-closed test** asserting that a query on the `supabase` alias outside the context raises `UnauthenticatedQuery`.
- **Dual-run harness:** for each write path, execute it through the legacy Supabase client and through Django against a Supabase staging environment, then compare the persisted rows with timestamps normalised.
- **Schema harness:** build a clean stack from the baseline and diff; apply the live remediation **twice** and diff (idempotence).

### 8.4 What parity explicitly does **not** cover

Intentional differences are enumerated and excluded, not silently ignored. Known intentional differences to date:

| # | Intentional difference | Decided in |
|---|---|---|
| 1 | Route guards **redirect** to `/login?next=…` instead of rendering a blank page | P4 / §1.3 |
| 2 | The modal shell uses native `<dialog>` with focus trap, Escape-to-close and body-scroll-lock (the current modals have none of these) | §1.5 / P6 |
| 3 | `/api/*` (speech + AI) **requires authentication** — session from P4, dual-credential during P3–P11, session-only from P11 | P3 / P4 / P11 |
| 4 | The `microsoft` OAuth provider id is corrected to `azure` | §2.4 |
| 5 | **OAuth actually works** (it cannot today — §1.9 defect 1) | §2.4 |
| 6 | **OAuth uses PKCE**, not the implicit flow | §2.4 |
| 7 | `searchEvents` is a parameterised query, not an interpolated PostgREST filter (closes an injection) | P5b |
| 8 | Dead exports and dead components are not ported (`getCurrentUser`, `getEventStats`, `extractDataFromText`, 8 components) | §1.14 |
| 9 | `ScrollToTop` is deleted (server navigation resets scroll) | §1.5 |
| 10 | **Dashboard/scheduler preferences move from localStorage to the database** — they become per-user instead of per-browser | **§2.12 Decision A (needs sign-off)** |
| 11 | **The team / review-queue / activity mocks are implemented or deleted, not recreated** | **§2.12 Decision B (needs sign-off)** |
| 12 | Scheduler date handling is made timezone-correct rather than reproducing the current `toISOString()`/`toDateString()` inconsistency | **Q13 (needs sign-off)** |
| 13 | The "Keep me signed in" checkbox either works or is removed (it is currently a no-op) | Q8 |
| 14 | The share-link generator is either made to work or removed (the route does not exist) | Q16 |
| 15 | Export/download is served by Django instead of a client-side Blob | P8 |
| 16 | Recording upload uses `multipart/form-data` (33% smaller) instead of base64-in-JSON | P8 |
| 17 | Safari codec support is fixed via `MediaRecorder.isTypeSupported` fallback | P8 |
| 18 | Timestamps and ownership columns are **server-supplied**; the client can no longer claim them | §2.5 |
| 19 | `filled_templates` gains RLS and owner-scoped policies (it has none today) | P0 |
| 20 | Pagination/limits are not introduced — the current "fetch everything" behaviour is preserved | — |

Differences 10, 11 and 12 require explicit sign-off **before** the wave that depends on them (P7 W4 for 10 and 11, W6 for 12).

---

## 9. Estimated relative difficulty per phase

Weights are shares of total migration effort; "weeks" assumes one experienced developer with agentic assistance and **assume the blockers are cleared promptly**.

| Phase | Difficulty | Share of effort | Indicative weeks | Notes |
|---|---|---|---|---|
| P0 Security | **S** | 3% | 0.5–1 | Blocked on console access, not code |
| P1 Baseline | **M** | 7% | 1–2 | Environment plumbing dominates; state matrix + Supabase env |
| P2 Django foundation | **S** | 4% | 0.5–1 | Mostly configuration; includes the Q19 state decision |
| P3 Service layer | **M** | 8% | 1–2 | Mechanical port; dual contract + fixtures are the work |
| P4 Auth (parallel) | **L** | 15% | 2–4 | Highest failure-proneness; two live session authorities |
| **P5a Schema reconciliation** | **M–L** | 8% | 1–3 | Blocked on live DB access; classification and review, not SQL volume |
| **P5b Data access** | **XL** | 18% | 3–7 | Highest risk; blocked on P5a and the RLS-context spike |
| P6 Shared UI | **M** | 7% | 1–2 | Enables everything after; allowlisted proxy |
| P7 Page migration | **XL** | 20% | 4–7 | Split across 7 waves |
| P8 Audio bridge | **M** | 4% | 1–2 | Small code, high care; switches the browser's input contract |
| P9 Parity | **L** | 5% | 1–2 + continuous | Overlaps everything; includes schema idempotence |
| P10 Deployment | **M** | 3% | 0.5–2 | Greenfield; no config exists today |
| P11 Removal | **S** | 3% | 0.5–1 | Gated by the soak period **and** by evidence that the transitional surfaces are unused |
| **Total** | | **100%** | **≈18–36 weeks** | Excludes the soak period |

**Where the uncertainty is:** P5b could be 2× if the RLS context/guard cannot be made reliable and Option B2 is needed (every one of the 38 call-sites becomes security-critical, and the fail-closed property is lost). P5a is unbounded if the live database is unreachable (it stops the migration). P7's W6 could be 2× if the calendar/timezone questions are not settled before it starts. P4 could be 1.5× if the Supabase email-template change is not permitted.

**Cheapest high-value phase:** P0. **Highest value per hour within the migration:** the RLS test suite in P5b/P9. **Most likely to be underestimated:** P1, P5a and P9 — verification and reconciliation work is always more than it looks, and this repository has literally zero of either.

---

## 10. Migration order and dependency graph

```
P0 Security ──► P1 Baseline ──► P2 Django foundation
                                    │
              ┌─────────────────────┼───────────────────────┐
              ▼                     ▼                       ▼
        P3 Service layer      P6 Shared UI       P5a Schema reconciliation
       (legacy contract)      (allowlisted       (needs live DB access)
              │                proxy)                    │
              ▼                     │                     │
        P4 Auth (parallel,          │                     │
        legacy session kept)        │                     │
              │                     │                     │
              └──────────┬──────────┘                     │
                         ▼                                ▼
                 P7 Waves 1–2 ◄─────────────────── P5b Data access
                         │                      (rls_context + guard)
                         ▼
           P7 Waves 3–4 (needs P4, P5b)
                         │
                         ▼
           P7 Waves 5–6 (needs P5b)
                         │
                         ▼
        P8 Audio bridge ──► P7 Wave 7
                         │
                         ▼
               P9 Parity (continuous from P1)
                         │
                         ▼
               P10 Deployment (backward-compatible schema, dual-stack soak)
                         │
                    (soak ≥2 weeks + zero proxy forwards + zero legacy-contract hits)
                         ▼
               P11 Remove React/TS/Express + close transitional surfaces
```

**Hard gates (must be satisfied before the dependent phase starts):**

| Gate | Blocks | Owner |
|---|---|---|
| **G0 Q21 answered — activity log: make it real, or delete it** | **P1** (it changes the route manifest) | Human (product) |
| **G1 Live database access, or a written decision that it is gone** | **P5a** (and therefore P5b and P7 W4+) | Human with DB access |
| **G2 `supabase/baseline/` + `supabase/config.toml` permitted; the `django_app` bootstrap role approved** | P5a, P2 | Human |
| **G3 RLS context spike passes** — `SET LOCAL ROLE authenticated`, `set_config`, the fail-closed guard, and pooler survival | **P5b** | Engineer |
| G4 Supabase email-template (`TokenHash`) + redirect-URL edit; PKCE enabled | P4 | Human with dashboard access |
| G5 Supabase staging environment (project or local stack) + seeded test user | P1, P4, P5a, P5b, P9 | Human |
| **G6 Django-owned state decided** (dedicated `django` schema vs Redis sessions; admin yes/no) | P2, P4 | Human |
| **G7 §2.12 Decisions A and B signed off** | P7 W4 (and the JS estimate) | Human (product) |
| G8 Deployment target + domain + rollback window | P10 | Human |
| G9 Timezone question answered (Q13) | P7 W6 | Human |

**Can run in parallel:** P3, P4, P5a and P6 all depend only on P2, and **P5a does not depend on P4**. **W1 and W2 of P7 need only P6** — they can and should start while P4/P5a/P5b are still in flight, because they are what proves the rendering pipeline *and* the proxy rollback before anything authenticated moves. W3 waits for P4; W4+ waits for P5a **and** P5b; W7 waits for P8.

---

## 11. Open questions and decisions requiring human approval

Each of these blocks or shapes work. None can be answered from the repository. Rows marked **⛔** are the five decisions that gate implementation — see the verdict at the end of this document.

| # | Question | Why it matters | Recommendation |
|---|---|---|---|
| **Q1** | **Is this application deployed anywhere today, and where?** No deployment config exists at all. Is there a live URL, and who visits it? | Decides P10 entirely, and whether a cutover affects real users | Answer before P10; keep the legacy host for rollback |
| **Q2** | **Is the Supabase project `aajgkpzuffhuuffaneqi` still alive?** `README.md:122` says DNS fails | Determines whether real data and real identities exist at all | Verify first, before P1 |
| **Q3** ⛔ | **Can we get read access to the live database, or is it gone?** This is a *different* question from "can we guess the schema". `template_shares`, `template_reviews` and `filled_templates` have no DDL in the repo | **Hard blocker for P5a, and therefore for the whole migration from P7 W4 onward.** If access is impossible, the three options are (a) treat the `backups/` dump as the reference — labelled as possibly stale, (b) rebuild the tables from the client contract **with written approval for the data-loss risk**, or (c) stop | `pg_dump --schema-only` committed under `supabase/schema_dump/`, then the full [P5a](#p5a--schema-reconciliation-mandatory-before-any-data-access-work) reconciliation |
| **Q4** | **Is the GitHub repository public?** | Determines the urgency of P0 and whether the committed keys are already public | Treat as public; rotate regardless |
| **Q5** ⛔ | **Preferences: per-browser or per-user?** Dashboard + scheduler settings live in localStorage and are **not per-user** | It is a genuine behaviour change (settings would follow the user), and it decides whether a JS island is needed at all | **[§2.12 Decision A](#212-application-state-ownership--resolving-the-localstoragemock-contradiction): move them to Postgres.** The maintainability goal is not served by preserving per-browser state. **Requires product sign-off before P7 W4.** |
| **Q6** ⛔ | **Mocks: port them, implement them, or delete them?** Team/invites (real tables exist, zero client usage, seeds 2 fake members), review queue (shadows `template_reviews`), activity log (**no table at all**) | The largest scope ambiguity in the plan, and it decides the JS estimate and whether new schema is needed | **[§2.12 Decision B](#212-application-state-ownership--resolving-the-localstoragemock-contradiction): implement team + review queue against the existing tables; decide the activity log explicitly** (add a table, or remove `/activitylog` and the dashboard feed — which drops the route count to 24 and must be settled before P1 captures the baseline). **Do not recreate the mocks for parity's sake.** |
| **Q7** | **Should `TeamMembersModal` be ported at all?** It is imported and rendered but **unreachable** (`setShowTeamModal(true)` never called) | Wasted effort if ported; a silent feature deletion if not | Subsumed by Q6: if team is implemented, this becomes its real UI; otherwise **delete** it |
| **Q8** | **The "Keep me signed in" checkbox does nothing.** Implement or remove? | It is user-visible and misleading | Implement it in P4 (a real session-length choice), or remove it |
| **Q9** | **When does validation become strict?** P3–P9 run log-only | Strict validation could reject payloads the old app accepted | Keep log-only until after P10's soak; then flip deliberately |
| **Q10** | **May the speech and AI endpoints require authentication?** They are open today (localhost only) | Security fix, but a behaviour change if anything external calls them | Yes — mandatory from **P4** (session or Supabase bearer), bearer path removed in P11; verify nothing else calls them |
| **Q11** | **Is a one-time forced re-login acceptable — and for whom?** Django-rendered routes require a Django sign-in; the legacy SPA needs its own session during the dual-stack period | Users may be asked to sign in to the new routes while already signed in to the old ones | Yes; announce it. GoTrue identities and passwords are unchanged. **This replaces v0.1's claim that existing sessions are simply invalidated.** |
| **Q12** | **Is a Node-free build required, or is `django-tailwind` + npm acceptable?** | Determines whether Node survives the migration | Node-free via the standalone Tailwind CLI (§4.4) |
| **Q13** | **Timezone correctness in the scheduler: preserve the current mixed date handling, or fix it?** `toISOString().split('T')[0]` vs `toDateString()` is a latent bug | A parity port would faithfully reproduce a bug; a fix changes behaviour | **Fix it**, and list it as an intentional difference — but decide before W6 starts |
| **Q14** | **Are the dead component files wanted as templates?** In particular the dead `ScheduleStats`, `UpcomingEvents`, `RecentActivity`, `TeamTemplates` markup | They may contain markup the pages lack | Reviewed at P6; port markup (not files) only where the live page is missing something |
| **Q15** | **Who owns the production secrets store?** | P0 and P10 both depend on it | Decide before P0 completes |
| **Q16** | **Should the `/templates/shared/<id>` share link be made to work?** It is generated but unrouted | Currently a dead feature users may have been given | Restore it (a small, useful fix) or remove the generator |
| **Q17** | **Is the product "Audentra" or "VoiceForm"?** The UI says Audentra; the repo/package say VoiceForm | Affects domains, email templates, copy and the deploy target | Decide before P10; the plan uses "audentra" as the project name |
| **Q18** | **Is Playwright-driven visual parity an acceptable gate, or is manual review preferred?** | Automated pixel diffing has real maintenance cost | Automated with a tolerance and masks, plus a manual checklist for flows |
| **Q19** ⛔ | **Where does Django's own state live, and what is `request.user`?** Database-backed sessions need `django_session`; `django.contrib.admin` would add `auth_user`, `auth_permission` and `django_content_type` | **This is one of the five decisions gating implementation.** It determines settings, database aliases, whether `django.contrib.auth` is usable at all, and how P2's `migrate` behaves against a Supabase-managed database | **[§2.4](#24-auth-and-session-design): a dedicated `django` Postgres schema** for `django_session` + `django_migrations`, owned by a least-privilege **`django_app`** role (**never** `service_role`); **no `django.contrib.admin` initially**; `request.user` is a `SupabaseUser` principal (**not** a Django model, and **carrying no tokens**); `django.contrib.auth.login()` is not used. `public` is never touched by Django DDL. Redis sessions are the preferred alternative if Redis is available. **Decide before P2.** |
| **Q20** | **Do we want operational admin at all?** | Enabling `django.contrib.admin` drags in a Django user model and its tables, which conflicts with GoTrue-owned identity (GoTrue holds the passwords) | **No admin initially.** If needed later, a Django-owned staff table in the `django` schema, populated separately — an explicit, separate decision |
| **Q21** ⛔ | **Is the activity log a product feature or an artefact?** It is localStorage + hardcoded fake items with **no table** | Decides whether a new table is added (real feature) or `/activitylog` and the dashboard feed are deleted (route count 25 → 24) | Decide **before P1**, because it changes the route manifest and therefore the baseline — see [P1's prerequisites](#p1--behaviourui-baseline-and-test-capture) |
| **Q22** | **What happens to the transitional surfaces if the migration is paused?** The dual-auth bearer path, `INTERNAL_API_TOKEN`, the legacy input contract and the proxy are all temporary by design | An abandoned migration would leave four transitional mechanisms permanently in place | Each is recorded with an owning phase and a removal phase; if the migration stops, removing them is a defined cleanup task |

---

## 12. Risk register

| ID | Risk | Likelihood | Impact | Mitigation | Phase |
|---|---|---|---|---|---|
| R1 | **Live database unreachable** → no schema, no reconciliation, migration halts | **High** | **Critical** | P0 preserves the dump privately as a fallback reference; **P5a stops rather than guesses**; the three options (dump-as-reference / approved rebuild / stop) are Q3 | P0/P5a |
| R1a | **A guessed `CREATE TABLE` runs against a live table that already exists** | Medium (v0.1's design made this likely) | **Critical** | Removed by design: P5a separates the fresh-install **baseline** from **guarded, additive, idempotent** live remediation; none is applied to live before a zero-delta diff on a restored copy | P5a |
| R2 | **The RLS context cannot be made reliable** (pooler, role permissions, `set_config` scoping) → RLS not enforced from Django | Medium | **Critical** | G3 spike before P5b; the design is Supabase-documented; Option B2 fallback with an explicit ORM-scoping audit (which also loses the fail-closed property) | P5b |
| R3 | **A code path reaches the `supabase` alias without an RLS context** | Medium | **Critical** | `RLSQueryGuard` raises `UnauthenticatedQuery` at query time — structural, not conventional; alias separation; a negative test asserts the exception | P5b |
| R3a | **A missing ORM scoping filter** leaks data (relevant only under fallback B2) | Medium | **Critical** | Under the chosen design RLS remains the backstop; per-policy tests; "no claims ⇒ no rows" test | P5b |
| R4 | Auth regression locks users out of migrated routes | Medium | **High** | **No admin bypass.** Rollback is the preserved legacy route/host + proxy switch, where the user's Supabase session is still valid; enable auth one route at a time (W3 first); staging verification. **Caveat: a legacy re-login may be required after rollback** | P4 |
| R4a | **Dual-stack session confusion** (signed in to one stack, not the other) | **High** during the overlap | Medium | Documented as an accepted artefact (§P4); no attempt to synchronise the two session stores; ends at P7 W7/P11 | P4–P11 |
| R5 | Visual/behavioural drift goes unnoticed | **High** (no tests exist) | Medium | P1 state-matrix baseline before any porting; per-wave comparison at both breakpoints | P1/P7 |
| R6 | Scope creep — "fix it while porting" | **High** | High | Parity rule (§1.12); fixes go to P0 or the backlog; intentional differences enumerated in §8.4 | All |
| R7 | The 8 dead components and the duplicated patterns are ported by accident | Medium | Medium | Explicit dead-code list (§1.14); P6 review gate | P6 |
| R8 | Committed secrets already public | Medium | **Critical** | Rotate regardless of Q4; purge history; scan in CI | P0 |
| R9 | Timezone bug reproduced (or silently fixed) inconsistently | **High** | Medium | Q13 decided before W6; explicit tests around date boundaries | P7 |
| R10 | Tailwind/styling divergence between stacks | Medium | Medium | Shared token file, one build, no reinterpretation | P6 |
| R11 | Long dual-stack period causes confusion and drift | **High** | Medium | The proxy allowlist counts proxied routes; the P11 gate is zero forwards; the dual-auth window and legacy contract each have an owning removal phase | P6–P11 |
| R11a | **A transitional mechanism becomes permanent** (bearer auth, `INTERNAL_API_TOKEN`, legacy contract, proxy) | Medium | High | Each is recorded in §P11's table with an owning phase; removal is gated on **evidence of zero use** (logs), not on a date | P11 |
| R11b | **A cached client bundle still posts the legacy contract** after P8 | Medium | Medium | The server keeps accepting both until P11; requests are logged by contract type; deletion is evidence-gated | P8/P11 |
| R12 | No deployment config exists; cutover planned last-minute | **High** | High | P10 begins its environment work early, not after P7 | P10 |
| R13 | Agentic workflow produces inconsistent code across 25 pages | Medium | Medium | One wave per PR; a pattern established in W1–W4 and enforced by review; shared partials/macros | P7 |
| R14 | Node removal breaks the Tailwind build | Low | Medium | Standalone CLI validated in P2 | P2/P11 |
| R15 | The committed DB dump contains PII and is already public | Medium | **Critical** | P0 purge; treat as an incident | P0 |
| R16 | **Django's own tables collide with Supabase's `public` schema** | Medium | Medium | Dedicated `django` schema; `search_path` per alias; a test asserts no Django-created table in `public` | P2 |
| R17 | **Rollback is misused to "undo data"** | Low | **Critical** | P10 defines two separate procedures: traffic/code rollback (routine) and data-incident response (targeted corrective migration/backfill, never a generic revert) | P10 |

---

## Appendix A — Route-by-route migration matrix

| Route | React file | Lines | Shell | Auth | Data (after migration) | Wave | Phase deps |
|---|---|---|---|---|---|---|---|
| `/` | `Home.tsx` | 760 | public | no | none | W2 | P6 |
| `/features` | `Features.tsx` | 411 | public | no | none | W1 | P6 |
| `/industries` | `Industries.tsx` | 263 | public | no | none | W1 | P6 |
| `/security` | `Security.tsx` | 214 | public | no | none | W1 | P6 |
| `/pricing` | `Pricing.tsx` | 255 | public | no | none | W1 | P6 |
| `/about` | `About.tsx` | 181 | public | no | none | W1 | P6 |
| `/contact` | `Contact.tsx` | 126 | public | no | none (form is inert today) | W1 | P6 |
| `/status` | `Status.tsx` | 293 | public | no | none | W1 | P6 |
| `/help-center` | `HelpCenter.tsx` | 328 | public | no | none (client filter → HTMX) | W1 | P6 |
| `/documentation` | `Documentation.tsx` | 385 | public | no | none (+ clipboard) | W2 | P6 |
| `/terms` | `Terms.tsx` | 119 | public | no | none | W1 | P6 |
| `/privacy` | `Privacy.tsx` | 313 | public | no | none (+ clipboard, PGP key) | W1 | P6 |
| `/open` | `Open.tsx` | 201 | public | no | none | W1 | P6 |
| `/login` | `Login.tsx` | 223 | bare | no | GoTrue via Django | W3 | P4 |
| `/signup` | `Signup.tsx` | 372 | bare | no | GoTrue via Django | W3 | P4 |
| `/forgot-password` | `ForgotPassword.tsx` | 130 | bare | no | GoTrue `recover` | W3 | P4 |
| `/reset-password` | `ResetPassword.tsx` | 255 | bare | no | GoTrue `verify` + `PUT /user` | W3 | P4 |
| `/dashboard` | `Dashboard.tsx` | 834 | app | yes | templates + shares + events + activity | W4 | P5b |
| `/templates` | `Templates.tsx` | 348 | app | yes | `templates` CRUD + storage | W5 | P5b |
| `/scheduler` | `Scheduler.tsx` | 854 | app | yes | `scheduled_events` CRUD | W6 | P5b, Q13 |
| `/manage-schedules` | `ManageSchedules.tsx` | 663 | app | yes | `scheduled_events` bulk ops | W6 | P5b, Q13 |
| `/scheduler-settings` | `SchedulerSettings.tsx` | 917 | app | yes | preferences → DB (§2.12 A) | W6 | P5b, Q5 |
| `/filledtemplates` | `FilledTemplates.tsx` | 116 | app | yes | `filled_templates` | W7 | P5b, P8 |
| `/AIVoiceAutoFill` | `AIVoiceAutoFill.tsx` | 757 | app | yes | STT + AI + `filled_templates` | W7 | P3, P8 |
| `/activitylog` | `ActivityLog.tsx` | 392 | app | yes | per §2.12 Decision B (implement or remove) | W7 | P5b, Q6 |
| *(not routed)* | `Team/TemplateReviewModal.tsx` | 481 | — | — | dead | — | — |
| *(not routed)* | `TemplateBuilder/TemplateReviewModal.tsx` | 388 | — | — | dead | — | — |
| *(not routed)* | `Dashboard/RecentActivity.tsx` | 193 | — | — | dead | — | — |
| *(not routed)* | `Dashboard/TeamTemplates.tsx` | 196 | — | — | dead | — | — |
| *(not routed)* | `Scheduler/UpcomingEvents.tsx` | 178 | — | — | dead | — | — |
| *(not routed)* | `Scheduler/ScheduleStats.tsx` | 103 | — | — | dead | — | — |
| *(not routed)* | `Stats/StatsCard.tsx` | 48 | — | — | dead | — | — |
| *(not routed)* | `TemplateBuilder/ShareTemplateModal.tsx` | 0 | — | — | empty | — | — |

---

## Appendix B — Supabase call-site → Django view map

| Legacy call | Django destination | View / URL | Notes |
|---|---|---|---|
| `createTemplate` (`templates.ts:70`) | `apps.templates_app.services.create_template` | `POST /templates/new/` | `created_by` server-supplied |
| `getUserTemplates` (`:81`) | `selectors.user_templates` | `GET /templates/` | Replaces the nested embeds with prefetch |
| `getTemplatesByCategory` (`:117`) | `selectors.templates_by_category` | `GET /templates/?category=` | |
| `getTemplateById` (`:159`) | `selectors.template_detail` | `GET /templates/<uuid>/` | |
| `updateTemplate` (`:193`) | `services.update_template` | `POST /templates/<uuid>/edit/` | |
| `deleteTemplate` (`:208`) | `services.delete_template` | `POST /templates/<uuid>/delete/` | |
| `toggleTemplateVisibility` (`:215`) | `services.toggle_visibility` | `POST /templates/<uuid>/visibility/` | |
| `shareTemplate` (`:230`) | `services.share_template` | `POST /templates/<uuid>/share/` | `shared_by` server-supplied |
| `shareTemplatesWithTeam` (`:262`) | `services.share_with_team` | `POST /templates/share-team/` | 🔴 Currently shares with the caller's own email (Q6) |
| `getSharedTemplates` (`:305`) | `selectors.shared_with_me` | `GET /templates/shared/` | |
| `getTemplatesSharedByUser` (`:337`) | `selectors.shared_by_me` | `GET /templates/shared-by-me/` | |
| `removeTemplateShare` (`:365`) | `services.remove_share` | `POST /templates/<uuid>/unshare/` | |
| `deleteSharedTemplate` (`:379`) | `services.delete_share` | `POST /shares/<uuid>/delete/` | |
| `toggleSharedTemplateVisibility` (`:389`) | `services.toggle_share_visibility` | `POST /shares/<uuid>/visibility/` | Stop using `message` as a flag |
| `updateTemplateShareRole` (`:409`) | `services.update_share_role` | `POST /shares/<uuid>/role/` | |
| `addTemplateToReviewQueue` (`:424`) | `services.enqueue_review` | `POST /templates/<uuid>/review/` | `reviewer_id` server-supplied |
| `getReviewQueue` (`:461`) | `selectors.review_queue` | `GET /reviews/queue/` | |
| `addTemplateReview` (`:490`) | `services.add_review` | `POST /templates/<uuid>/reviews/` | |
| `updateTemplateReview` (`:526`) | `services.update_review` | `POST /reviews/<uuid>/` | |
| `getTemplateReviews` (`:548`) | `selectors.template_reviews` | `GET /templates/<uuid>/reviews/` | |
| `exportTemplate` (`:559`) | `apps.templates_app.views.export_template` | `GET /templates/<uuid>/export/` | Server-side download; removes Blob/createObjectURL |
| `generateShareLink` (`:586`) | template tag | — | Depends on Q16 |
| `uploadTemplateFile` (`:591`) | `apps.storage.services.upload` | `POST /templates/<uuid>/file/` | User-JWT-scoped; RLS respected |
| `scheduler.ts` CRUD + 11 selects | `apps.scheduler.{services,selectors}` | `/scheduler/…`, `/manage-schedules/…` | Single aggregate replaces the duplicated `getEventStats` |
| `searchEvents` (`scheduler.ts:271`) | `selectors.search_events` | `GET /manage-schedules/?q=` | 🔴 Parameterised; fixes the injection |
| `filled_templates` select/delete (`FilledTemplates.tsx:18,31`) | `apps.voice.selectors/service` | `GET /filledtemplates/`, `POST /filled/<uuid>/delete/` | |
| `filled_templates` insert (`AIVoiceAutoFill.tsx:347`) | `apps.voice.services.save_filled` | `POST /AIVoiceAutoFill/submit/` | `user_id` server-supplied |
| Auth: `getSession`/`onAuthStateChange` (`AuthContext.tsx:29,38`) | `apps/accounts/middleware.py` (principal hydration from the Django session); tokens held by `apps/accounts/services/tokens.py` | — | Replaces the context; `request.user` carries identity only, never a token |
| Auth: token refresh (`supabase-js` auto-refresh) | `apps/accounts/services/tokens.py::refresh_if_needed` | — | Called from the service layer, guarded per session against refresh races |
| Auth: `signInWithPassword`, `signUp`, `signInWithOAuth`, `signOut`, `resetPasswordForEmail`, `updateUser` | `apps.accounts.services.gotrue` | `/login`, `/signup`, `/auth/oauth/<p>/`, `/logout`, `/forgot-password`, `/reset-password` | |
| `supabase.auth.getUser` ×7 (`templates.ts:233,268,308,340,430,464,498`) | `request.user` | — | Eliminated entirely |
| `lib/activity.ts` (localStorage) | `apps.activity.services` | `/activitylog/` | Scope per Q6 |
| `lib/supabase.ts`, `lib/supabaseClient.ts` | — | — | **Deleted** |

---

## Appendix C — Conventions for the implementing agent(s)

1. **One phase per branch.** One wave per pull request inside P7.
2. **Never edit an applied migration.** New behaviour means a new file in `supabase/migrations/`. The migration history is append-only, forever.
3. **Never author a live schema change from an assumption.** Every migration that touches a `public` object must be **guarded, idempotent and additive**, and verified against a **restored copy** of the target database with a **zero-delta diff**. The fresh-install baseline and the live remediation are **different artefacts** (P5a) and must never be conflated.
4. **All legacy-table models are `managed = False`.** Django must never generate DDL for a `public` table. Django's own tables live in the `django` schema.
5. **No authenticated database query without an RLS context.** Every read/write on the `supabase` alias happens inside `rls_context()`. `RLSQueryGuard` enforces this at query time; do not weaken it, and do not add an "escape hatch" flag to it.
6. **The service role is never reachable from a request path.** Only `apps/db/admin_ops.py` may use it, and only from management commands or reconciliation scripts.
7. **The proxy is an allowlist, never a catch-all.** Only manifest routes may be forwarded; `/api/`, `/auth/`, `/admin/`, `/static/`, `/media/`, health endpoints and unknown paths are always served (or 404'd) by Django.
8. **No direct PostgREST, Groq or Supabase call from templates or `static/js/`.** A CI grep enforces it.
9. **Every transitional mechanism is created with its removal phase** and recorded in §P11's table. Removal is gated on **evidence of zero use**, not on a date.
10. **Every new view gets a test** asserting status, template, auth requirement and — where relevant — that a non-owner cannot access another user's object.
11. **Every intentional difference from the legacy behaviour** is added to `docs/parity/manual-checklist.md` with a one-line justification and the phase that made it.
12. **Do not refactor the React code.** It is frozen as the reference implementation.
13. **Do not port dead code.** §1.14 is the authoritative list.
14. **Copy wording, tokens and copy verbatim.** Marketing copy, error strings and Tailwind class names are part of the visual contract.
15. **Commit messages reference the phase and, for ports, the source file and line range** (e.g. `P3: port server/routes/tts.ts:36-49 text cleaning`).

---

## Verdict and next actions

**Architecture: approved as revised.** The target stack, the RLS-first approach over direct Postgres, the Supabase division of responsibility (GoTrue + Postgres + Storage retained; Django owns all application access), the P0 security work, the 7-wave page order, the parity strategy and the React-removal gate all stand.

**Implementation: not yet green-lit.** The four issues that blocked it have been corrected in this revision:

| Was | Now |
|---|---|
| P4 contradicted itself about the legacy session | **P4 builds Django auth in parallel**; the legacy SPA keeps its Supabase session until its routes migrate; "no Supabase token in the browser" is a **late-P7/P10 → P11** gate, and rollback to a legacy protected route may need a legacy re-login ([§2.4](#24-auth-and-session-design), [P4](#p4--auth-and-session-migration-parallel-not-cut-over)) |
| P3 changed two contracts at once and needed auth that did not exist yet | **P3 is legacy-contract-first** with multipart added alongside; the browser switches in P8; the legacy contract is deleted in P11; auth is a documented dual-credential window, not an invented bridge ([P3](#p3--python-service-layer)) |
| RLS impersonation lived in middleware | **An explicit, fail-closed transaction context** (`rls_context` + `RLSQueryGuard`); no authenticated query can run without it ([§2.5](#25-data-access-design)) |
| The three missing tables would be created by a guessed migration | **P5a schema reconciliation**: dump → replay → diff → fresh-install **baseline** + **guarded, additive, idempotent** live remediation, verified by zero-delta diffs ([P5a](#p5a--schema-reconciliation-mandatory-before-any-data-access-work)) |

**Recommended sequence — and what may run in parallel:**

```
P0  ──►  decide Q21  ──►  P1  ──►  P2  ──►  P6  ──►  W1 / W2        (static routes: prove rendering + proxy rollback)
                                          │
                          P3, P4, P5a, P5b run alongside ──────────┐
                                          │                        │
                                          ▼                        ▼
                                    W3 (needs P4)          W4+ (needs P5a + P5b)
                                          └────────┬───────────────┘
                                                   ▼
                                        P5b-proven waves → W7 → P8
```

1. **Execute P0 now.** It does not depend on this document being approved, and it closes live credential exposure. Days of console work plus a few small code changes.
2. **Decide Q21 before P1** — make the activity log real or delete it. It changes the route manifest (25 → 24), and the manifest drives the baseline, the proxy allowlist and the URLconf.
3. **Execute P1** on a real Supabase environment (staging project or the local stack) to produce the authenticated state matrix.
4. **Build P2, then P6, and immediately migrate W1/W2.** These static routes need only P6 and exist precisely to prove the Django rendering pipeline, the design system and the **allowlisted proxy rollback** before any authenticated route moves. **This is the ordering the plan intends: W1/W2 do not wait for P4, P5a or P5b.**
5. **In parallel with step 4**, run P3, then P4, and P5a → P5b once database access exists. **Q19** must be settled before P2, **Q3** before P5a, and **Q5/Q6** before W4.
6. **W3 waits for P4.** W4 and everything after it wait for **P5a and P5b**. W7 waits for P8.
7. **Do not block W1/W2 on the authenticated work** — the whole point of migrating the static pages first is that they can land while the harder phases are still in flight.

**What is explicitly *not* approved by this document:** anything in [§11](#11-open-questions-and-decisions-requiring-human-approval) marked **⛔**, the intentional behaviour changes enumerated in [§8.4](#84-what-parity-explicitly-does-not-cover), and every security item in [§7](#7-security-checklist--must-fix-before-migration-begins) that has not yet been actioned.

---

*End of plan. Nothing in this document has been implemented. Awaiting approval of the five ⛔ decisions; P0 may proceed immediately.*


---
