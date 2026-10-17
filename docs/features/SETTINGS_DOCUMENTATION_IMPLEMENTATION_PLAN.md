# Scheduler Settings and Documentation implementation plan

**Date:** 2026-10-17  
**Status:** Implemented on 2026-10-17; focused and route-specific browser acceptance passed. See the [dated closeout](SETTINGS_DOCUMENTATION_CLOSEOUT_2026-10-17.md) for evidence and limits.  
**Review:** [Current implementation and page findings](ACTIVITY_SETTINGS_DOCUMENTATION_REVIEW_2026-10-17.md).  
**Confirmed decision:** Improve the existing `/scheduler-settings` page. Settings is frontend only for this iteration.

## 1. Result and scope

Scheduler Settings should feel like a coherent product screen: clear sections, useful previews, obvious save/error states, and honest availability for notifications and integrations. Documentation should teach the current application using working navigation, accurate examples, and the supported local start command.

For Settings, "frontend only" means layout, browser-local preference state, validation, and examples on the Settings page. **It does not include connecting these preferences to the live scheduler.** The page must say that saved choices apply to its preview. Browser storage is scoped to the current account on this origin/device; it is not account synchronization.

Keep `/scheduler-settings` protected and `/documentation` public. Use the existing Django templates, Tailwind tokens, local icon system, and small JavaScript modules. No new database tables, settings API, background jobs, provider configuration flow, account-management page, or SPA is needed.

The Dashboard's separate preferences panel remains a distinct feature. Actual reminder delivery, OAuth/calendar sync, availability enforcement, timezone conversion, and application-wide theming belong to later implementation work.

## 2. Carryover from the Activity review

These are separate corrective work, not part of the frontend Settings scope:

| Finding | Required correction | Acceptance |
| --- | --- | --- |
| A1: JSON retry equality | Use shared type-aware JSON comparison in both retry branches | Booleans and numbers conflict; nested changes conflict; identical objects with reordered keys retry successfully |
| A2: Deleted-source wildcard | Refuse a retry whose source identity cannot be established | A deleted A reference never matches template B; the saved A record remains readable; both ordinary and duplicate-insert recovery paths agree |
| A3: Activity UTC mismatch | Retain UTC text on Activity without changing localization elsewhere | Same event date/time with JS on/off and a non-UTC browser timezone; filters still use UTC |

The page refresh can proceed independently. Final documentation must not present these edge cases or the still-unrun real-stack concurrency/session checks as verified. Close the corrective work and outstanding acceptance explicitly in a later Activity review record.

## 3. Settings page design and behavior

Use a focused header with the title, Back to scheduler link, and a compact "Browser preview" status. Put the persistence explanation near the controls: "These preferences apply to the examples on this page and are saved in this browser." Replace the large generic warning with this contextual explanation and availability labels beside the affected features.

On desktop, use a narrow section rail and a flexible content column, with a small preview beside the active form when space permits. On mobile, use a wrapping section selector and place the preview below its controls. Use restrained borders and existing brand colors; do not add a new design system. The Save/Discard area must not obscure content at zoom or on a small viewport.

Proposed sections:

| Section | Content | Actual behavior in this iteration |
| --- | --- | --- |
| Scheduling | Default duration, reminder offset, working hours/days, read-only device timezone | Updates an explicitly labelled example event and weekly availability preview; no real reminder or scheduling restriction is created |
| Calendar display | Month/week preview, first weekday, weekends, compact density | Reorders/changes the local sample calendar, with no real events or server queries |
| Notifications | Reminder, email, push, and digest availability cards | Clearly unavailable; no active service toggles, browser permission prompts, or fake "sent" state |
| Connections & privacy | Calendar/chat integration availability, browser-storage explanation, links to Privacy and Security | Working links to `/privacy` and `/security`; external connections are unavailable and cannot be switched on |

Move compact density into Calendar display. Remove the unused global theme/color selector and the privacy switches that imply publishing calendars or inviting guests. Replace them with plain facts about the current feature. Do not add passwords, API keys, billing, or account deletion controls.

