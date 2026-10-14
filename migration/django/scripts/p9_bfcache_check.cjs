const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.P7_DJANGO_BASE_URL || 'http://127.0.0.1:18875';
const evidenceDirectory = process.env.P9_EVIDENCE_DIR ? path.resolve(process.env.P9_EVIDENCE_DIR) : '';
const storageKey = 'p9-real-page-lifecycle';

async function main() {
  assert.ok(evidenceDirectory, 'Set P9_EVIDENCE_DIR to a new P9 evidence attempt directory.');
  await fs.mkdir(evidenceDirectory, { recursive: true });
  const resultPath = path.join(evidenceDirectory, 'P9_BFCACHE_RESULTS.json');
  await fs.access(resultPath).then(
    () => { throw new Error(`Refusing to overwrite ${resultPath}`); },
    () => undefined,
  );

  const browser = await chromium.launch({
    headless: true,
    ignoreDefaultArgs: ['--disable-back-forward-cache'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: { 'X-P7-Fixture-Reset': '1' },
  });
  await context.addInitScript((key) => {
    const previous = sessionStorage.getItem(key);
    window.__p9PageLifecycle = previous ? JSON.parse(previous) : [];
    const record = (eventName, persisted) => {
      window.__p9PageLifecycle.push({
        event: eventName,
        persisted,
        path: location.pathname,
        ready_state: document.readyState,
        media_start_enabled: document.querySelector('[data-record-start]')
          ? !document.querySelector('[data-record-start]').disabled
          : null,
      });
      sessionStorage.setItem(key, JSON.stringify(window.__p9PageLifecycle));
    };
    window.addEventListener('pageshow', (event) => record('pageshow', event.persisted));
    window.addEventListener('pagehide', (event) => record('pagehide', event.persisted));
  }, storageKey);

  const page = await context.newPage();
  let voiceResponse;
  try {
    const chooserResponse = await page.goto(`${baseUrl}/AIVoiceAutoFill`, { waitUntil: 'domcontentloaded' });
    assert.equal(chooserResponse?.status(), 200);
    await page.getByRole('heading', { name: 'Choose a Form Template' }).waitFor();
    const templateLink = page.getByRole('link', { name: 'Use template' }).first();
    [voiceResponse] = await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      templateLink.click(),
    ]);
    await page.getByRole('heading', { name: 'Review form fields' }).waitFor();
    await page.locator('[data-record-start]').waitFor();

    const dashboardResponse = await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
    assert.equal(dashboardResponse?.status(), 200);
    await page.getByRole('heading', { name: 'What would you like to work on?' }).waitFor();
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Review form fields' }).waitFor();
    await page.locator('[data-record-start]').waitFor();

    const lifecycle = await page.evaluate((key) => ({
      entries: JSON.parse(sessionStorage.getItem(key) || '[]'),
      current_path: location.pathname,
      media_start_enabled: !document.querySelector('[data-record-start]').disabled,
      media_stop_disabled: document.querySelector('[data-record-stop]').disabled,
      navigation: performance.getEntriesByType('navigation').at(-1)?.toJSON?.() || null,
    }), storageKey);
    const voiceShows = lifecycle.entries.filter((entry) =>
      entry.event === 'pageshow' && entry.path === '/AIVoiceAutoFill');
    const restoredShow = voiceShows.at(-1) || null;
    const result = {
      captured_at: new Date().toISOString(),
      route: '/AIVoiceAutoFill',
      destination: '/dashboard',
      browser: { name: 'Chromium', version: browser.version(), mode: 'headless browser; real cross-document navigation; no synthetic lifecycle dispatch' },
      viewport: { width: 1440, height: 900 },
      media_started: false,
      provider_requests: [],
      response_headers: {
        voice_cache_control: voiceResponse?.headers()['cache-control'] || null,
        dashboard_cache_control: dashboardResponse?.headers()['cache-control'] || null,
      },
      lifecycle: lifecycle.entries,
      back_navigation: {
        persisted: restoredShow?.persisted ?? null,
        recorder_start_enabled: lifecycle.media_start_enabled,
        recorder_stop_disabled: lifecycle.media_stop_disabled,
        navigation_type: lifecycle.navigation?.type || null,
        not_restored_reasons: lifecycle.navigation?.notRestoredReasons || null,
      },
      status: restoredShow?.persisted === true && lifecycle.media_start_enabled
        ? 'passed'
        : (restoredShow?.persisted === true ? 'restored-but-unusable' : 'bfcache-not-restored'),
      boundary: 'Local browser lifecycle check using real route navigation and synthetic account fixtures. No microphone, provider, hosted write or email request.',
    };
    await page.screenshot({ path: path.join(evidenceDirectory, 'voice-page-after-back.png'), fullPage: false });
    await fs.writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    process.stdout.write(`${JSON.stringify({ status: result.status, result: resultPath, back_navigation: result.back_navigation }, null, 2)}\n`);
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
