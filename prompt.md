CONTINUE THE AUDENTRA MIGRATION.

The public website migration and footer cleanup are complete.

The project has now been confirmed to be a VITE + REACT SPA.

From this point forward, work with the React architecture and routes.

DO NOT create new standalone HTML pages.

==================================================
THIS PASS
==================================================

Complete THREE tasks:

1. Redesign/migrate the authenticated Dashboard
2. Convert the existing saved document.html design/content into the React Documentation page
3. Convert the existing saved privacy.html design/content into the React Privacy page

IMPORTANT:

The existing HTML files are DESIGN/CONTENT REFERENCES.

The final implementation must be React/TSX integrated into the existing Vite application.

==================================================
CURRENT PROJECT STATE
==================================================

The following work is already complete:

- Home
- Features
- About
- Login
- Signup
- Header
- Footer
- favicon
- public navigation
- Terms
- Open Source License
- routing cleanup

DO NOT unnecessarily redesign or rewrite these.

The current public design system is APPROVED.

Use it as the visual foundation.

==================================================
FIRST: INSPECT THE PROJECT
==================================================

Before coding, inspect:

- src/App.tsx
- src/components/Header.tsx
- src/components/Footer.tsx
- current Dashboard component/page
- current Privacy.tsx
- current Documentation page/component if one exists
- completed Home.tsx
- completed Features.tsx
- completed About page
- shared CSS/design tokens
- authentication/session logic
- existing dashboard API calls
- routing
- old document.html
- old privacy.html

Do not assume filenames.

Locate the actual files first.

==================================================
IMPORTANT SOURCE-OF-TRUTH RULE
==================================================

For PUBLIC page styling:

1. Approved saved designs
2. Completed React public pages
3. Old HTML content/functionality

For DASHBOARD styling:

1. Approved NEW dashboard design
2. Existing React design system
3. Existing dashboard functionality

For Documentation:

document.html
= design/content source

React Documentation page
= implementation target

For Privacy:

privacy.html
= design/content source

Privacy.tsx
= implementation target

DO NOT invent replacement content when the source HTML already contains the intended content.

==================================================
TASK 1 — DASHBOARD
==================================================

Redesign the existing dashboard to match the APPROVED NEW Audentra dashboard design.

The existing dashboard functionality is the FUNCTIONAL SOURCE OF TRUTH.

The approved dashboard design is the VISUAL SOURCE OF TRUTH.

DO NOT rebuild dashboard functionality from scratch.

==================================================
DASHBOARD PRODUCT GOAL
==================================================

Audentra is a voice-first structured-data tool.

The dashboard's hierarchy must be:

1. Start Voice Form
2. Resume / Recent Forms
3. Templates
4. Upcoming
5. Secondary information

The dashboard must NOT feel like:

- SaaS analytics software
- CRM
- admin template
- enterprise dashboard
- marketplace
- sales product

It should feel like a focused WORKSPACE.

==================================================
DASHBOARD APP SHELL
==================================================

Implement the approved application shell.

Desktop:

LEFT SIDEBAR

Audentra logo

Home
Forms
Templates
Activity

divider

Settings

lower area:

GitHub
Documentation

bottom:

User avatar/name
account/logout control

Do NOT use the PUBLIC marketing navbar inside the authenticated dashboard.

The dashboard is application UI.

==================================================
SIDEBAR
==================================================

Approximate width:

220–240px

Style:

- light background
- subtle right border
- compact navigation
- restrained icons
- no gradients
- no giant navigation pills
- subtle active state

Active:

Home

Documentation should route to:

/documentation

GitHub should use the existing repository URL.

==================================================
DASHBOARD TOP AREA
==================================================

Remove the current giant:

"Welcome back, User!"

treatment.

Use a compact heading such as:

Home

What would you like to work on?

If the application has a real user name available from authentication state, it may be shown subtly.

Do NOT hardcode:

User

if actual session information is available.

==================================================
PRIMARY ACTION
==================================================

The strongest dashboard element must be:

Start with your voice

Description:

Speak naturally and Audentra will turn the conversation into structured form data.

Primary action:

Start Voice Form

Secondary:

Choose Template

Show a restrained microphone / waveform state.

Purple may be used ONLY as a subtle voice/audio accent.

DO NOT use the old purple-blue gradient card.

==================================================
RECENT FORMS
==================================================

Replace the old colorful Recent Activity cards with:

Recent forms

Use a clean list/table.

Possible columns:

FORM
STATUS
UPDATED
DURATION
ACTION

Use actual application data if available.

Do NOT replace real data with hardcoded mock data.

Status treatment:

Completed
→ subtle green badge

In Progress
→ subtle amber badge

Draft
→ neutral badge

Do NOT color the entire row.

==================================================
TEMPLATES
==================================================

Replace:

Template Marketplace

with:

Templates
or
Template Library

Use existing template functionality.

Possible quick actions:

Choose Template
Filled Forms
Create Template

Do not invent functionality that does not exist.

==================================================
UPCOMING / SCHEDULING
==================================================

Scheduling should become secondary.

Replace the huge:

Scheduling & Automation

area and its four statistic cards.