Use fictional sample events with an "Example" label. The examples must never resemble the user's actual saved schedules or create activity entries.

### Frontend state contract

Maintain a saved snapshot and an editable draft. Changing a control updates the preview and marks the draft unsaved. Save persists a valid draft; Discard restores the saved snapshot; Reset restores default values in the draft and still requires Save. Warn before leaving with unsaved changes using an accessible, proportionate confirmation; do not trap ordinary section navigation.

| State or action | Expected result |
| --- | --- |
| First visit | Valid default draft, working sample preview, visible explanation of scope |
| Input change | Preview updates immediately; unsaved indicator appears; saved storage is not changed |
| Save | Validate, persist, then show a visible saved confirmation; clear dirty state only after success |
| Invalid values | Inline field error plus visible summary; focus the first invalid field; preserve the draft |
| Storage unavailable | Keep editing/preview available and say changes could not be saved on this device |
| Discard | Restore the last saved preview and clear dirty state |
| Reset | Confirm replacement of a dirty draft; show defaults as unsaved until Save |
| Import | Validate the complete file before changing the draft; explain that imported choices still require Save |
| Export | Export the validated preview draft and identify it as a preferences file, not a schedule/account backup |
| JavaScript unavailable | Explain the interactive preview requirement; keep Back, Privacy, Security, and Documentation links usable |

Use visible feedback with an appropriate live region; do not leave status messages solely `sr-only`. Selected section styling must track selection and ARIA state. Use a navigation pattern that matches its actual orientation, with correct keyboard operation, focus indication, and panel relationships.

### Validation and existing browser data

- Duration: integer 15-10080, in 15-minute steps. Reminder offset: one of 0, 5, 10, 15, 30, 60, or 1440; 0 is labelled "No reminder" in the example. None of these choices enables delivery.
- Working hours: valid `HH:MM` values with start strictly before end. Overnight availability is outside this same-day preview. Allow no working days and show a clear empty availability example.
- Calendar: allowlisted month/week, Sunday/Monday start, weekend visibility, and compact density. Do not alter real scheduler calendar generation.
- Device timezone: read-only context detected through the browser with a safe fallback; remove the unused eight-option scheduler timezone control. Do not convert stored schedule times.
- Keep the current account-specific browser key. Accept the existing raw object and legacy export wrapper through a small compatibility reader. Use a versioned preferences envelope for new saves/exports; reject unsupported future versions and retain the 100 KB file limit.
- Import only supported preview properties. Drop retired notification/privacy/integration/theme flags from the new editable contract. Never use imported `user_id` to choose the browser key or account. New exports need no account identifier.
- Read/validate existing storage without rewriting it on page load. Saving is the explicit point where the new envelope replaces the stored value. A corrupt file/storage value must not partially replace a valid draft.

## 4. Documentation content and structure

Replace the captured fragment with readable Django markup owned by `apps/pages/templates/pages/documentation.html`. Remove Documentation's call to `_reviewed_source_markup()` while preserving the homepage branch. Retire the Documentation fragment only after confirming it has no remaining active references; keep all dated source/evidence snapshots.

Retain useful public styling: readable article width, clear headings, restrained code panels, desktop contents navigation, and a mobile section index. Keep the existing `quickstart`, `pipeline`, `schema-engine`, and `guides` anchors as meaningful sections or compatibility anchors. Add unique anchors for new topics.

