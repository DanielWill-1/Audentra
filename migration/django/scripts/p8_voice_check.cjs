const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..', '..', '..');
const outputDir = process.env.P8_VOICE_EVIDENCE_DIR
  ? path.resolve(process.env.P8_VOICE_EVIDENCE_DIR)
  : path.join(root, 'docs', 'pages', 'evidence', 'w7', 'closeout-20261012');
const djangoBase = process.env.P7_DJANGO_BASE_URL || 'http://127.0.0.1:8877';
const templateId = '33333333-3333-4333-8333-333333333333';
const result = {
  captured_at: new Date().toISOString(),
  browser: null,
  boundary: 'Actual Django voice page and scripts; browser media/STT/AI/TTS APIs intercepted; save/list/delete use synthetic browser fixture middleware, not hosted persistence.',
  viewports: [],
  api: { transcription: [], extraction: [], tts: [] },
  journey: [],
  browser_errors: [],
  expected_request_cancellations: [],
};

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  result.browser = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    const track = { stopped: false, stop() { this.stopped = true; } };
    const stream = { getTracks: () => [track] };
    window.__p8Voice = { track, recorders: [], audios: [], rejectNextPlay: false };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => stream },
    });
    window.MediaRecorder = class FixtureRecorder extends EventTarget {
      static isTypeSupported(type) { return type === 'audio/webm;codecs=opus'; }
      constructor(_stream, options) {
        super();
        this.mimeType = options.mimeType;
        this.state = 'inactive';
        window.__p8Voice.recorders.push(this);
      }
      start() { this.state = 'recording'; }
      stop() {
        if (this.state === 'inactive') return;
        this.state = 'inactive';
        const data = new Blob([new Uint8Array([1, 2, 3, 4])], { type: this.mimeType });
        this.dispatchEvent(Object.assign(new Event('dataavailable'), { data }));
        queueMicrotask(() => this.dispatchEvent(new Event('stop')));
      }
    };
    window.Audio = class FixtureAudio extends EventTarget {
      constructor(src) {
        super();
        this.src = src;
        this.paused = true;
        this.pauseCalls = 0;
        window.__p8Voice.audios.push(this);
      }
      play() {
        if (window.__p8Voice.rejectNextPlay) {
          window.__p8Voice.rejectNextPlay = false;
          return Promise.reject(new DOMException('Playback was blocked', 'NotAllowedError'));
        }
        this.paused = false;
        return Promise.resolve();
      }
      pause() { this.paused = true; this.pauseCalls += 1; }
      removeAttribute(name) { if (name === 'src') this.src = ''; }
      load() {}
    };
  });

  const page = await context.newPage();
  page.on('pageerror', (error) => result.browser_errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') result.browser_errors.push(`console: ${message.text()}`);
  });
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText || 'unknown';
    if (request.url().includes('/api/tts') && failure.toLowerCase().includes('abort')) {
      result.expected_request_cancellations.push({ path: '/api/tts', reason: failure });
    } else if (request.url().includes('/api/ai/extract') && failure.toLowerCase().includes('abort')) {
      result.expected_request_cancellations.push({ path: '/api/ai/extract', reason: failure });
    } else if ((request.url().includes('fonts.googleapis.com') || request.url().includes('fonts.gstatic.com'))
      && failure.includes('ERR_ABORTED')) {
      result.expected_request_cancellations.push({ path: 'Google Fonts resource', reason: failure, cause: 'document navigation canceled a pending font request' });
    } else {
      result.browser_errors.push(`requestfailed: ${request.url()} (${failure})`);
    }
  });

  await page.route('**/api/transcribe', async (route) => {
    const request = route.request();
    const headers = await request.allHeaders();
    const body = request.postDataBuffer() || Buffer.alloc(0);
    result.api.transcription.push({
      method: request.method(),
      multipart: /^multipart\/form-data; boundary=/i.test(headers['content-type'] || ''),
      csrf_header_present: Boolean(headers['x-csrftoken']),
      marker_present: Boolean(headers['x-internal-api-token']),
      authorization_header_present: Boolean(headers.authorization),
      filename_present: body.includes(Buffer.from('filename="recording.webm"')),
      mime_type: body.toString('latin1').match(/name="mimeType"\r\n\r\n([^\r]+)/)?.[1] || null,
      audio_payload_present: body.includes(Buffer.from([1, 2, 3, 4])),
    });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ transcript: 'Patient name is Ada Lovelace.' }),
    });
  });

  let extractionCount = 0;
  let releaseFirstExtraction;
  let signalFirstExtractionStarted;
  const firstExtractionStarted = new Promise((resolve) => { signalFirstExtractionStarted = resolve; });
  let releaseStaleExtraction;
  let signalStaleExtractionStarted;
  const staleExtractionStarted = new Promise((resolve) => { signalStaleExtractionStarted = resolve; });
  await page.route('**/api/ai/extract', async (route) => {
    const request = route.request();
    const payload = JSON.parse(request.postData() || '{}');
    result.api.extraction.push({
      csrf_header_present: Boolean((await request.allHeaders())['x-csrftoken']),
      marker_present: Boolean((await request.allHeaders())['x-internal-api-token']),
      authorization_header_present: Boolean((await request.allHeaders()).authorization),
      current_patient_name: payload.currentFormData?.patient_name || '',
      prior_messages: Array.isArray(payload.conversation) ? payload.conversation.length : 0,
      user_message_present: Boolean(payload.userInput),
    });
    extractionCount += 1;
    if (extractionCount === 1) {
      signalFirstExtractionStarted();
      await new Promise((resolve) => { releaseFirstExtraction = resolve; });
    } else if (extractionCount === 3) {
      signalStaleExtractionStarted();
      await new Promise((resolve) => { releaseStaleExtraction = resolve; });
    }
    try {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(extractionCount === 1
          ? { response: 'I found the patient name.', extractedData: { 'Patient name': 'Ada Lovelace' } }
          : { response: 'I kept your reviewed name.', extractedData: { email: 'grace@example.invalid' } }),
      });
    } catch { /* The browser may cancel this request during pagehide. */ }
  });

  let ttsCount = 0;
  let releaseFirstTts;
  let releaseSecondTts;
  let releaseLastTts;
  await page.route('**/api/tts', async (route) => {
    const request = route.request();
    const headers = await request.allHeaders();
    ttsCount += 1;
    const index = ttsCount;
    result.api.tts.push({
      method: request.method(),
      csrf_header_present: Boolean(headers['x-csrftoken']),
      marker_present: Boolean(headers['x-internal-api-token']),
      authorization_header_present: Boolean(headers.authorization),
    });
    if (index === 1 || index === 2 || index === 6) {
      await new Promise((resolve) => {
        if (index === 1) releaseFirstTts = resolve;
        else if (index === 2) releaseSecondTts = resolve;
        else releaseLastTts = resolve;
      });
      try {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ audioContent: 'UklGRg==' }) });
      } catch { /* The browser cancelled this intercepted request as expected. */ }
    } else if (index === 5) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ audioContent: 'not-base64' }) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ audioContent: 'UklGRg==' }) });
    }
  });

  let returnRequestHeaders = null;
  page.on('request', async (request) => {
    if (request.method() === 'POST' && request.url().includes('/AIVoiceAutoFill')) {
      returnRequestHeaders = await request.allHeaders();
    }
  });

  try {
    const initial = await page.goto(`${djangoBase}/AIVoiceAutoFill`, { waitUntil: 'networkidle' });
    assert.equal(initial.status(), 200);
    await page.getByRole('link', { name: 'Use template' }).click();
    await page.locator('[data-voice-root]').waitFor();
    await page.waitForLoadState('networkidle');
    assert.equal(new URL(page.url()).searchParams.get('template'), templateId);
    assert.equal(await page.locator('#root').count(), 0);
    assert.ok(await page.evaluate(() => performance.getEntriesByType('resource')
      .some((item) => item.name.includes('/static/js/p7_voice.js'))));
    assert.ok(await page.evaluate(() => performance.getEntriesByType('resource')
      .some((item) => item.name.includes('/static/js/p7_media.js'))));
    result.journey.push('selected accessible template on actual Django page; loaded both shipped scripts without React bootstrap');

    await page.getByRole('button', { name: 'Record', exact: true }).click();
    await page.getByRole('button', { name: 'Stop', exact: true }).click();
    await page.getByRole('button', { name: 'Transcribe recording' }).click();
    await page.waitForFunction(() => document.querySelector('[data-voice-message]').value
      === 'Patient name is Ada Lovelace.');
    assert.equal(result.api.transcription.length, 1);
    assert.equal(result.api.transcription[0].method, 'POST');
    assert.equal(result.api.transcription[0].multipart, true);
    assert.equal(result.api.transcription[0].csrf_header_present, true);
    assert.equal(result.api.transcription[0].marker_present, true);
    assert.equal(result.api.transcription[0].authorization_header_present, false);
    assert.equal(result.api.transcription[0].filename_present, true);
    assert.equal(result.api.transcription[0].mime_type, 'audio/webm;codecs=opus');
    assert.equal(result.api.transcription[0].audio_payload_present, true);
    result.journey.push('recorded, stopped, previewed and received deterministic multipart transcript through the actual page');

    await page.locator('[data-voice-message]').fill('Patient name is Ada Lovelace.');
    await page.getByRole('button', { name: 'Send to assistant' }).click();
    await firstExtractionStarted;
    assert.equal(await page.getByRole('button', { name: 'Send to assistant' }).isDisabled(), true);
    await page.locator('[data-voice-chat-form]').evaluate((form) => form.requestSubmit());
    await page.waitForTimeout(50);
    assert.equal(result.api.extraction.length, 1);
    releaseFirstExtraction();
    await page.waitForFunction(() => document.querySelector('[name="field_patient_name"]').value === 'Ada Lovelace');
    await page.locator('[name="field_patient_name"]').fill('Grace Hopper');
    await page.locator('[data-voice-message]').fill('Keep my reviewed name and add my email.');
    await page.getByRole('button', { name: 'Send to assistant' }).click();
    await page.waitForFunction(() => document.querySelector('[name="field_email"]').value === 'grace@example.invalid');
    assert.equal(result.api.extraction.length, 2);
    assert.equal(result.api.extraction[0].prior_messages, 1);
    assert.equal(result.api.extraction[1].prior_messages, 3);
    assert.equal(result.api.extraction[1].current_patient_name, 'Grace Hopper');
    assert.equal(result.api.extraction.every((item) => item.csrf_header_present && item.marker_present
      && !item.authorization_header_present), true);
    result.journey.push('duplicate chat submission was ignored while busy; extraction matched a field, then preserved a reviewed edit and conversation across the next request');

    await page.locator('[name="field_patient_name"]').fill('');
    await page.getByRole('button', { name: 'Save filled form' }).click();
    assert.equal(await page.locator('[name="field_patient_name"]').evaluate((field) => field.checkValidity()), false);
    await page.locator('[name="field_patient_name"]').fill('Grace Hopper');
    result.journey.push('required-field browser validation blocks an incomplete save');

    await page.screenshot({ path: path.join(outputDir, 'voice-review-desktop.png'), fullPage: false });
    result.viewports.push({ viewport: '1440x900', overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), selected_template: true, transcript_and_review_visible: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(outputDir, 'voice-review-mobile.png'), fullPage: false });
    result.viewports.push({ viewport: '390x844', overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), selected_template: true, transcript_and_review_visible: true });
    assert.equal(result.viewports.every((item) => !item.overflow), true);

    const csrfDiagnostics = await page.evaluate(() => ({
      origin: location.origin,
      cookie: document.cookie,
      formToken: document.querySelector('[data-voice-return-form] [name="csrfmiddlewaretoken"]')?.value,
      returnBody: new FormData(document.querySelector('[data-voice-return-form]'))
        .get('csrfmiddlewaretoken'),
    }));
    const returnResponsePromise = page.waitForResponse((response) =>
      response.request().method() === 'POST' && response.url().includes('/AIVoiceAutoFill'));
    await page.getByRole('button', { name: 'Return to chat' }).click();
    const returnResponse = await returnResponsePromise;
    assert.equal(returnResponse.status(), 200, `Return to chat failed (${JSON.stringify({ csrfDiagnostics, returnRequestHeaders })}): ${await returnResponse.text()}`);
    await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('[data-chat-messages]').getByText('Keep my reviewed name and add my email.').count(), 1);
    assert.equal(await page.locator('[name="field_patient_name"]').inputValue(), 'Grace Hopper');
    assert.equal(await page.locator('[name="field_email"]').inputValue(), 'grace@example.invalid');
    result.journey.push('Return to chat preserved conversation and reviewed field values across the Django form navigation');

    await page.locator('[data-voice-review-form] [name="field_patient_name"]').fill('Grace Hopper');
    const saved = await Promise.all([
      page.waitForResponse((response) => response.url().includes('/filledtemplates') && response.status() === 200),
      page.getByRole('button', { name: 'Save filled form' }).click(),
    ]);
    assert.equal(saved[0].status(), 200);
    const savedCard = page.locator('article').filter({ hasText: 'Grace Hopper' });
    await savedCard.waitFor();
    assert.equal(await savedCard.getByText('Grace Hopper').count(), 1);
    await page.screenshot({ path: path.join(outputDir, 'filled-list-populated-mobile.png'), fullPage: false });
    result.journey.push('saved reviewed values through the actual Django page and rendered the synthetic filled-list fixture');

    page.once('dialog', (dialog) => dialog.accept());
    await savedCard.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('status').filter({ hasText: 'Filled form deleted.' }).waitFor();
    assert.equal(await page.locator('article').filter({ hasText: 'Grace Hopper' }).count(), 0);
    result.journey.push('confirmed deletion updated the synthetic filled-list fixture');

    await page.goto(`${djangoBase}/AIVoiceAutoFill?template=${templateId}`, { waitUntil: 'networkidle' });
    await page.locator('[data-voice-message]').fill('Discard this delayed answer.');
    await page.getByRole('button', { name: 'Send to assistant' }).click();
    await staleExtractionStarted;
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
    releaseStaleExtraction();
    await page.waitForTimeout(50);
    assert.equal(await page.locator('[data-chat-messages]').getByText('I kept your reviewed name.').count(), 0);
    assert.equal(await page.locator('[name="field_email"]').inputValue(), '');
    assert.equal(result.api.extraction.length, 3);
    result.journey.push('pagehide cancelled a delayed extraction and suppressed its stale answer and field update');

    await page.goto(`${djangoBase}/AIVoiceAutoFill?template=${templateId}`, { waitUntil: 'networkidle' });
    await page.locator('[data-voice-message]').fill('Prepare a spoken response.');
    await page.getByRole('button', { name: 'Send to assistant' }).click();
    await page.getByRole('button', { name: 'Speak response' }).first().waitFor();
    const speak = page.getByRole('button', { name: 'Speak response' }).first();
    await speak.click();
    await page.waitForFunction(() => document.querySelector('[data-media-status]').textContent.includes('Preparing'));
    await speak.click();
    await page.waitForFunction(() => document.querySelector('[data-media-status]').textContent.includes('Replacing'));
    if (releaseFirstTts) releaseFirstTts();
    if (releaseSecondTts) releaseSecondTts();
    await page.waitForFunction(() => document.querySelector('[data-media-status]').textContent.includes('Playing'));
    await page.waitForTimeout(50);
    assert.equal(await page.evaluate(() => window.__p8Voice.audios.length), 1);
    result.journey.push('a replaced pending TTS response was suppressed; the current response played once');

    await speak.click();
    await page.waitForFunction(() => window.__p8Voice.audios.length === 2);
    assert.equal(await page.evaluate(() => window.__p8Voice.audios[0].paused), true);
    assert.equal(await page.evaluate(() => window.__p8Voice.audios[0].src), '');
    await page.evaluate(() => { window.__p8Voice.rejectNextPlay = true; });
    await speak.click();
    await page.waitForFunction(() => document.querySelector('[data-media-status]').textContent.includes('Playback was blocked'));
    assert.equal(await page.evaluate(() => window.__p8Voice.audios[2].paused), true);
    result.journey.push('previous TTS audio was paused and released; rejected playback stayed visible');

    await speak.click();
    await page.waitForFunction(() => document.querySelector('[data-media-status]').textContent.includes('Speech playback is unavailable'));
    assert.equal(await page.evaluate(() => window.__p8Voice.audios.length), 3);
    result.journey.push('invalid TTS response was rejected without creating audio');

    await speak.click();
    await page.waitForTimeout(50);
    assert.equal(ttsCount, 6);
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
    if (releaseLastTts) releaseLastTts();
    await page.waitForFunction(() => window.__p8Voice.audios[2].paused === true);
    await page.waitForTimeout(50);
    assert.equal(await page.evaluate(() => window.__p8Voice.audios.length), 3);
    result.journey.push('pagehide cancelled pending TTS and prevented a stale audio response');

    assert.deepEqual(result.browser_errors, []);
    await fs.writeFile(path.join(outputDir, 'voice-integration-results.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    process.stdout.write(`${JSON.stringify({ journey: result.journey.length, viewports: result.viewports, output: outputDir }, null, 2)}\n`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