Use:

Upcoming

Show actual scheduled items if available.

If none:

No upcoming scheduled forms.

Schedule a form →

Preserve existing scheduling behavior.

==================================================
STATS
==================================================

Remove the giant:

Your Stats

card.

If legitimate stats are already calculated by the application, show them as small secondary metadata.

Do NOT hardcode:

47 forms
99.2%
2:14

unless those values actually come from application data.

No fake metrics.

==================================================
ERROR STATES
==================================================

The existing dashboard currently exposes errors such as:

Error loading templates
Failed to load upcoming events

Do NOT hide legitimate failures.

Redesign them as compact states:

Couldn’t load templates. Retry

Couldn’t load upcoming forms. Retry

Keep the underlying error handling.

Do not allow errors to dominate the page.

==================================================
EXISTING DASHBOARD FUNCTIONALITY
==================================================

Before modifying dashboard markup, inspect:

- API calls
- state
- hooks
- authentication
- scheduling
- templates
- recent forms
- event handlers
- navigation
- loading states
- retry behavior
- logout
- user information

PRESERVE ALL WORKING FUNCTIONALITY.

Do not replace functional React components with static mockups just to match the design.

==================================================
IMPORTANT EXISTING ERROR
==================================================

Previous QA identified:

ERR_NAME_NOT_RESOLVED

from an external Google Cloud/Supabase-related resource.

Investigate enough to identify exactly what request is failing.

DO NOT blindly rewrite infrastructure.

If the error is caused by:

- stale URL
- obsolete asset
- unused external resource
- incorrect frontend endpoint

and can be safely corrected, fix it.

If it is an environment/backend configuration problem, leave the behavior intact and report:

- failing URL/service
- originating source file
- likely configuration required

Do not hide the console error with catch blocks merely to make QA green.

==================================================
DASHBOARD RESPONSIVENESS
==================================================

Desktop:
persistent sidebar

Tablet:
collapsible sidebar

Mobile:
drawer or appropriate compact navigation

Ensure:

- Start Voice Form stays first
- Recent Forms remains usable
- tables adapt into compact rows
- no horizontal overflow
- controls remain touch-friendly

==================================================
TASK 2 — DOCUMENT.HTML → DOCUMENTATION TSX
==================================================

There is an existing:

document.html

This file contains the intended Documentation page design/content.

CONVERT IT INTO THE EXISTING REACT APPLICATION.

Do NOT simply embed document.html.

Do NOT use iframe.

Do NOT create /document.html.

The final route remains:

/documentation

==================================================
DOCUMENTATION IMPLEMENTATION
==================================================

Locate the existing React Documentation page.

If one exists:

refactor/replace its page content using document.html.

If one does not exist:

create an appropriate TSX page, for example:

src/pages/Documentation.tsx

and route:

/documentation

Use the project's established naming conventions.

==================================================
DOCUMENT.HTML CONVERSION RULES
==================================================

Inspect document.html carefully.

Convert:

HTML
→ JSX/TSX

Convert:

class
→ className

Convert inline JS appropriately.

Convert static navigation into React routing where appropriate.

Reuse:

Header
Footer
shared typography
buttons
design tokens
page containers

from the completed public site.

DO NOT copy:

duplicate <html>
<head>
<body>
global CSS imports
duplicate navbar
duplicate footer

into the React component.

Extract only the page-specific content/layout.

==================================================
DOCUMENTATION DESIGN
==================================================

Preserve the approved document.html design as closely as possible.

Documentation should prioritize:

- readability
- navigation
- hierarchy
- code examples
- headings
- anchors
- mobile usability

If document.html contains a documentation sidebar/table of contents, preserve it.

If it has anchor links:

make them functional.

If code examples exist:

preserve formatting.

Do not rewrite technical documentation simply to shorten it.

==================================================
DOCUMENTATION LINKS
==================================================

All existing:

Documentation

links should continue to point to:

/documentation

Do not introduce:

/document
/document.html
/docs

unless the project already intentionally supports them.

==================================================
TASK 3 — PRIVACY.HTML → PRIVACY.TSX
==================================================

IMPORTANT:

Privacy.tsx was recently rewritten from placeholder content.

However, there is an existing:

privacy.html

that represents the intended Privacy design/content.

USE privacy.html as the source of truth now.

Do NOT assume the recently generated Privacy.tsx content is preferred.

==================================================
PRIVACY CONVERSION
==================================================

Convert the existing privacy.html into the React implementation.

Final route:

/privacy

Final implementation:

