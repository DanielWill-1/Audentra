# P7 W5 report: Templates, builder, sharing, and reviews

**Disposition:** Implemented and locally browser-verified on 2026-10-12. The cumulative fallback count is 6.

`/templates` is a protected Django view backed by the existing P5 template, sharing, review, and private-file services. The page supports bounded search/category/sort, create/edit/duplicate/visibility/delete, JSON export, private upload/download, UUID-based share/revoke/hide/role changes, and review requests/submissions/decisions. Forms preserve the verified request principal; submitted owner UUIDs are not authorization inputs. Private files are not exposed with public URLs. File uploads are stored as private attachments and do not claim to parse PDF/XLS/XLSX contents. The anonymous generated share link and email invitations remain unavailable under P5 decisions.

The browser fixture verifies the builder's required-field control and serialized JSON. Django view tests verify successful create/export delegation, owner identity passed into the P5 service, share/review record-ID handling, and denial paths. The hosted route check exercised the actual Django `/templates` flow against the development shared pooler with three fresh synthetic accounts: hidden-template owner isolation, viewer read/no-edit, unrelated-user denial, owner promotion to editor, persisted editor update, admin share management without content-edit rights, and admin/owner revocation. All 11 W5 checks passed, no emails were sent, and the exact generated shares, template, accounts, and tracked sessions were removed. The same hosted run added four W6 schedule-route checks; see the [sanitized combined result](evidence/w5/post-wave-review-20261012/hosted-route-results.json) and [aggregate verification](P7_VERIFICATION.md).

The browser fixture remains isolated and does not persist to Supabase. The hosted route test did not upload or download a real Storage object; the existing hosted P5 service/RLS checks remain the evidence for private file authorization and storage behavior.

See [verification](P7_W5_VERIFICATION.md), [assets](P7_W5_ASSETS.md), and [route ownership](P7_W5_ROUTE_OWNERSHIP.json).

## 2026-10-13 combined P7/P8 closeout

Recorded browser run: PASS. Full P7 acceptance is reopened by [review](P7_P8_SESSION_REVIEW_2026-10-13.md) for uncovered source-parity requirements; W6 also has a reproduced settings bug. The current W5 run recorded 2 route/page captures and 2 exercised interactions using actual Django application plus hosted Storage/share/review probe. Desktop 1440x900 and mobile 390x844 checks reported no overflow or unexpected browser errors. Evidence: docs/pages/evidence/w5/closeout-20261012/django/ and docs/pages/evidence/w5/closeout-20261012/hosted-route-results.json The complete combined results and boundaries are in docs/pages/P7_P8_CLOSURE_REPORT.md and docs/pages/P7_P8_CLOSURE_MATRIX.md.
