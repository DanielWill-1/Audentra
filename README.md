# Audentra

Open-source, voice-first structured-data automation. Speak naturally and Audentra turns the conversation into structured, validated form data — no typing, no rigid questionnaires.

This repository is a Vite + React + TypeScript single-page application (SPA) with a Node/Express backend and Supabase for auth and data.

---

## What Audentra is

- **Voice in, structured data out.** Audio is transcribed, mapped against a form/schema, and coerced into validated records.
- **Schema-first.** Forms are defined as JSON Schema (or Pydantic models) so extracted fields are validated at write time, not after the fact.
- **Self-hostable.** The design is deterministic voice middleware that can run wholly inside the operator's own perimeter. No forced upstream egress.

---

## Current status

This project is mid-migration. The public-facing site has been rebuilt onto an approved design system, and the authenticated dashboard has been redesigned onto an application shell. The voice transcript/src pipeline (Google STT, Groq, ElevenLabs, Llama) still runs through the existing backend and is **not yet** migrated to the new schema-authoring model described in the `/documentation` page — that page currently documents the target architecture rather than the shipped runtime.

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
- Additional legacy routes (`/industries`, `/security`, `/pricing`, `/contact`, `/status`, `/help-center`, `/forgot-password`, `/reset-password`, `/manage-schedules`, `/scheduler-settings`) still exist and await migration.

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