| Chapter | Required content and working destinations | Source of truth |
| --- | --- | --- |
| Overview / quickstart | Pick/create a template, fill it, review, save, then open the exact saved record; links to `/templates`, `/AIVoiceAutoFill`, `/filledtemplates` | Application views and templates |
| Voice workflow (`pipeline`) | Record/transcribe or type, inspect suggestions, correct values, explicitly save; permissions/errors and manual input alternatives | `p7_media.js`, `p7_voice.js`, voice/speech/AI services |
| Template fields (`schema-engine`) | A small fictional `form_data.fields` example with the actual `id`, `label`, `type`, `required`, and supported option/validation shapes | Templates editor/import path and `apps/voice/services.py` |
| Saved forms and Activity | Five dashboard summaries, exact record/JSON/deletion, personal five-category history, filters, and the difference between deleting a record and removing history | Recent Forms implementation plus the follow-up review |
| Sharing, reviews, schedules (`guides`) | Short task guides that link to the actual template/scheduler pages; distinguish saved reminder metadata from delivered notifications | Template and scheduler services/views |
| Scheduler Settings | Describe the preview, local persistence, import/export, and unconnected capabilities exactly as this iteration implements them | New Settings page contract |
| Voice and data use | Conditional cloud processing and consent, what is sent, mock-mode distinction, and links to existing Privacy/Security text | Consent code, provider adapters, approved `/privacy` content |
| Local development (`local-start`) | Windows requirements, root launcher command, URL, optional port, stopping/recovery, and a short current-stack explanation | Root README, launcher, P10 local runbook |
| Internal HTTP reference | Actual `/api/transcribe/`, `/api/tts/`, `/api/ai/extract/` endpoints, methods/body types, session/CSRF/conditional consent requirements and errors | Speech/AI URL and view modules; these are not a newly promised public SDK |

