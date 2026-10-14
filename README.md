# Audentra

Open-source, voice-first structured-data automation. Speak naturally and Audentra turns the conversation into structured, validated form data — no typing, no rigid questionnaires.

This repository preserves the React/Express source beside the Django migration. P7 SR-1 through SR-4 and P8 deterministic acceptance are closed. P9 has source/Django browser evidence for all 25 routes, a bidirectional keyboard focus sweep for all rendered routes, 37 hosted route/security checks, a read-only schema comparison, and a real desktop microphone subset. Fresh attempt 14 W3-W7 passes all four Auth route rows; current matrix status is 24/25 PASS (12 public, four Auth, all eight application routes); only /help-center remains unaccepted pending owner disposition of its 390 px responsive correction. Current-worktree W7 [attempt 03](docs/parity/evidence/p9/p9-w7-mobile-interactions-20261015/attempt-03/django/w7/browser-results.json) passes six route/viewport contracts and ten interactions; focused Activity Log [attempt 13](docs/parity/evidence/p9/p9-activity-parity-20261015/attempt-13/django/w7/browser-results.json) adds source-matched desktop/mobile screenshots and live-region assertions; Dashboard [attempt 06](docs/parity/evidence/p9/p9-dashboard-parity-20261015/attempt-06/django/w4/browser-results.json) records updated responsive visuals and account-history/dialog journeys. Templates W5 [attempt 01](docs/parity/evidence/p9/p9-keyboard-followup-20261015/attempt-01/django/w5/browser-results.json) passes desktop/mobile keyboard CRUD checks; fresh W6 attempt 10 closes Scheduler, Manage Schedules and Scheduler Settings; current-worktree W6 [attempt 11](docs/parity/evidence/p9/p9-keyboard-followup-20261015/attempt-11/P9_W6_COMMAND_RESULTS.json) verifies the Manage Schedules sort disclosure with Enter and Space at both viewports; AI Voice passes 16 keyboard-driven synthetic journeys, including four synthetic media error-boundary cases in [voice attempt 04](docs/parity/evidence/p9/p9-voice-route-followup-20261015/attempt-04/P9_VOICE_COMMAND_RESULTS.json). P9 formal acceptance also awaits the Help Center disposition, restricted bucket metadata, physical-mobile and live-provider evidence, human audibility and BFCache coverage. P10 waits for the owner's explicit approval; see [P9 report](docs/parity/P9_REPORT.md) and [closeout handoff](HANDOFF_2026-10-14_P9_CLOSEOUT.md).

## Migration folder policy

P7 W1-W7 routes and the P8 bridge are implemented. The P7 [finding closeout](docs/pages/P7_SR_CLOSEOUT_2026-10-13.md) supersedes the earlier review status. P9 is in closeout under the [acceptance matrix](docs/parity/P9_ACCEPTANCE_MATRIX.md) and [task prompt](docs/parity/P9_IMPLEMENTATION_PROMPT.md); see the [current handoff](HANDOFF_2026-10-14_P9_CLOSEOUT.md) and [status report](docs/parity/P9_REPORT.md).

New migration work is additive: P1 tooling goes in `migration/parity/`, Django work in `migration/django/`, and comparison evidence stays under `docs/`. P1 is finalized with [accepted exceptions](docs/parity/P1_ACCEPTANCE.md). P2 is complete and [reviewed](docs/foundation/P2_REVIEW.md). P3 code findings are corrected, with live speech evidence still pending. P4 development authentication passed fresh hosted and PostgreSQL concurrency checks; see [P4_REPORT.md](docs/auth/P4_REPORT.md). P5 is complete with hosted shared-pooler isolation; see [P5_REPORT.md](docs/data/P5_REPORT.md) and [P5_VERIFICATION.md](docs/data/P5_VERIFICATION.md). P6 shared shells/rollback are complete; P7/P8 and their final evidence are linked above. The P7 activity page deliberately retains its source-supported browser-local/example feed rather than adding a new activity backend.

Keep the existing `src/`, `server/`, `scripts/`, `public/`, `new pages/`, `page-screenshots/` and Node/Vite configuration in their original locations and runnable until full migration parity, deployment verification and the accepted soak are complete. Revisit these originals for behaviour/content/design comparisons throughout migration. Copy reference content into the new implementation rather than relocating or replacing the original folders.

