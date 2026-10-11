# Audentra

Open-source, voice-first structured-data automation. Speak naturally and Audentra turns the conversation into structured, validated form data — no typing, no rigid questionnaires.

This repository preserves the original Vite + React + TypeScript and Node/Express application beside the implemented Django P7 page path. Supabase remains the Auth and data provider. The local P7 route inventory has zero normal legacy fallbacks; P7 acceptance and P8 review repairs remain open, with P9 release acceptance and production cutover separate.

## Migration folder policy

P7 W1–W7 routes and the separate P8 bridge are implemented. All 25 manifest routes resolve locally with zero normal fallback, but the [2026-10-12 P7 review](docs/pages/P7_REVIEW_2026-10-12.md) and [P8 review](docs/services/P8_REVIEW_2026-10-12.md) supersede earlier full-completion claims. See the [dated handoff](HANDOFF_2026-10-12_020354_IST.md) and root [P7/P8 closeout prompt](prompt.md). Existing [report](docs/pages/P7_REPORT.md), [verification](docs/pages/P7_VERIFICATION.md), [route inventory](docs/pages/P7_ROUTE_OWNERSHIP.json) and [differences](docs/pages/P7_DIFFERENCES.md) remain evidence; P9–P11 are separate gates.

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

The project remains between implementation and release acceptance. The approved P7 local Django path now owns the full 25-route manifest, while the original React/Express runtime remains available for comparison and recovery. P8 verifies the browser media boundary with deterministic fakes; live speech-provider, physical-device, P9 release, P10 deployment/soak, and P11 retirement gates remain open. The `/documentation` page describes parts of the target architecture and does not by itself prove every described capability is shipped.

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