Privacy.tsx
(or the project's existing Privacy component filename)

DO NOT create:

privacy.html

as a second production page.

==================================================
PRIVACY CONTENT
==================================================

Preserve the actual intended privacy content from privacy.html.

Do not invent:

- data practices
- retention periods
- third-party processors
- compliance claims
- legal guarantees
- jurisdictions
- contact information

unless those are present in the source or genuinely established by the project.

Legal copy should NOT be creatively rewritten during a UI migration.

==================================================
PRIVACY DESIGN
==================================================

Use the approved public design system.

Privacy should share:

Header
Footer
favicon
typography
background
content width

with the public site.

The body itself should be optimized for long-form reading.

Use:

clear H1
last-updated metadata if present
H2 sections
comfortable line length
lists
subtle separators
anchor navigation if the source design contains it

Do not turn legal text into dozens of cards.

==================================================
IMPORTANT: TERMS / OPEN LICENSE
==================================================

Do NOT rewrite Terms.tsx or Open.tsx during this task unless a shared component change requires a tiny compatibility adjustment.

However:

The previous report says Terms were rewritten using "Apache 2.0 terms."

Be careful:

Apache 2.0 is the SOFTWARE LICENSE.

It should primarily belong under:

Open Source License → /open

Do NOT treat Apache 2.0 itself as a substitute for website Terms of Use.

Inspect Terms.tsx.

If Terms.tsx incorrectly contains the Apache 2.0 software license instead of actual Terms of Use, REPORT THIS clearly.

Do not invent legal Terms of Use without instruction/source material.

==================================================
SHARED PUBLIC COMPONENTS
==================================================

Documentation and Privacy should use the existing:

Header
Footer

Do not duplicate them inside each page.

The dashboard should NOT use Header/Footer.

Dashboard uses its own application shell.

==================================================
ROUTING
==================================================

Final routes must include:

/                 Home
/features         Features
/about            About
/login            Login
/signup           Signup
/privacy          Privacy
/terms            Terms
/open             Open Source License
/documentation    Documentation
/dashboard        Dashboard

Preserve any additional legitimate application routes.

==================================================
DESIGN SYSTEM BOUNDARY
==================================================

There are now TWO related UI contexts:

PUBLIC SITE

Home
Features
About
Documentation
Privacy
Terms
Open
Login/Signup where appropriate

Uses:
public Header/Footer
larger editorial spacing
marketing/project presentation

APPLICATION

Dashboard
Forms
Templates
Activity
Settings
Voice workflow

Uses:
application shell/sidebar
denser spacing
productivity-focused UI

They should share:

- typography
- colors
- button language
- border language
- brand

but NOT identical layouts.

==================================================
DO NOT TOUCH YET
==================================================

Do NOT redesign unrelated application screens during this pass.

Do not redesign:

- full voice form workflow
- template editor
- forms management
- settings
- activity

unless dashboard navigation requires a minimal route/link adjustment.

Those come AFTER the dashboard.

==================================================
CODE QUALITY
==================================================

Do not:

- create giant monolithic components unnecessarily
- duplicate Header/Footer
- duplicate global CSS
- add another UI framework
- add unnecessary dependencies
- use inline styles everywhere
- replace real API data with mocks
- disable TypeScript checks
- suppress errors just to pass build

Reuse existing project patterns.

Extract dashboard subcomponents only where useful.

==================================================
QA
==================================================

After implementation:

Run the app and test in a real browser.

Test:

/
 /features
 /about
 /privacy
 /terms
 /open
 /documentation
 /login
 /signup
 /dashboard

Check:

- no landing-page regression
- footer unchanged
- favicon unchanged
- Documentation renders correctly
- Privacy matches privacy.html
- Dashboard matches approved design
- dashboard functionality still works
- auth/session still works
- dashboard navigation works
- GitHub links work
- Documentation links work
- no horizontal overflow
- no missing assets
- responsive desktop/mobile
- browser console

Run:

npm run build

Build must succeed.

==================================================
VISUAL QA
==================================================

Dashboard:

Compare against the APPROVED NEW DASHBOARD DESIGN, not the old screenshot.

Documentation:

Compare against document.html.

Privacy:

Compare against privacy.html.

Do not accept "close enough" simply because components render.

Spacing, hierarchy, typography and layout matter.

==================================================
FINAL REPORT
==================================================

When finished report:

DASHBOARD
- files changed
- old UI removed
- functionality preserved
- API/data behavior preserved
- responsive behavior
- unresolved backend/API errors

DOCUMENTATION
- source HTML used
- resulting TSX file
- route
- content/features preserved

PRIVACY
- source privacy.html used
- resulting TSX file
- what happened to the previously generated Privacy.tsx
- confirm no unsupported legal claims were invented

ROUTING
- confirm /dashboard
- confirm /documentation
- confirm /privacy

TERMS REVIEW
- state whether Terms.tsx currently contains legitimate Terms of Use or incorrectly duplicates/uses Apache 2.0 license material

REGRESSION CHECK
- Home
- Features
- About
- Header
- Footer
- Login
- Signup

BUILD
- npm run build result

BROWSER QA
- desktop result
- mobile result
- console errors

==================================================
CORE RULE
==================================================

This is a CONTINUATION of the existing migration.

Do not regenerate the project.

Do not rebuild working functionality.

The desired transformation is:

OLD DASHBOARD FUNCTIONALITY
        +
APPROVED DASHBOARD DESIGN 

dashboard.html
        ↓
NEW REACT DASHBOARD

document.html
        +
CURRENT PUBLIC DESIGN SYSTEM
        ↓
Documentation.tsx → /documentation

privacy.html
        +
CURRENT PUBLIC DESIGN SYSTEM
        ↓
Privacy.tsx → /privacy