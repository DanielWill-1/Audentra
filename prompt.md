I have a web project where `npm run dev` starts the application successfully.

Create a script that automatically visits **every user-facing page/route in the application and saves a screenshot of each page**.

### Core requirements

* Inspect the existing project first to determine the framework and routing system.
* Use **Playwright** for browser automation.
* Do NOT modify the application's UI, styling, components, routes, or functionality.
* Only add the files/configuration needed for the screenshot automation.

### Route discovery

Automatically discover all actual user-facing routes/pages in the project.

Inspect the routing structure rather than making me manually enter every route.

Do NOT screenshot:

* API routes
* static files
* internal framework routes
* authentication callbacks
* error/internal routes
* anything that isn't an actual user-facing page

If the framework's routing makes automatic discovery unreliable, create a small route configuration file as a fallback.

### Screenshot behavior

For every discovered route:

1. Open the page in a real Chromium browser using Playwright.
2. Wait for the page to load.
3. Wait for client-side rendering to finish.
4. Wait for images and fonts to load.
5. Take a **full-page screenshot**.
6. Capture the entire scrollable page, not just the visible viewport.
7. Save the screenshot as PNG.

Use a consistent desktop viewport, preferably something like:

* Width: 1440px
* Height: 900px

Do not use mobile dimensions.

### Output

Create:

`page-screenshots/`

Automatically create the directory if it doesn't exist.

Name screenshots based on their route.

Examples:

`/`
→ `home.png`

`/about`
→ `about.png`

`/projects`
→ `projects.png`

`/projects/my-project`
→ `projects-my-project.png`

Avoid filenames that contain problematic characters.

### Dev server

The script should work with the existing:

`npm run dev`

Prefer making the screenshot command automatically start the dev server if necessary.

For example:

`npm run screenshots`

should:

1. Start the dev server if it isn't already running.
2. Wait until the application is reachable.
3. Discover the routes.
4. Screenshot every route.
5. Save the images.
6. Close the browser.
7. Cleanly terminate the dev server if the script started it.

Do not kill unrelated processes.

If automatic dev-server management is problematic for the framework, provide a second command that assumes `npm run dev` is already running.

### Rendering

Before taking each screenshot, make sure:

* DOM has loaded
* React/Next/Vite/etc. client rendering has completed
* images have loaded
* fonts have loaded
* relevant network requests have completed

Avoid simply using a massive arbitrary timeout.

A small fallback delay is okay if necessary.

### Reliability

Print progress like:

`[1/15] Screenshotting /`
`[2/15] Screenshotting /about`
`[3/15] Screenshotting /projects`

On success:

`✓ /about → page-screenshots/about.png`

If one page fails:

* Log the route
* Log the error
* Continue with the remaining pages

At the end print something like:

`✓ 14 screenshots generated`
`✗ 1 failed`

Return a non-zero exit code if any screenshots failed.

Add reasonable navigation timeouts and retries.

### Important

Before implementing anything, inspect the repository and identify:

* framework
* router
* package manager
* existing scripts
* current `npm run dev` behavior
* how routes are defined

Then implement the **smallest clean solution** appropriate for this specific project.

Finally:

1. Install Playwright if necessary.
2. Add the screenshot script.
3. Add the appropriate `package.json` command, preferably:
   `npm run screenshots`
4. Run it against the actual project.
5. Verify that screenshots are actually generated.
6. Tell me exactly what files were added/changed and how to run it.

Do not refactor or modify unrelated application code.
