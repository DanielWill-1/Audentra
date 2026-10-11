const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..', '..', '..');
const run = process.env.P7_EVIDENCE_RUN || 'post-wave-review-20261012';
const baseUrl = process.env.P7_REACT_BASE_URL || 'http://127.0.0.1:15573';
const outputRoot = path.join(root, 'docs', 'pages', 'evidence');
const userId = '11111111-1111-4111-8111-111111111111';
const templateId = '33333333-3333-4333-8333-333333333333';
const eventId = '44444444-4444-4444-8444-444444444444';
const routes = {
  w3: [
    ['login', '/login'], ['signup', '/signup'],
    ['forgot-password', '/forgot-password'], ['reset-password', '/reset-password'],
  ],
  w4: [['dashboard', '/dashboard']],
  w5: [['templates', '/templates']],
  w6: [
    ['scheduler', '/scheduler'], ['manage-schedules', '/manage-schedules'],
    ['scheduler-settings', '/scheduler-settings'],
  ],
  w7: [
    ['voice-autofill', `/AIVoiceAutoFill?template=${templateId}`],
    ['filled-templates', '/filledtemplates'], ['activity-log', '/activitylog'],
  ],
};
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];
const fixtureUser = {
  id: userId,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'synthetic@example.invalid',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { first_name: 'Demo', last_name: 'User' },
  created_at: '2026-10-11T10:00:00.000Z',
  updated_at: '2026-10-11T10:00:00.000Z',
};
const fixtureTemplate = {
  id: templateId,
  name: 'Patient intake',
  category: 'healthcare',
  description: 'Synthetic browser-capture template',
  form_data: { fields: [
    { id: 'patient_name', label: 'Patient name', type: 'text', required: true },
    { id: 'email', label: 'Email', type: 'email', required: false },
  ] },
  visibility: 'visible',
  created_by: userId,
  created_at: '2026-10-11T10:00:00.000Z',
  updated_at: '2026-10-11T10:00:00.000Z',
  uploaded_file: null,
  shared_with: [],
  reviews: [],
};
const fixtureEvent = {
  id: eventId,
  title: 'Review patient intake',
  description: 'Synthetic browser-capture schedule',
  date: '2026-10-12',
  time: '09:30:00',
  duration: 30,
  type: 'form_review',
  priority: 'high',
  attendees: ['Demo User'],
  location: 'Review room',
  form_id: templateId,
  reminder_minutes: 15,
  status: 'scheduled',
  created_by: userId,
  created_at: '2026-10-11T10:00:00.000Z',
  updated_at: '2026-10-11T10:00:00.000Z',
};
const fixtureFilled = {
  id: '55555555-5555-4555-8555-555555555555',
  template_id: templateId,
  template_name: 'Patient intake',
  form_data: { patient_name: 'Sample Patient', email: 'patient@example.invalid' },
  created_at: '2026-10-12T08:00:00.000Z',
};

