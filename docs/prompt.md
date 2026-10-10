# Active migration prompt

The owner requested P5 implementation on 2026-10-11. P5 schema, Storage and Django data services are implemented; the phase remains partial until the hosted transaction-pooler/user-switch proof passes.

Use [root prompt.md](../prompt.md) as the canonical P5 brief:

- **P5a:** Schema/reference reconciliation, isolated baseline/remediation proof and reviewed Storage provisioning.
- **P5b:** Django models/selectors/services, fail-closed user RLS context, Storage adapter and hosted verification.

See [P5_REPORT.md](data/P5_REPORT.md) and [P5_VERIFICATION.md](data/P5_VERIFICATION.md) for the as-built status and exact remaining gate. The existing project/data and original source/reference folders remain preserved. Page rendering and route migration remain P6/P7; do not start them under this P5 handoff.

The [P4 brief](auth/P4_IMPLEMENTATION_PROMPT.md) is archived, and [P4_REPORT.md](auth/P4_REPORT.md) retains actual results. Exact exposed-key retirement remains separately approval-dependent. Email-based forgotten-password recovery remains unavailable; development signup confirmation must be reconsidered before production.
