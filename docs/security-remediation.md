# P0 Security Remediation — Record

**Phase:** P0 of [`docs/python-migration-plan.md`](python-migration-plan.md) (v0.3), executed as an isolated phase. **P1 was not started.**
**Scope:** close live credential/data exposures, remove leaked material from the repository and its history, harden the immediately verifiable critical RLS issue, and leave application behaviour otherwise unchanged.
**Status:** **INCOMPLETE — repository-local work complete and verified; critical external rotations and the remote history rewrite are BLOCKED on human action.** See [§10](#10-acceptance-criteria--status).

> **No secret values are recorded in this document.** Only non-secret identifiers are used: git object IDs, policy names, counts, file paths and byte sizes. Where a value had to be characterised, only structural facts are given (e.g. "matches the `gsk_` format", "49 bytes of a repeated character").

---

## 1. Commits

| | SHA |
|---|---|
| **Starting commit** (before any P0 change, `main`) | `66064ecb4d994f87c64a4c401507c57da45ff4e7` |
| Pre-rewrite P0 commit (rewritten away, recoverable from the mirror) | `1cea9dece91c9360b02702bf9e96f4ff2b1df57a` |
| **Ending commit — P0 code/security changes** (after the rewrite, `main`) | `d8459d2bfdd0206b81afd032d377e4045b0ef57d` |

The phase's documentation and tooling commits follow that code commit (this file plus `scripts/p0_history_rewrite.py` and the scan evidence). Find the final tip of the phase with:

```bash
git log --oneline --grep='^P0' -5
```

Working tree at both the start and the end of the phase: clean (the only untracked item at the start was the migration plan itself, which was committed first).

Commits created by P0:

1. `docs: add approved Python migration plan (v0.3)` — the authoritative plan this phase executes.
2. `P0: remove committed credentials, close browser secret exposure, harden users RLS` — all remediation.

---

## 2. Was the repository treated as public / compromised?

**Yes, both.** Treated as compromised regardless of actual visibility, because:

- git history cannot be recalled and clones may already exist;
- the Groq key was provably present in a **shipped client asset** (`dist/client/assets/index-DnWuFiMr.js`, 743,867 bytes) which is served to every visitor of any deployment;
- the Google service-account private key was committed and copied into `dist/` by the build script.

Consequence: every credential below is treated as **already leaked** and requires **rotation**, not merely removal. Removal (this phase) is cleanup after compromise; rotation is the actual protection.

---

## 3. Findings

| ID | Severity | Finding | Evidence | Disposition |
|---|---|---|---|---|
| **F1** | 🔴 **Critical** | Google Cloud **service-account private key committed to git** | `service-account.json`, 2,399 B, tracked; blob `57cba5d1c1947e636facf0e5f0d168f38a8acedc`; introduced in commit `bede48a` (2025-06-30); present in **24 commits** across `main`, `deb`, `origin/main`, `origin/deb` | ✅ Untracked, gitignored, **purged from all history**. ⛔ Rotation **BLOCKED** (F1r) |
| **F1a** | 🔴 Critical | Same key **published into the build artefact** by `npm run copy-service-account` | `package.json`, `dist/service-account.json` (2,399 B on disk) | ✅ Build step removed; `dist/` deleted and rebuilt; not regenerated |
| **F1b** | 🟠 High | Key **imported into the client module graph** | `src/config/credentials.ts:1` → `src/config/api.ts:1` → `src/services/ai.ts` | ✅ Module deleted; import path cleaned. (It was **not** inlined into the shipped bundle — zero matches for `BEGIN PRIVATE KEY` / `private_key` / `client_email` in the built asset — because the import was unused and tree-shaken. That was luck, not design.) |
| **F2** | 🔴 **Critical** | **Groq API key exposed to the browser** via `VITE_GROQ_API_KEY` | `.env` value matches the `gsk_` format; Vite inlines every `VITE_` value; the string `gsk_…` was found in the built bundle **and** in the raw source bundle `dist/client/assets/index-DnWuFiMr.js` | ✅ Removed from source and from `.env.example`; **absent from the freshly built bundle** (0 matches). ⛔ Rotation **BLOCKED** (F2r) |
| **F3** | 🔴 **Critical** | **Full Supabase cluster dump committed** — personal data **and** authentication credential material | `backups/…` and (earlier in history) `backup supabase/…`: a 329,496 B plain-SQL cluster dump. Contents: 48 `CREATE TABLE`, 36 `COPY` blocks, **422 data rows**, incl. `auth.users` **7 rows with `encrypted_password` (bcrypt)**, `auth.refresh_tokens` **8 rows**, `auth.sessions` **8 rows**, `auth.identities` 7, `auth.audit_log_entries` 199, plus public app rows (9 templates, 8 template_shares, 4 users, 3 filled_templates, 1 scheduled_event). 237 email-like and 751 UUID-like values. **No plaintext database credential or connection string** was found: no connection URI carrying an inline password, no `PGPASSWORD`, no `DATABASE_URL`, no role DDL with a quoted password literal, and no `vault.secrets` rows | ✅ Untracked, gitignored, **purged from all history (both paths)**. ⛔ **User-password exposure needs a human decision** (§9 H4) |
| **F4** | 🔴 **Critical** | `public.users` SELECT policy was `USING (true)` — any authenticated user could read **every** user's email, name, company and industry | `supabase/migrations/20250628064052_twilight_disk.sql:39-43` | ✅ **Fixed** in a new append-only migration; proven by a negative test |
| **F5** | 🟠 High | `filled_templates` has **no RLS, no DDL in the repo**, is queried with the anon key | client code only (`FilledTemplates.tsx:18,31`, `AIVoiceAutoFill.tsx:347`) | ⛔ **BLOCKED → P5a.** Schema could not be verified; **no DDL or policy was invented** |
| **F6** | 🟠 High | `template_shares` / `template_reviews`: RLS enabled but **SELECT-only policies** → all writes denied; reads open to all authenticated users (`USING (true)`) | `20250628065741_precious_brook.sql:50,66`; 11 write call-sites in `src/lib/templates.ts` | ⛔ **Deferred → P5a** (missing DDL; needs schema reconciliation) |
| **F7** | 🟡 Medium | Four duplicate **PUBLIC-role** policies on `public.templates` | `20250612155158_humble_fire.sql:16-37` | ✅ **Fixed** (guarded drops) |
| **F8** | 🟠 High | `lib/scheduler.ts:275` interpolates raw user input into a PostgREST `.or()` filter | source review | ⛔ **Deliberately not fixed in P0** → **P5b** (final parameterised replacement). Only the marker comment was added — **no application code was refactored** |
| **F9** | 🟠 High | Express `/api/transcribe` and `/api/tts` are unauthenticated; CORS `*`; 20 MB body | `server/index.ts:11` | Deferred by design → P3/P4 (documented in the plan) |
| **F10** | ℹ️ Info | Two **dangling** git objects (49 B each: `test=` + `gsk_` + 40 identical characters) — **self-inflicted by this phase's own pre-commit-hook testing**, never committed, never a real credential | blobs `43395b6f9b04`, `6ec59a302a3e`; identified structurally in the mirror | ✅ Removed by the rewrite + `gc --prune=now`; **0 strict `gsk_` objects remain** |
| **F11** | ℹ️ Info | `.env` — **never committed** in any revision | `git log --all -- .env` empty; no object named `.env` in history; only `.env.example` (placeholders/empty values) ever tracked | ✅ No history action required |
| **F12** | ℹ️ Info | `.env` `GOOGLE_PRIVATE_KEY` is a **placeholder**, not a credential | 23 characters, placeholder-shaped; `GOOGLE_CLIENT_EMAIL` likewise | ✅ No rotation required; `.env` remains untracked and gitignored |
| **F13** | 🟡 Medium | `dist/` (containing the leaked bundle) present on disk | `dist/client/assets/index-DnWuFiMr.js` | ✅ Deleted and rebuilt; `dist` is gitignored and was never committed |

---

## 4. Google audit review status

⛔ **BLOCKED.** No GCP console or `gcloud` access was available in the P0 environment, so the service-account key's usage history (Cloud Logging / IAM audit logs) **was not reviewed** and the old key **was not disabled or deleted**. This is required human action (§9 H1).

---

## 5. Credential rotations

| Credential | Status | Non-secret identifiers |
|---|---|---|
| Google Cloud service-account key | ⛔ **BLOCKED** — no GCP access | Old key: service account `client_email` domain `*.iam.gserviceaccount.com`, key material blob `57cba5d1…` (2,399 B). **No new key issued.** The local `service-account.json` remains the compromised (pre-rotation) credential and is retained **only** so the existing Express backend keeps working; it is untracked and gitignored. |
| Groq API key | ⛔ **BLOCKED** — no Groq console access | Old key: 56 characters, matches the `gsk_` format. **No new key issued.** Until rotation, **the old key must be considered public**. |
| Supabase database password | ✅ **Not indicated by evidence** | The dump contained **no** plaintext database credential or connection string, so a password rotation is not required *on the basis of this dump*. ⛔ If a human knows the dump was taken with credentials embedded (e.g. from a different backup tool), rotate anyway. |
| End-user passwords (7 accounts) | ⛔ **BLOCKED — human decision** | 7 `auth.users` rows with bcrypt `encrypted_password` hashes were exposed in the committed dump. bcrypt is slow to crack but not invulnerable. Recommended: force a password reset for affected accounts and review sign-in activity (§9 H4). |
| Supabase anon key | Not rotated | Public by design; RLS is the boundary. It becomes unnecessary in the browser after P7/P11. |

---

## 6. Git history rewrite

### 6.1 Recovery artefacts created **before** the rewrite

| Artefact | Location | Notes |
|---|---|---|
| Complete-history bundle | `<repo>/.git/p0-prewrite-backup.bundle` (9,111,406 B) | `git bundle verify` → "The bundle records a complete history" (all 7 refs) |
| Bare mirror | `C:\Users\danie\OneDrive\Documents\GitHub\voiceform\VoiceForm-p0-prewrite.git` | **Outside the working repository**, as required |

⚠️ **Both artefacts contain the pre-rewrite history, including the Google private key blob and the database dump. They are sensitive.** Move them to secure storage or destroy them once rotation is complete and the cleanup is confirmed.

### 6.2 Tooling limitation (recorded honestly)

- **gitleaks / TruffleHog: not installed, and installation was impossible** — the shell has no outbound network (PyPI unreachable), and there is no binary download channel. A purpose-built equivalent scan was used: [`scripts/secret_scan.py`](../scripts/secret_scan.py) (history / index / working-tree / whole-object-database modes, provider-specific patterns, never prints values).
- **`git filter-repo` and BFG: unavailable** for the same reason.
- **`git filter-branch`: unusable** — it is a POSIX shell script, and no POSIX shell can execute in this environment (MSYS2 fails with `couldn't create signal pipe, Win32 error 5`; the sandbox blocks the pipes it needs).
- **Therefore the rewrite was implemented with git plumbing only**: [`scripts/p0_history_rewrite.py`](../scripts/p0_history_rewrite.py). It rewrites each commit's tree via `ls-tree`/`mktree`, remaps parents, re-emits the commit with the **original author/committer/message verbatim** (`gpgsig`/`mergetag` dropped, since those signatures cannot survive a rewrite), and repoints every ref.

### 6.3 Rewrite targets (driven by the pre-rewrite scan, not assumptions)

| Target | Path(s) | Blob(s) | Was in history? |
|---|---|---|---|
| Google service-account key | `service-account.json` | `57cba5d1…` (2,399 B) | Yes — 24 commits, since `bede48a` |
| Database dump | `backup supabase/db_cluster-12-08-2025@20-15-27.backup/db_cluster-12-08-2025@20-15-27.backup` | `f42bbaa3…` (329,496 B) | Yes — added `38c1450` |
| Database dump (gzip) | `backup supabase/…backup.gz` | `53e88ea…` (47,260 B) | Yes |
| Storage archive | `backup supabase/qpjclqmszrmdgdqcbels.storage.zip` | `15cb0ec…` (22 B, empty archive) | Yes |
| Database dump (later path) | `backups/db_cluster-12-08-2025@20-15-27.backup/…` (+ `.gz`, `.zip`) | same content | Yes — renamed from `backup supabase/` in `66064ec` |
| `dist/service-account.json`, built bundle with `gsk_`, `.env` | — | — | **Never committed** (verified — no history action needed) |
| Dangling test blobs | — | `43395b6f9b04`, `6ec59a302a3e` (49 B, self-inflicted) | No — dangling only; pruned by `gc` |

Two paths for the same dump were found **because the scan was repeated after the first pass**: the dump lived at `backup supabase/` early in history and was renamed to `backups/` later. Purging only `backups/` would have left the earlier copy in place. This is exactly why the mandated re-scan after rewriting matters.

### 6.4 Ref rewrite result

| Ref | Before | After |
|---|---|---|
| `refs/heads/main` | `1cea9de…` | `d8459d2bfdd0206b81afd032d377e4045b0ef57d` |
| `refs/heads/deb` | `d4f99e6…` | `9c63e1c64058d1ee2955f8c14a94e50a6362c7f0` |
| `refs/remotes/origin/main` | `66064ec…` | `f443a5e05e917f8984a68d62a9a7ace6b172801b` |
| `refs/remotes/origin/HEAD` | `66064ec…` | `f443a5e05e917f8984a68d62a9a7ace6b172801b` |
| `refs/remotes/origin/deb` | `d4f99e6…` | `9c63e1c64058d1ee2955f8c14a94e50a6362c7f0` |
| `refs/remotes/origin/bolt` | `9279c47…` | unchanged (never contained the material) |
| `refs/remotes/origin/bolt2` | `5e0e975…` | unchanged (never contained the material) |

**History integrity preserved:** 137 commits before and after; **all 137 commit subjects and dates identical** to the mirror; **the tracked file set at the tip is identical** (148 files before, 148 after, zero differences in either direction). Commits were **not** pruned — a commit whose only change was a purged path remains as an empty commit, deliberately, to preserve history shape.

Old objects were then made unreachable (`git reflog expire --expire=now --expire-unreachable=now --all`) and pruned (`git gc --prune=now`).

### 6.5 Remote force-push — BLOCKED FOR HUMAN EXECUTION

The remote `origin` = `https://github.com/DanielWill-1/Audentra.git` was **not** touched. **No force-push was performed** and no collaborator has been asked to re-clone; authorisation for a destructive remote rewrite was not established.

The rewritten path is not complete until the remote is replaced **and** the pre-rewrite objects are gone from GitHub (which requires GitHub support to expire the old commits — force-pushing alone leaves them reachable by SHA until then).

**Exact procedure for the human operator:**

```bash
# 0. Confirm you are authorised to rewrite the shared remote, and tell collaborators.
# 1. From the cleaned local repository, verify the state:
git log --all --oneline -- service-account.json      # must print nothing
git log --all --oneline -- 'backups/' 'backup supabase/'   # must print nothing

# 2. Push the rewritten history (destructive):
git push --force --all origin
git push --force --tags origin

# 3. Ask GitHub Support to expire the superseded commits / cached views,
#    or delete and recreate the repository from the cleaned copy if the history
#    must be guaranteed unrecoverable.

# 4. Require every collaborator to re-clone (existing clones retain the old objects):
#    git clone <url> <new-dir>
```

Until step 3 completes, **the leaked key and dump remain retrievable from the remote by commit SHA**, so the rotations in §5 must not wait for this.

---

## 7. Secret-scan commands and sanitized results

Scanner: `scripts/secret_scan.py` (offline; gitleaks/TruffleHog unavailable — see §6.2).

```bash
# Before (reproduced from the pre-rewrite mirror)
GIT_DIR=<mirror> python scripts/secret_scan.py --mode objects --json docs/p0-evidence/scan-before-rewrite-mirror.json

# After
python scripts/secret_scan.py --mode objects  --json docs/p0-evidence/scan-after-rewrite-objects.json
python scripts/secret_scan.py --mode history  --json docs/p0-evidence/scan-after-rewrite-history.json
python scripts/secret_scan.py --mode tracked  --json docs/p0-evidence/scan-after-rewrite-index.json
```

| Scan | Before | After |
|---|---|---|
| **Reachable history** (`rev-list --objects --all`) | **4 finding sites**, all in blob `57cba5d1…` (`service-account.json`) | **0 — CLEAN** |
| **Whole object database** (`--batch-all-objects`, incl. dangling) | **6 finding sites**: 4 in `57cba5d1…` + 2 dangling `gsk_` blobs (`43395b6f9b04`, `6ec59a302a3e`, both 49 B, self-inflicted by P0 hook testing) | **0 — CLEAN** (396 blobs, 16,104,141 bytes scanned) |
| **Index** (what a commit would contain) | 10 site(s) in the working tree incl. the leaked bundle | **0 — CLEAN** |
| **Purged-dump content markers** (targeted: `COPY auth.users`, `encrypted_password`, bcrypt, `auth.refresh_tokens`, `supabase_admin`, dump filename) | 9 blob matches | **1 match = false positive**, in `docs/python-migration-plan.md` (this plan mentions `pg_dump` and the dump's filename in prose). **0 matches for actual dump content** |
| **`gsk_` token objects** | 2 strict (dangling test values) | **0 strict**; 2 loose matches are false positives — `docs/python-migration-plan.md` (mentions `gsk_…` in prose) and `scripts/secret_scan.py` (the scanner's own regex literal) |
| **Mandated history path checks** | `service-account.json`, `backups/`, `backup supabase/`, `dist/`, `.env` all **present** | **all EMPTY** |

Machine-readable evidence is committed under [`docs/p0-evidence/`](p0-evidence/).

---

## 8. RLS changes applied

New **append-only** migration: **`supabase/migrations/20261005181500_security_hardening.sql`** (146 lines). **No pre-existing migration file was edited** (`git diff` on `supabase/migrations/` shows additions only). Every statement is guarded and idempotent.

### 8.1 `public.users`

| | Policy |
|---|---|
| **Removed** | `Authenticated users can read user data` — `FOR SELECT TO authenticated USING (true)` |
| **Added** | `Users can read own row` — `FOR SELECT TO authenticated USING (auth.uid() = id)` |

Unchanged: the existing `Users can update own data` (UPDATE) and `Users can insert own data` (INSERT) policies. **No DELETE policy was added** — none exists today and adding one would grant a capability that does not currently exist. No client code reads `public.users` at all, so this change has **no application impact**.

Guards: the block returns without change if `public.users` is absent, and also if `auth.uid()` is unavailable (a non-Supabase database), rather than creating a policy that references a missing function.

### 8.2 `public.templates`

Removed the four duplicate **PUBLIC-role** policies from `20250612155158_humble_fire.sql`: `Allow select own templates`, `Allow insert own templates`, `Allow update own templates`, `Allow delete own templates`.

Each drop is **guarded on the existence of its `TO authenticated` counterpart** (`Users can select/insert/update/delete own templates`). If the counterpart is missing, the duplicate is deliberately **left in place** — so this migration can never reduce access. Rationale: for a real session the duplicates' predicate `created_by = auth.uid()` is a subset of the `authenticated` policies, and for `anon` `auth.uid()` is `NULL`, so they never matched a row.

### 8.3 Verification of the migration and the negative test

No reachable database was available (no local Supabase stack; Docker daemon down; local PostgreSQL servers present but credentials unknown). A **throwaway PostgreSQL cluster** was created with `initdb` and a synthetic Supabase-shaped fixture (`auth.uid()`, `anon`/`authenticated` roles, `public.users` and `public.templates` with the DDL and policies taken verbatim from the committed migrations).

| Step | Result |
|---|---|
| Negative test **before** the fix | **FAIL as required** — `RLS FAIL: authenticated user A can read user B's row` (exit 3). Proves both the vulnerability and that the test detects it. |
| Apply the migration | exit 0; `public.users` policies became `Users can read own row \| SELECT \| {authenticated} \| (auth.uid() = id)`; the four PUBLIC duplicates removed; the four `authenticated` policies retained |
| Negative test **after** the fix | **PASS** — `RLS PASS: user A sees 1 row(s) and cannot read user B` (exit 0) |
| Apply the migration a **second time** | exit 0, **no-op** (policy counts unchanged: users 3, templates 4); test still PASS — **idempotence proven** |

Test file: [`supabase/tests/rls_users_select_test.sql`](../supabase/tests/rls_users_select_test.sql). Run with:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_users_select_test.sql
```

It runs inside a `ROLLBACK`'d transaction, prints only counts and PASS/FAIL, and exits non-zero when RLS is broken (usable as a CI gate). Requires a role permitted to `SET LOCAL ROLE authenticated` and at least two rows in `public.users`.

⚠️ **This proves the migration and the policy logic are correct. It does not prove the change is applied to the live project** — that remains blocked (§9 H5).

---

## 9. Blocked human actions

| ID | Action required | Why blocked |
|---|---|---|
| **H1** | **Rotate the Google Cloud service-account key** in GCP, review its audit logs for unexpected use, then **disable/delete the old key**, and deploy the replacement via the environment's secret mechanism (never into git). | No GCP console/CLI access in the P0 environment. |
| **H2** | **Rotate the Groq API key.** | No Groq console access. Treat the current key as public until rotated. |
| **H3** | **Push the rewritten history** and have GitHub expire the old commits, then require all collaborators to re-clone. | Authorisation for a destructive remote rewrite was not established. Exact commands in §6.5. |
| **H4** | **Decide on the exposed end-user credentials**: 7 accounts whose bcrypt password hashes and 8 session/refresh-token records were in the committed dump. Consider forcing a password reset and reviewing sign-in activity. | Product/security decision, not a repository action. |
| **H5** | **Apply the new migration to the live project**: `supabase db push` (or run `20261005181500_security_hardening.sql`) and then run the negative RLS test against it. | No database access. Until this is done, **the `users` cross-tenant read is still live in production.** |
| **H6** | **Enable the pre-commit gate** in every clone: `git config core.hooksPath .githooks`. | The hook could not be *executed* in this environment (no POSIX shell — §6.2), so although it is committed it was **not verified running**. The equivalent gate `python scripts/secret_scan.py --mode tracked` **was** executed and passes. |
| **H7** | Move or destroy the recovery artefacts (§6.1) once rotation is complete. | They intentionally contain the pre-rewrite history. |
| **H8** | Confirm whether the `filled_templates` schema can be dumped (P5a prerequisite). | No database access; the item is deliberately carried forward. |

---

## 10. Acceptance criteria — status

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Repository verified clean before changes; starting SHA recorded | **PASS** | `git status --porcelain` empty except the plan doc; `66064ec…` |
| 2 | Secret-bearing files inventoried before changes | **PASS** | §3; `git ls-files` filtered |
| 3 | Full-history scan over **all refs and revisions** before changing anything | **PASS** † | 4 findings (reachable) + 2 dangling; gitleaks/TruffleHog unavailable → purpose-built equivalent (§6.2) |
| 4 | Rotation scope driven by scan results, not assumptions | **PASS** | §6.3; caught a **second historical dump path** the first pass missed |
| 5 | `service-account.json` untracked + gitignored | **PASS** | `git ls-files` shows no match |
| 6 | `copy-service-account` build step removed; `dist/service-account.json` gone | **PASS** | `package.json`; `dist/` deleted and rebuilt without it |
| 7 | `src/config/credentials.ts` deleted, import path cleaned, **no other refactor of `src/services/ai.ts`** | **PASS** | 1-line import edit only; `git show --stat` |
| 8 | Browser-facing Groq secret removed from tracked config; no new frontend secret | **PASS** | `src/config/api.ts`, `.env.example`, `README.md` |
| 9 | Fresh frontend build still succeeds | **PASS** | `npm run build` exit 0, 1,593 modules, `index-Dmvoeb2c.js` |
| 10 | No historical **or freshly built** client asset contains a `gsk_` token or Google key material | **PASS** | 0 matches in the fresh bundle; 0 in history |
| 11 | Committed dump inspected (without exposing content); credentials/PII determination recorded | **PASS** | §3 F3 — no plaintext credential; PII + 7 bcrypt hashes present |
| 12 | Backup files untracked; dump/backup/key patterns gitignored | **PASS** | `.gitignore` |
| 13 | Supabase DB password rotated **if** the dump proved a usable credential | **PASS (not required)** | No plaintext DB credential found. Supabase access unavailable regardless |
| 14 | `.env` history checked; `GOOGLE_PRIVATE_KEY` classified | **PASS** | F11 (never committed), F12 (placeholder) |
| 15 | New **append-only** hardening migration; no existing migration edited | **PASS** | `20261005181500_security_hardening.sql`; additions only |
| 16 | `users` SELECT policy self-scoped + reproducible negative test | **PASS (logic)** / ⛔ **BLOCKED (live)** | §8.3 — fail-before, pass-after, idempotent, on a throwaway cluster; live application is H5 |
| 17 | `filled_templates` **not** guessed; guarded RLS only if conclusively verified | **PASS (correctly blocked)** | Not verified → **BLOCKED → P5a**, no DDL invented |
| 18 | Duplicate PUBLIC-role policies removed **only** via a new guarded migration, never by editing history | **PASS** | §8.2 |
| 19 | `searchEvents` interpolation **not** implemented in P0; recorded as outstanding P5b | **PASS** | Not touched; recorded as F8 → P5b |
| 20 | Pre-rewrite mirror/backup created before history modification | **PASS** | §6.1 — bundle (verified) + bare mirror outside the repo |
| 21 | All refs and every revision containing compromised material rewritten | **PASS** | 5 of 7 refs rewritten; 2 never contained it |
| 22 | Reflogs expired / objects pruned | **PASS** | `reflog expire` + `gc --prune=now` |
| 23 | Rescan of the rewritten history → **zero findings** | **PASS** | §7 |
| 24 | Working tree clean, refs enumerated, mirror preserved, re-clone documented before any force-push | **PASS** | §6.4, §6.5 |
| 25 | Remote force-push performed **only** if authenticated remote + authorisation available | **PASS (correctly not performed)** | ⛔ H3 |
| 26 | `git log --all -- service-account.json` **and** the backup paths return nothing | **PASS** | all five path checks empty |
| 27 | **Secret-scanning** regression protection added, narrowly scoped | **PARTIAL** | `scripts/secret_scan.py` + `.githooks/pre-commit` committed and the scanner verified; the **hook itself could not be executed** here (no POSIX shell) → H6. The npm script `secret-scan` provides the same gate |
| 28 | `docs/security-remediation.md` records all required information | **PASS** | this document |
| 29 | **No secret values recorded anywhere** | **PASS** | §11 |
| 30 | Google key rotated/disabled; replacement verified against the speech path | ⛔ **BLOCKED** | H1 — no GCP access |
| 31 | Groq key rotated; no replacement secret browser-bundled | ⛔ **BLOCKED (rotation)** / **PASS (bundle)** | H2; bundle verified clean |

† Achieved with a purpose-built equivalent scanner because gitleaks/TruffleHog could not be installed. This is a **documented deviation from the letter of the instruction**, not a silent substitution.

**Not executed, by design:** `filled_templates` RLS test (nothing was hardened there — criterion applies only "if conclusively verified").

---

## 11. Confirmation that no secret values were recorded

**No secret value — no private key, no API key, no password, no token, no session identifier, no connection string, and no personal data — appears in this document, in `docs/p0-evidence/`, in any commit message, or in any committed file.**

Values were characterised only structurally: byte sizes, git object IDs (non-secret), counts, pattern-format matches ("matches the `gsk_` format"), and policy/DDL text. During investigation, inspection scripts printed **booleans and counts only** and never echoed matched content. No PII from the database dump was ever printed, logged or committed.

---

## 12. Rollback and recovery

| Scenario | Recovery |
|---|---|
| Need the pre-rewrite repository (any reason) | Restore from `<repo>/.git/p0-prewrite-backup.bundle` (`git clone <bundle> <dir>`) or from the bare mirror `C:\Users\danie\OneDrive\Documents\GitHub\voiceform\VoiceForm-p0-prewrite.git`. Both contain **all 137 commits and all 7 refs exactly as they were before the rewrite.** |
| Revert just the code changes | `git revert` the P0 commit, or check out `66064ec…` from the bundle/mirror. |
| Undo the RLS migration | Add a **new forward migration** that drops `Users can read own row` and recreates the previous policy. **Do not edit** `20261005181500_security_hardening.sql` (append-only). |
| Accidentally re-expose the Groq key channel | `src/config/api.ts` sets `GROQ_API_KEY` to `undefined` on purpose; `processWithGroq()` falls back to its pre-existing mock path. Do **not** reintroduce a `VITE_`-prefixed key — P3 moves Groq server-side. |
| The Express backend loses its Google credential | The local `service-account.json` is still on disk (untracked, gitignored). If it is ever lost, recreate it from GCP **after** issuing a new key (H1) and keep it out of git. |
| The `dist/` bundle needs regenerating | `npm run build` (verified working, exit 0). |

---

## 13. Deviations, limitations and residual risk

1. **gitleaks / TruffleHog / git-filter-repo / BFG could not be installed** (no shell network); **`git filter-branch` cannot run** (no POSIX shell). Equivalent purpose-built tooling was used and is committed for audit. → H6 for enabling the hook.
2. **The rewrite changed every commit SHA** on `main` and `deb`. Any collaborator with an existing clone holds the old (secret-bearing) objects and **must re-clone** after the remote rewrite.
3. **The remote still contains the compromised material** until H3 is completed. Rotation (H1, H2) must not wait for it.
4. **The `users` policy fix is verified in logic but not applied to production** (H5). **The cross-tenant read is still live until then.**
5. **`filled_templates` remains unprotected** — carried forward to P5a (F5).
6. **The recovery artefacts intentionally contain the leaked material** and are therefore themselves sensitive (H7).
7. The `service-account.json` on disk is the **compromised** key, retained only to keep the existing Express backend functional until rotation.
8. The pre-rewrite scan of *reachable* history did not detect the two dangling `gsk_` blobs; they were found by an **object-database** scan. This is why both modes exist and both were run.
9. `docs/python-migration-plan.md` and `scripts/secret_scan.py` legitimately contain the **text** `gsk_` / `pg_dump` and will always match a loose scan. They are documented false positives; the strict patterns do not match them.

---

*P0 STATUS: **INCOMPLETE** — all repository-local remediation is complete and verified; external credential rotation (H1, H2), live migration application (H5) and the remote history rewrite (H3) remain blocked on human action. P1 has not been started.*
