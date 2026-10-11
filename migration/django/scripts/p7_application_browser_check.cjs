const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..', '..', '..');
const wave = process.argv.find((argument) => /^--wave=w[3-7]$/.test(argument))?.slice(-2) || 'w4';
const run = process.env.P7_EVIDENCE_RUN || 'post-wave-review-20261012';
const referenceRun = process.env.P7_REFERENCE_RUN || run;
const baseUrl = process.env.P7_DJANGO_BASE_URL || 'http://127.0.0.1:18875';
const output = path.join(root, 'docs', 'pages', 'evidence', wave, run, 'django');
const sourceOutput = path.join(root, 'docs', 'pages', 'evidence', wave, referenceRun, 'legacy');
const appRoutes = {
  w3: [
    ['login', '/login', 200],
    ['signup', '/signup', 200],
    ['forgot-password', '/forgot-password', 200],
    ['reset-password', '/reset-password', 404],
  ],
  w4: [['dashboard', '/dashboard', 200]],
  w5: [['templates', '/templates', 200]],
  w6: [
    ['scheduler', '/scheduler', 200],
    ['manage-schedules', '/manage-schedules', 200],
    ['scheduler-settings', '/scheduler-settings', 200],
  ],
  w7: [
    ['voice-autofill', '/AIVoiceAutoFill?template=33333333-3333-4333-8333-333333333333', 200],
    ['filled-templates', '/filledtemplates', 200],
    ['activity-log', '/activitylog', 200],
  ],
};
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];
const results = {
  wave: wave.toUpperCase(),
  captured_at: new Date().toISOString(),
  source: 'Django DEBUG=False browser settings with isolated synthetic identity/data fixtures',
  fixture_identity: '11111111-1111-4111-8111-111111111111 (non-hosted synthetic account)',
  fixture_data: 'Patient intake template, one schedule, one filled-form row; no database or provider writes',
  base_url: baseUrl,
  browser: null,
  pages: [],
  interactions: [],
};

