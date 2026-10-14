const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.P7_DJANGO_BASE_URL || 'http://127.0.0.1:18883';
const requestedDirectory = process.env.P9_DEVICE_EVIDENCE_DIR
  ? path.resolve(process.env.P9_DEVICE_EVIDENCE_DIR)
  : '';
const evidenceDirectory = requestedDirectory
  ? (() => {
    let attempt = 1;
    let candidate = path.join(requestedDirectory, `attempt-${String(attempt).padStart(2, '0')}`);
    while (fs.existsSync(candidate)) {
      attempt += 1;
      candidate = path.join(requestedDirectory, `attempt-${String(attempt).padStart(2, '0')}`);
    }
    return candidate;
  })()
  : '';

async function main() {
  if (!requestedDirectory) throw new Error('Set P9_DEVICE_EVIDENCE_DIR to a P9 evidence directory.');
  if (fs.existsSync(evidenceDirectory)) throw new Error(`Refusing to overwrite ${evidenceDirectory}`);
  fs.mkdirSync(evidenceDirectory, { recursive: true });

  const browser = await chromium.launch({
    headless: false,
    ignoreDefaultArgs: ['--disable-back-forward-cache'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
    extraHTTPHeaders: { 'X-P7-Fixture-Reset': '1' },
  });
  const page = await context.newPage();
  const browserSession = await browser.newBrowserCDPSession();
  const apiRequests = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url());
  });

  const result = {
    captured_at: new Date().toISOString(),
    scope: 'Desktop Chromium microphone permission denial only',
    boundary: 'Actual headed Chromium permission state and getUserMedia rejection on the isolated local Django page; no provider, hosted write, or audio capture.',
    os: { platform: os.platform(), release: os.release(), arch: os.arch() },
    browser: { name: 'Chromium', version: browser.version() },
    origin: new URL(baseUrl).origin,
    permission: null,
    get_user_media_error: null,
    page_result: null,
    api_requests: apiRequests,
    status: 'running',
  };
  const resultPath = path.join(evidenceDirectory, 'P9_DESKTOP_PERMISSION_RESULTS.json');
  const writeResult = () => fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, { flag: 'w' });

  try {
    const { browserContextIds } = await browserSession.send('Target.getBrowserContexts');
    assert.ok(browserContextIds?.length, 'Chromium must expose the isolated browser context ID');
    await browserSession.send('Browser.setPermission', {
      permission: { name: 'microphone' },
      setting: 'denied',
      origin: result.origin,
      browserContextId: browserContextIds.at(-1),
    });
    await page.addInitScript(() => {
      const nativeGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async (...args) => {
        try {
          return await nativeGetUserMedia(...args);
        } catch (error) {
          window.__p9GetUserMediaError = {
            name: error?.name || null,
            instance_of_error: error instanceof Error,
          };
          throw error;
        }
      };
    });

    const response = await page.goto(`${baseUrl}/AIVoiceAutoFill`, { waitUntil: 'domcontentloaded' });
    assert.equal(response?.status(), 200);
    await page.getByRole('heading', { name: 'Choose a Form Template' }).waitFor();
    await page.getByRole('link', { name: 'Use template' }).first().click();
    await page.locator('[data-record-start]').waitFor();

    result.permission = await page.evaluate(async () => ({
      secure_context: window.isSecureContext,
      state: (await navigator.permissions.query({ name: 'microphone' })).state,
      audioinput_count: (await navigator.mediaDevices.enumerateDevices())
        .filter((device) => device.kind === 'audioinput').length,
    }));
    assert.equal(result.permission.secure_context, true);
    assert.equal(result.permission.state, 'denied');

    await page.locator('[data-record-start]').click();
    await page.waitForFunction(() => !document.querySelector('[data-record-start]').disabled);
    result.get_user_media_error = await page.evaluate(() => window.__p9GetUserMediaError || null);
    result.page_result = await page.evaluate(() => ({
      message: document.querySelector('[data-media-status]')?.textContent?.trim() || '',
      record_enabled: !document.querySelector('[data-record-start]')?.disabled,
      stop_disabled: document.querySelector('[data-record-stop]')?.disabled,
      typed_entry_enabled: !document.querySelector('[data-voice-message]')?.disabled,
    }));
    assert.equal(result.get_user_media_error?.name, 'NotAllowedError');
    assert.equal(result.page_result.message, 'Microphone permission was denied. Type your message instead.');
    assert.equal(result.page_result.record_enabled, true);
    assert.equal(result.page_result.stop_disabled, true);
    assert.equal(result.page_result.typed_entry_enabled, true);
    assert.equal(apiRequests.length, 0);
    await page.screenshot({ path: path.join(evidenceDirectory, 'permission-denied.png') });
    result.status = 'passed';
  } catch (error) {
    result.status = 'failed';
    result.error = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    process.exitCode = 1;
  } finally {
    result.api_requests = apiRequests;
    writeResult();
    await context.close().catch(() => {});
    await browserSession.detach().catch(() => {});
    await browser.close().catch(() => {});
  }

  const scriptHash = crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex').toUpperCase();
  const resultHash = crypto.createHash('sha256').update(fs.readFileSync(resultPath)).digest('hex').toUpperCase();
  fs.writeFileSync(path.join(evidenceDirectory, 'P9_DESKTOP_PERMISSION_COMMAND_RESULTS.json'), `${JSON.stringify({
    status: result.status,
    command: 'node scripts/p9_desktop_permission_check.cjs',
    artifact: 'P9_DESKTOP_PERMISSION_RESULTS.json',
    artifact_sha256: resultHash,
    implementation: 'migration/django/scripts/p9_desktop_permission_check.cjs',
    implementation_sha256: scriptHash,
    provider_requests: apiRequests.length,
    boundary: 'Local headed Chromium only; permission state set to denied at the browser context, with no provider or hosted request.',
  }, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ status: result.status, evidence: evidenceDirectory, error: result.error || null })}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