The local-development command must be copyable exactly as displayed:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\start-local.ps1
```

Keep the user walkthrough first and developer details further down. Do not place repo migration-phase names or deployment approval language in ordinary product instructions. Explain local-development requirements only in the developer section.

Remove the fake schema compile result, ingestion-worker guarantee, Draft-07/2020-12 mismatch, invented setup times, segmentation telemetry, and inactive template download. Turn every "Read Guide" into a link to an actual section with matching instructions. Use real template-field JSON, not a JSON Schema the application does not execute.

Provider descriptions must be conditional on configuration. Do not read private environment files or expose credentials to build public documentation. Avoid claiming one model or 7.5 MiB as universal; derive an exact stated default from code and distinguish it from the effective upload UI/configuration. Reuse the existing privacy policy rather than inventing retention or compliance guarantees.

### Documentation interactions

Use explicit `data-copy-code` controls tied to unique code-block IDs. Copy must use the selected block's text, preserve focus, show visible success/error feedback, and offer manual copying when clipboard access fails. Multiple examples in one section must copy independently. Preserve the security-page PGP copy behavior when changing `pages.js`.

Contents links must land on visible headings without being hidden under sticky UI. Active-section enhancement is optional; the document must remain complete and navigable without JavaScript. Code panels may scroll horizontally inside the article; the overall page must not overflow.

Application links may redirect anonymous readers to sign-in. Do not use filesystem Markdown paths as website URLs. Retain external repository/support links only where they point to the intended project and do not promise a staffed service or an unimplemented SDK.

## 5. Six implementation waves

All six waves were implemented and reviewed on 2026-10-17. Their verified results and the remaining scope limits are recorded in the dated closeout.

| Wave | Implementation | Completion check |
| --- | --- | --- |
| 1. Page structure and contracts | **Complete.** Established the four Settings sections, preview/saved/draft contract, and Documentation outline/source map in native Django templates. | Settings remains protected and Documentation public; focused route tests pass. |
| 2. Settings interface | **Complete.** Added responsive form groups, fictional calendar example, section navigation, unavailable capability cards, contextual scope copy, and visible save/discard state. | Browser checks pass at 1440px, 390px, 320px, and 720px CSS widths; no whole-page overflow. |
| 3. Settings frontend behavior | **Complete.** Added draft/saved state, preview rendering, validation, storage compatibility, import/export, reset/discard, and visible errors. | Browser checks cover reload persistence, denied/corrupt/quota storage, atomic invalid imports, old-file compatibility, empty workweek, dirty state, and JS-disabled fallback. No service requests are made. |
| 4. Documentation rewrite | **Complete.** Replaced the captured fragment with native Django content, task guides, real field example, Recent Forms/Activity/Settings explanations, local start command, and internal HTTP reference. | Public route tests and focused content contracts pass; old anchors resolve; unsupported schema/provider claims and inactive download are removed. |
| 5. Navigation and accessibility | **Complete.** Added unique copy targets, section links, responsive code blocks, visible keyboard feedback, and manual-copy fallback when JavaScript is unavailable. | Three examples copy independently; clipboard denial has visible feedback; ten contents links work by keyboard and without JavaScript. |
| 6. Regression review and closeout | **Complete with recorded limits.** Updated current route contracts, ran focused checks, reviewed fresh desktop/mobile/narrow/reflow captures, and recorded Activity follow-ups. | Settings and Documentation route-specific checks pass. The unfiltered public W2 parity check still stops on `/`; the Privacy PGP historical control is absent from the current Django page. Details are in the closeout. |

Wave 4 can be drafted after Wave 1 while the Settings interface is built, but its Settings chapter must be finalized after Wave 3. Do not use the retired React runtime as the new acceptance target. Historical parity evidence stays historical; update current contracts to the agreed design instead of retaining tests for deliberately removed inert controls.

## 6. Expected file changes

| File or area | Purpose |
| --- | --- |
| `apps/application/templates/application/scheduler_settings.html` | New Settings layout, labels, semantic sections, preview, states, and fallback |
| `static/js/p7_settings.js` | Frontend draft/storage/preview/validation behavior; no scheduling/network side effects |
| `apps/application/views.py::scheduler_settings` | Only if render context is needed; preserve the existing verified account key and read-only page route |
| `apps/pages/templates/pages/documentation.html` | Readable owned Documentation content |
| `apps/pages/views.py`, `apps/pages/content/documentation.html` | Stop loading the old Documentation fragment; preserve homepage rendering and retired evidence |
| `static/js/pages.js` | Explicit multi-block copy behavior; preserve PGP copying |
| `assets/tailwind.input.css` | Only narrowly necessary component styles; prefer existing tokens/utilities |
| `tests/test_p7_pages.py`, `tests/test_p7_application.py` | Current public/protected render/content/auth contracts |
| `scripts/p7_browser_check.cjs`, `scripts/p7_application_browser_check.cjs` | Replace obsolete page assertions with meaningful Settings/Documentation checks |
| `scripts/p9_asset_check.cjs` | Inspect current assumptions; update only if markup/asset references intentionally change |
| `docs/features/` and fresh evidence directories | Dated closeout, results, and captures |

Paths above are relative to `migration/django/` except the final documentation/evidence area. Do not modify migrations or business services as part of this frontend page work. A1/A2 require their own corrective service changes; A3 requires its own scoped Activity markup correction.

## 7. Acceptance and handoff

| Area | Required checks |
| --- | --- |
| Settings state | First load, changed draft, valid save/reload, discard, reset, invalid duration/hours, no working days, and preview updates for every retained control |
| Storage/import/export | Corrupt/denied/quota-limited storage; old raw and wrapped files; supported/future versions; oversize/invalid files; exported draft and no identity fields; no partial invalid import |
| Scope honesty | Only browser preferences change; no event creation, activity entry, provider call, permission prompt, account update, or external sync occurs; no actual scheduler behavior is claimed |
| Documentation truth | Real field-format example, conditional providers, accurate limits/startup, saved-only forms, actual category/filter behavior, and no inactive guide/download promises |
| Documentation actions | Every anchor and guide link, both old and new deep links, correct copy target across multiple blocks, clipboard denial, and PGP regression |
| Accessibility/layout | 1440 px desktop, 390 px mobile, 320 px narrow viewport, 200% zoom, keyboard/focus, readable live feedback, long labels, and no whole-page horizontal overflow |
| Fallbacks | JS-disabled documentation/navigation and honest Settings fallback; unavailable storage/clipboard does not strand the reader |
| Existing boundaries | Settings remains protected/no-store; Documentation stays public; unrelated homepage, scheduler, voice consent, Recent Forms, and Activity behavior remain intact |

The focused Django page/application checks, JavaScript syntax checks, static-token verification, and route-specific Settings/Documentation browser checks were run on 2026-10-17. The dated closeout records exact results, environment, screenshots, the wider checks that did not pass, and remaining Activity work. It distinguishes this frontend preview from future functional Settings integration.