Old runtime cleanup belongs to the final P11 gate with a documented recovery reference. Keep design references, historical screenshots, schema history, documentation and parity evidence after retirement. See [MIGRATION_PLAN.md](MIGRATION_PLAN.md#separate-folders-and-preservation), the archived [P2 scope](docs/foundation/P2_IMPLEMENTATION_PROMPT.md) and the [P2 report](docs/foundation/P2_REPORT.md).

---

## What Audentra is

- **Voice in, structured data out.** Audio is transcribed, mapped against a form/schema, and coerced into validated records.
- **Schema-first.** Forms are defined as JSON Schema (or Pydantic models) so extracted fields are validated at write time, not after the fact.
- **Self-hostable.** The design is deterministic voice middleware that can run wholly inside the operator's own perimeter. No forced upstream egress.

---

## Current status

The migrated Django path owns all 25 routes. P9 attempt 04 passed deterministic source/Django route captures and browser checks; the bidirectional keyboard focus sweep passed all 48 rendered route/viewports; 37 hosted route checks passed with cleanup. The restricted schema comparison passed all visible P5 objects, with bucket privacy/limits still inaccessible. A real desktop microphone subset passed without provider calls. P9 remains formally open for full route-matrix evidence, mobile, live providers and the exact schema metadata gap. The owner asked for P9 completion and report first; P10 implementation waits for explicit approval. Deployment remains a later decision. See [P9 report](docs/parity/P9_REPORT.md), [verification](docs/parity/P9_VERIFICATION.md), [P10 brief](docs/deployment/P10_IMPLEMENTATION_PROMPT.md) and [closeout handoff](HANDOFF_2026-10-14_P9_CLOSEOUT.md). The original source stays available for comparison/recovery.

Below is a precise record of what has shipped versus what remains.

---

## What has been done so far

### Public website (migrated, approved)
- **Home** (`/`) — hero, product framing, public CTA.
- **Features** (`/features`) — Voice Input → Contextual Understanding → Structured Extraction → Dynamic Forms → Review & Validation, plus open-source extensibility.
- **About** (`/about`) — project framing, the idea, why Audentra, built in the open, contact.
- **Login** (`/login`) and **Signup** (`/signup`) — restyled to the design system; auth logic preserved.
- **Privacy** (`/privacy`) — converted from the saved `privacy.html` design/content (source of truth), not invented copy.
- **Terms** (`/terms`) — legitimate Terms of Use (not a duplicate of the Apache license).
- **Open Source License** (`/open`) — full Apache 2.0 text.
- **Documentation** (`/documentation`) — converted from the saved `document.html` (Quickstart, 4-stage pipeline, schema contracts, implementation guides).
- **Header/Footer** — single shared implementation used across all public pages.
- **Favicon** — `public/favicon.svg` brand mark.

### Authenticated dashboard (migrated)
- **Application shell** — left sidebar (Audentra logo, Home/Forms/Templates/Activity/Team, divider, Settings, divider, GitHub/Documentation, user/logout), *not* the public marketing navbar.
- **Home view hierarchy** — "What would you like to work on?" → Start with your voice (primary) → Recent forms → Templates → Upcoming → Team.
- **Status badges** — Completed (green) / In Progress (amber) / neutral; no full-row coloring.
- **Compact error states** — "Couldn't load templates. Retry" style, with retry buttons; legitimate failures are not hidden.
- **Responsive** — desktop persistent sidebar, tablet collapsible, mobile hamburger drawer + fixed top bar. No horizontal overflow.
- **Functionality preserved** — all existing API calls, hooks, retry, logout, team-collaboration modals, and settings (localStorage) are intact; no real data was replaced with mocks.

### Routing (supporting both contexts)
- **Public:** `/`, `/features`, `/about`, `/login`, `/signup`, `/privacy`, `/terms`, `/open`, `/documentation`
- **Application:** `/dashboard`, `/templates`, `/scheduler`, `/AIVoiceAutoFill`, `/filledtemplates`, `/activitylog`
- The original React router and Express backend remain preserved. P7's Django route registry owns the current 25-path manifest; see [P7_ROUTE_OWNERSHIP.json](docs/pages/P7_ROUTE_OWNERSHIP.json) for each URL name/view and the deliberate reset-password 404.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite |
| Routing | react-router-dom v6 |
| Styling | Tailwind CSS (custom design tokens) + lucide-react icons |
| Auth & data | Supabase (email + Google OAuth) |
| Backend | Node.js, Express (local `server/`) |
| Speech | Google Cloud Speech-to-Text / Text-to-Speech, Groq, ElevenLabs, Llama (keyed via env; see below) |

---

## Getting started

### Prerequisites
- Node.js 16+ and npm 7+

### Install
```bash
git clone https://github.com/DanielWill-1/Audentra.git
cd Audentra
npm install
```

### Run the frontend
```bash
npm run dev
```
Vite serves the app (default port 5173).

### Run the backend (for transcription / TTS)
```bash
npm run server
```
The backend runs on `http://localhost:3001`.

### Scripts
| Command | Purpose |
| --- | --- |
| `npm run dev` | Frontend dev server (Vite) |
| `npm run server` | Backend (Express + ts-node) |
| `npm run build` | Production build (`vite build && tsc`) |
| `npm run lint` | ESLint |
| `npm run preview` | Preview the production build |
| `npm run screenshots` | Capture page screenshots (Playwright) |
| `npm run secret-scan` | Offline secret scan (history + working tree) |


---

## Environment variables

Create a `.env` file in the project root. Required for auth/data and for real (non-mock) AI:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Notes:
- Without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, Supabase auth and data calls will fail.
- **Never use a `VITE_`-prefixed variable for a secret.** Vite inlines every `VITE_` value into
  the shipped client bundle, which makes it public. A `VITE_GROQ_API_KEY` was previously
  configured here and had to be rotated for exactly this reason — see
  [docs/security-remediation.md](docs/security-remediation.md).
- **Google Cloud credentials are server-side only.** The backend expects a Google
  service-account JSON file referenced by path, kept outside git (`service-account.json` is
  gitignored), or supplied via `GOOGLE_APPLICATION_CREDENTIALS`. It is deliberately **not**
  copied into the build output any more.
- Groq access moves server-side in P3 of
  [docs/python-migration-plan.md](docs/python-migration-plan.md); until then the voice
  assistant uses its existing mock fallback when no key is present.


> **Known issue:** the Supabase project reference currently configured in `.env` (`aajgkpzuffhuuffaneqi.supabase.co`) does not resolve in DNS and fails with `ERR_NAME_NOT_RESOLVED`. This is a backend/provisioning issue — restore the project or update `VITE_SUPABASE_URL` (and anon key) to the current project ref.

---

## Project structure

```
VoiceForm/
├── public/                  # Static assets (favicon.svg, image.png)
├── src/
│   ├── components/          # Reusable UI (Header, Footer, team, dashboard, scheduler, stats)
│   ├── contexts/            # AuthContext
│   ├── config/              # API config + Google credentials
│   ├── lib/                 # Supabase clients, templates, scheduler, activity, AI services
│   ├── pages/               # One file per route
│   ├── services/            # Transcription / TTS / AI processing
│   ├── App.tsx              # Route definitions
│   ├── main.tsx             # React root
│   └── index.css            # Tailwind directives
├── server/                  # Express backend
├── supabase/                # Migrations, backups, project config
├── new pages/               # Approved HTML design/content references (source of truth for migration)
├── docs/                    # prompt.md (migration spec), tables.md (schema audit)
├── scripts/                 # Screenshot / test helpers
├── tailwind.config.js       # Design tokens (colors, spacing, typography)
└── package.json
```

---

## Design system

Design tokens live in `tailwind.config.js` and are shared by both the public site and the application shell:

- **Colors** — `background`, `surface`, `surface-subtle`, `primary` (`#004ac6`), `voice` (`#7C3AED`, the audio accent), `text-primary/secondary/muted`, `border`, `success`, `warning`, `error`.
- **Typography** — `display-hero`, `headline-h2`, `headline-h3`, `body`, `body-large`, `body-medium`, `metadata`, `label-code` (JetBrains Mono).
- **Spacing** — `margin`, `margin-desktop`, `space-*`, `section-*`, `gutter-*`.

Two related UI contexts, deliberately distinct:

| Context | Pages | Shell |
| --- | --- | --- |
| Public site | Home, Features, About, Documentation, Privacy, Terms, Open, Login/Signup | Header + Footer, editorial spacing |
| Application | Dashboard, Forms, Templates, Activity, Settings, Voice workflow | Sidebar app shell, denser spacing |

---

## License

The Audentra engine is distributed under the **Apache License 2.0**. The full license text is published at the `/open` route. (Note: a `LICENSE` file is not yet present in the repo root; the `/open` page carries the canonical text.)

---

## Contributing

1. Fork the repository.
2. Create a branch for your change.
3. Commit and push.
4. Open a pull request against `main`.

See the `/documentation` page for architecture and schema-authoring guidance.

---

## Core Architecture

1. Audio Ingestion: Browser audio stream captured and chunked via MediaRecorder API.
2. Transcription Pipeline: Processed via Groq (Whisper) / Google STT with fallback handling.
3. Entity Extraction: LLM maps unstructured transcript to a declared JSON Schema target.
4. Schema Validation: Strict runtime validation (Zod/Ajv). Re-prompt loop triggered on invalid types.
5. Ingestion & Storage: Coerced payload written to PostgreSQL (Supabase) with audit trail.


## Contact

Questions and discussion belong on the [GitHub repository](https://github.com/DanielWill-1/Audentra) — open an issue or start a discussion.
