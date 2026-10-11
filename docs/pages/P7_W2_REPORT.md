# P7 W2 report: Home and Documentation

**Disposition:** Implemented and verified on 2026-10-12. The cumulative fallback count after W2 is 8.

W2 migrated `/` and `/documentation` into the Django public shell. Home retains its source sections and destinations. Documentation contains the reviewed architecture copy and code examples, with local copy controls that write the displayed code exactly, report success only after clipboard success, and expose recovery feedback when clipboard access is denied.

The 25-route manifest is unchanged. W2 adds two `django-page` owners; eight application routes remain controlled legacy fallbacks. The Auth routes remain local and excluded from fallback. No target-architecture statements in the documentation are treated as claims about the shipped runtime.

The current-source reference captures are preserved under [legacy evidence](evidence/w2/legacy/). Fresh Django browser evidence is under [post-wave review evidence](evidence/w2/post-wave-review-20261012/django/). Four viewport captures and three browser interactions passed. Django's clipboard-denial feedback is more accessible than the source denial state; this difference is recorded in [P7_DIFFERENCES.md](P7_DIFFERENCES.md).

See [verification](P7_W2_VERIFICATION.md), [assets](P7_W2_ASSETS.md), and [route ownership](P7_W2_ROUTE_OWNERSHIP.json).
