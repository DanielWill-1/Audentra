# P9 verification ledger

**Run:** `p9-initial-readonly-20261013`  
**Environment:** Native Windows; branch `main`; HEAD `4e3e5c7e0a3bc383cea5d8b6b4d2ce18693469a6`; preserved dirty worktree. Full versions, digests and fixture boundary are in [P9_RUN_METADATA.json](evidence/p9/p9-initial-readonly-20261013/P9_RUN_METADATA.json).

| Check | Result | Artifact and boundary |
|---|---|---|
| P9 matrix created before execution | PASS | [P9_ACCEPTANCE_MATRIX.md](P9_ACCEPTANCE_MATRIX.md), all 25 route rows begin `NOT RUN — P9`. |
| Manifest, P6 registry, P7 report and Django resolver | PASS — 25/25 paths, categories, owners, view names and URL names match; zero fallback | [P9_ROUTE_OWNERSHIP.json](P9_ROUTE_OWNERSHIP.json), duplicated under [run evidence](evidence/p9/p9-initial-readonly-20261013/P9_ROUTE_OWNERSHIP.json). The script uses `config.settings.test`; it makes no HTTP request or database connection. |
| Command ledger | PASS | [P9_COMMAND_RESULTS.json](evidence/p9/p9-initial-readonly-20261013/P9_COMMAND_RESULTS.json). |
| P7 local regression gates | PASS as P7 closeout only | 167 pytest tests and Django system check; details in [P7 finding closeout](../pages/P7_SR_CLOSEOUT_2026-10-13.md). They are not counted as P9 route acceptance. |
| P8 deterministic prerequisite | PASS within synthetic browser/development-session boundaries | 16 fake-media checks and 12 actual selected-template page checks; see [P8 verification](../services/P8_VERIFICATION.md). Physical-device/live-provider results remain NOT RUN in P9. |
| Source/Django P9 browser route matrix | NOT RUN | Capture and interaction results must be written to a new P9 run directory. |
| Hosted RLS/Storage and schema inspection | NOT RUN | No hosted read or write was made in the initial P9 run. |
| Physical devices and live providers | NOT RUN | No device, microphone, live STT/TTS/extraction request or provider spend was used. |

The local route inventory is reproducible with `python migration/django/scripts/p9_local_route_inventory.py` from the repository root, using the documented Store Python/PYTHONPATH workaround from `migration/django/README.md` where needed. It compares paths and owner assignments, not HTTP response behavior, authenticated rendering, or persistence.
