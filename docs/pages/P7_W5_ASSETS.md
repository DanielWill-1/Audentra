# P7 W5 assets and provenance

`apps/application/templates/application/templates.html` and `static/js/p7_templates.js` implement the list, builder, and local dialog/stepper behavior. The protected view in `apps/application/views.py` delegates persistence and access checks to `apps/templates_app/` and private-file operations to `apps/storage/`. P5 contract/RLS tests remain the authority for the data model and role rules.

Current React reference markup/screenshots and synthetic-source browser results are under [evidence/w5/post-wave-review-20261012/legacy](evidence/w5/post-wave-review-20261012/legacy/). Django captures and builder state are under `evidence/w5/post-wave-review-20261012/django/`. P7 adds no public Storage URL, sharing API, or upload parser.