function fixtureFor(request) {
  const url = new URL(request.url());
  const table = url.pathname.split('/').filter(Boolean).at(-1);
  if (url.pathname.endsWith('/auth/v1/user')) return fixtureUser;
  if (table === 'templates') return [fixtureTemplate];
  if (table === 'scheduled_events') return [fixtureEvent];
  if (table === 'filled_templates') return [fixtureFilled];
  return [];
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const authOnly = process.argv.includes('--auth-only');
  const waveEntries = Object.entries(routes).filter(([wave]) =>
    authOnly ? wave === 'w3' : !process.argv.includes('--app-waves-only') || wave !== 'w3',
  );
  const summary = {
    captured_at: new Date().toISOString(),
    source: 'Current React/Vite routes with intercepted Supabase Auth/PostgREST synthetic fixture responses',
    fixture_identity: `${userId} (non-hosted synthetic account)`,
    fixture_data: 'Patient intake template, schedule, and filled-form row; all requests to the dummy Supabase origin are intercepted',
    base_url: baseUrl,
    browser: browser.version(),
    waves: {},
  };
  try {
    for (const [wave, waveRoutes] of waveEntries) {
      summary.fixture_identity = wave === 'w3'
        ? 'Anonymous source-browser state; Auth forms do not use a synthetic account'
        : `${userId} (non-hosted synthetic account)`;
      summary.fixture_data = wave === 'w3'
        ? 'Auth pages captured without a signed-in session; no credentials were submitted'
        : 'Patient intake template, schedule, and filled-form row; all dummy-origin requests are intercepted';
      const output = path.join(outputRoot, wave, run, 'legacy');
      await fs.mkdir(output, { recursive: true });
      const pages = [];
      for (const [slug, route] of waveRoutes) {
        for (const viewport of viewports) {
          const context = await browser.newContext({ viewport });
          if (wave !== 'w3') {
            await context.addInitScript(({ syntheticUser }) => {
              const now = Math.floor(Date.now() / 1000);
              localStorage.setItem('sb-127-auth-token', JSON.stringify({
                access_token: 'synthetic-browser-capture-token',
                token_type: 'bearer',
                expires_in: 3600,
                expires_at: now + 3600,
                refresh_token: 'synthetic-browser-capture-refresh',
                user: syntheticUser,
              }));
            }, { syntheticUser: fixtureUser });
          }
          const page = await context.newPage();
          const consoleErrors = [];
          const failedRequests = [];
          page.on('console', (message) => {
            if (message.type() === 'error') consoleErrors.push(message.text());
          });
          page.on('pageerror', (error) => consoleErrors.push(error.message));
          page.on('requestfailed', (requestItem) => failedRequests.push(requestItem.url()));
          await page.route('http://127.0.0.1:9/**', async (requestRoute) => {
            const responseBody = fixtureFor(requestRoute.request());
            await requestRoute.fulfill({
              status: 200,
              contentType: 'application/json',
              headers: { 'content-range': '0-0/1' },
              body: JSON.stringify(responseBody),
            });
          });
          await page.route('http://localhost:3001/**', async (requestRoute) => {
            await requestRoute.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
          });

          const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'commit', timeout: 60000 });
          assert.equal(response?.status(), 200, `${route} should render in the source React app`);
          await page.locator('#root h1').first().waitFor({ state: 'visible', timeout: 30000 });
          await page.waitForTimeout(800);
          const info = await page.evaluate(() => ({
            url: window.location.pathname + window.location.search,
            title: document.title,
            heading: document.querySelector('h1')?.innerText.trim() || null,
            document_width: document.documentElement.scrollWidth,
            viewport_width: document.documentElement.clientWidth,
          }));
          assert.equal(new URL(page.url()).pathname, new URL(route, baseUrl).pathname,
            `${route} should remain on its requested source route`);
          assert.ok(info.heading, `${route} should have a source heading`);
          assert.deepEqual(consoleErrors, [], `${route} should not emit console errors`);
          assert.deepEqual(failedRequests, [], `${route} should not fail requests`);
          const screenshot = `${slug}-${viewport.name}.png`;
          await page.screenshot({ path: path.join(output, screenshot), fullPage: true });
          await fs.writeFile(path.join(output, `${slug}-${viewport.name}.html`), await page.locator('#root').innerHTML(), 'utf8');
          pages.push({ route, viewport, response_status: response.status(), ...info, console_errors: consoleErrors, failed_requests: failedRequests, screenshot });
          await context.close();
        }
      }
      const waveResult = { wave: wave.toUpperCase(), pages };
      summary.waves[wave] = waveResult;
      await fs.writeFile(path.join(output, 'capture-results.json'), `${JSON.stringify({ ...summary, waves: { [wave]: waveResult } }, null, 2)}\n`);
      process.stdout.write(`${JSON.stringify({ wave, pages: pages.length, output }, null, 2)}\n`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