async function capture(browser, [slug, route, expectedStatus], viewport) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  const failedRequests = [];
  const responses = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(request.url()));
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin === baseUrl) responses.push({ path: url.pathname, status: response.status() });
  });

  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
  assert.equal(response?.status(), expectedStatus, `${route} should return ${expectedStatus}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');
  const info = await page.evaluate(() => ({
    title: document.title,
    heading: document.querySelector('h1')?.innerText.trim() || null,
    document_width: document.documentElement.scrollWidth,
    viewport_width: document.documentElement.clientWidth,
    has_react_root: Boolean(document.querySelector('#root,[data-reactroot]')),
    has_react_bootstrap: [...document.scripts].some((script) =>
      script.type === 'module' || /\/assets\/index-/.test(script.src)),
  }));
  const expectedNotFoundDiagnostic =
    expectedStatus === 404 &&
    consoleErrors.length === 1 &&
    consoleErrors[0] === 'Failed to load resource: the server responded with a status of 404 (Not Found)';
  assert.deepEqual(
    expectedNotFoundDiagnostic ? [] : consoleErrors,
    [],
    `${route} should not emit unexpected browser errors`,
  );
  assert.deepEqual(failedRequests, [], `${route} should not fail network requests`);
  assert.ok(responses.filter((item) => item.path.startsWith('/static/')).every((item) => item.status < 400));
  assert.equal(info.document_width > info.viewport_width, false, `${route} should not overflow`);
  assert.equal(info.has_react_root, false, `${route} must not mount React`);
  assert.equal(info.has_react_bootstrap, false, `${route} must not load the React bundle`);
  if (expectedStatus === 200) assert.ok(info.heading, `${route} should render its heading`);

  const screenshot = `${slug}-${viewport.name}.png`;
  await page.screenshot({ path: path.join(output, screenshot), fullPage: true });
  const sourceMarkup = await fs.readFile(
    path.join(sourceOutput, `${slug}-${viewport.name}.html`),
    'utf8',
  );
  const sourceInfo = await page.evaluate((markup) => {
    const parsed = new DOMParser().parseFromString(markup, 'text/html');
    const target = parsed.querySelector('main') || parsed.querySelector('#root') || parsed.body;
    target.querySelectorAll('script,style,svg,.sr-only,[aria-hidden="true"]').forEach((item) => item.remove());
    return {
      heading: target.querySelector('h1')?.textContent?.trim() || null,
      text: target.textContent?.replace(/\s+/g, ' ').trim() || '',
    };
  }, sourceMarkup);
  const djangoText = await page.evaluate(() => {
    const target = document.querySelector('#main-content') || document.querySelector('main') || document.body;
    const copy = target.cloneNode(true);
    copy.querySelectorAll('script,style,svg,.sr-only,[aria-hidden="true"]').forEach((item) => item.remove());
    return copy.textContent?.replace(/\s+/g, ' ').trim() || '';
  });
  const wordCounts = (value) => {
    const counts = new Map();
    for (const word of value.split(/\s+/).filter(Boolean)) counts.set(word, (counts.get(word) || 0) + 1);
    return counts;
  };
  const sourceWords = wordCounts(sourceInfo.text);
  const djangoWords = wordCounts(djangoText);
  const missingWords = [];
  const addedWords = [];
  for (const [word, count] of sourceWords) {
    for (let index = djangoWords.get(word) || 0; index < count; index += 1) missingWords.push(word);
  }
  for (const [word, count] of djangoWords) {
    for (let index = sourceWords.get(word) || 0; index < count; index += 1) addedWords.push(word);
  }
  results.pages.push({
    route,
    viewport,
    response_status: response.status(),
    ...info,
    console_errors: consoleErrors,
    expected_local_404_diagnostic: expectedNotFoundDiagnostic,
    responses,
    screenshot,
    comparison: {
      source_heading: sourceInfo.heading,
      django_heading: info.heading,
      source_text_characters: sourceInfo.text.length,
      django_text_characters: djangoText.length,
      normalized_text_exact_match: sourceInfo.text === djangoText,
      source_text_tokens_missing_from_django: missingWords,
      django_text_tokens_added: addedWords,
    },
  });

  if (wave === 'w4' && viewport.name === 'desktop') {
    await page.evaluate(() => localStorage.setItem('recentActivity', JSON.stringify([
      {
        type: 'form_started',
        title: 'Synthetic browser-local form',
        time: new Date().toISOString(),
        metadata: { untrusted: true },
      },
    ])));
    await page.reload({ waitUntil: 'domcontentloaded' });
    const activityRow = page.locator('[data-dashboard-recent-forms] li').filter({ hasText: 'Synthetic browser-local form' });
    assert.equal(await activityRow.count(), 1);
    assert.equal(await activityRow.getByRole('link', { name: 'Resume' }).getAttribute('href'), '/AIVoiceAutoFill');
    results.interactions.push({ route: '/dashboard', state: 'reads local form history as display data and uses a fixed resume destination' });
    const language = page.locator('[data-dashboard-preferences] [name="language"]');
    await language.selectOption('Spanish');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('voiceform_dashboard_settings')).language), 'Spanish');
    assert.equal(await page.locator('[data-dashboard-settings-status]').innerText(), 'Preferences saved in this browser.');
    await page.getByRole('button', { name: 'Team options' }).click();
    assert.equal(await page.locator('#team-demo').evaluate((dialog) => dialog.open), true);
    assert.match(await page.locator('#team-demo').innerText(), /Membership directories and email invitations are unavailable/);
    results.interactions.push({ route: '/dashboard', state: 'local preference saves and team dialog states the supported boundary' });
    await page.screenshot({ path: path.join(output, 'dashboard-team-dialog-desktop.png'), fullPage: true });
  }
  if (wave === 'w5' && viewport.name === 'desktop') {
    await page.getByRole('button', { name: 'Add field' }).click();
    await page.locator('[data-property="label"]').first().fill('Patient name');
    await page.locator('[data-property="required"]').first().check();
    const payload = JSON.parse(await page.locator('[data-form-data]').first().inputValue());
    assert.equal(payload.fields[0].label, 'Patient name');
    assert.equal(payload.fields[0].required, true);
    results.interactions.push({ route: '/templates', state: 'builder adds required field and serializes form JSON' });
    await page.screenshot({ path: path.join(output, 'templates-builder-desktop.png'), fullPage: true });
  }
  if (wave === 'w6' && slug === 'scheduler-settings' && viewport.name === 'desktop') {
    await page.getByRole('tab', { name: 'Notifications' }).click();
    assert.equal(await page.locator('[data-settings-panel="notifications"]').isVisible(), true);
    results.interactions.push({ route: '/scheduler-settings', state: 'settings tab switches with accessible selected state' });
    await page.screenshot({ path: path.join(output, 'scheduler-settings-notifications-desktop.png'), fullPage: true });

    const expectedUserId = await page.locator('[data-settings-key]').getAttribute('data-settings-user-id');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('[data-settings-export]').click(),
    ]);
    const downloadPath = await download.path();
    assert.ok(downloadPath, 'settings export should produce readable downloaded bytes');
    const exported = JSON.parse(await fs.readFile(downloadPath, 'utf8'));
    assert.equal(exported.user_id, expectedUserId);
    assert.equal(exported.settings.defaultDuration, 60);
    assert.equal(exported.settings.timezone, 'America/New_York');
    assert.deepEqual(exported.settings.workingDays, ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
    results.interactions.push({
      route: '/scheduler-settings',
      state: 'downloaded settings JSON contains the selected synthetic account and expected values',
      download_name: download.suggestedFilename(),
      verified_fields: ['user_id', 'defaultDuration', 'timezone', 'workingDays'],
    });
    assert.equal(await page.locator('[data-settings-status]').innerText(), 'Settings exported.');
  }
  await page.close();
}

async function main() {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  results.browser = browser.version();
  try {
    for (const route of appRoutes[wave]) {
      for (const viewport of viewports) await capture(browser, route, viewport);
    }
  } finally {
    await browser.close();
  }
  await fs.writeFile(path.join(output, 'browser-results.json'), `${JSON.stringify(results, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ pages: results.pages.length, interactions: results.interactions, output }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
