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
  media_error_cases: [],
  journey: [],
  browser_errors: [],
  expected_request_cancellations: [],
};

async function activateByKeyboard(page, control, key = 'Enter') {
  await control.focus();
  assert.equal(
    await control.evaluate((element) => element === document.activeElement),
    true,
    'keyboard target should receive focus before activation',
  );
  await page.keyboard.press(key);
}

async function replaceByKeyboard(page, control, value) {
  await control.focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  if (value) await page.keyboard.type(value);
}

async function submitMessageByKeyboard(page, message, submit, value, key = 'Enter') {
  await replaceByKeyboard(page, message, value);
  await page.keyboard.press('Tab');
  assert.equal(
    await submit.evaluate((element) => element === document.activeElement),
    true,
    'Tab from the message field should reach Send to assistant',
  );
  await page.keyboard.press(key);
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  result.browser = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    sessionStorage.clear();
    window.__p8Voice = {
      recorders: [],
      audios: [],
      getUserMediaCalls: 0,
      rejectNextPlay: false,
      mediaErrorName: null,
      nextRecordingByteCount: 4,
    };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => {
          window.__p8Voice.getUserMediaCalls += 1;
          if (window.__p8Voice.mediaErrorName) {
            const errorName = window.__p8Voice.mediaErrorName;
            window.__p8Voice.mediaErrorName = null;
            throw new DOMException('Synthetic media failure', errorName);
          }
          const track = { stopped: false, stop() { this.stopped = true; } };
          return { getTracks: () => [track] };
        },
      },
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
        const byteCount = window.__p8Voice.nextRecordingByteCount;
        window.__p8Voice.nextRecordingByteCount = 4;
        const bytes = byteCount === 4 ? new Uint8Array([1, 2, 3, 4]) : new Uint8Array(byteCount);
        const data = new Blob([bytes], { type: this.mimeType });
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
        return Promise.resolve().then(() => {
          setTimeout(() => {
            if (!this.paused) this.dispatchEvent(new Event('ended'));
          }, 0);
        });
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
  let signalFirstTtsReady;
  let signalSecondTtsReady;
  let signalLastTtsReady;
  const firstTtsReady = new Promise((resolve) => { signalFirstTtsReady = resolve; });
  const secondTtsReady = new Promise((resolve) => { signalSecondTtsReady = resolve; });
  const lastTtsReady = new Promise((resolve) => { signalLastTtsReady = resolve; });
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
        if (index === 1) {
          releaseFirstTts = resolve;
          signalFirstTtsReady();
        } else if (index === 2) {
          releaseSecondTts = resolve;
          signalSecondTtsReady();
        } else {
          releaseLastTts = resolve;
          signalLastTtsReady();
        }
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
    await activateByKeyboard(page, page.getByRole('link', { name: 'Use template' }));
    await page.locator('[data-voice-root]').waitFor();
    await page.waitForLoadState('networkidle');
    assert.equal(new URL(page.url()).searchParams.get('template'), templateId);
    assert.equal(await page.locator('#root').count(), 0);
    assert.ok(await page.evaluate(() => performance.getEntriesByType('resource')
      .some((item) => item.name.includes('/static/js/p7_voice.js'))));
    assert.ok(await page.evaluate(() => performance.getEntriesByType('resource')
      .some((item) => item.name.includes('/static/js/p7_media.js'))));
    result.journey.push('keyboard Enter selected the accessible template; both shipped scripts loaded on the actual Django page without React bootstrap');

    const recordButton = page.getByRole('button', { name: 'Record', exact: true });
    const mediaStatus = page.locator('[data-media-status]');
    const messageField = page.locator('[data-voice-message]');
    const consentPanel = page.locator('[data-cloud-ai-consent]');
    assert.equal(await consentPanel.isVisible(), true,
      'first use should present the cloud-processing notice before voice features');
    assert.equal(await consentPanel.getAttribute('aria-modal'), 'true',
      'the first-use consent notice should block access to the voice controls');
    assert.equal(await page.evaluate(() => window.__p8Voice.getUserMediaCalls), 0,
      'the page must not request microphone access before cloud-processing opt-in');
    assert.equal(await page.evaluate(() => window.__p8Voice.recorders.length), 0,
      'recording must not start before cloud-processing opt-in');
    assert.deepEqual(result.api, { transcription: [], extraction: [], tts: [] },
      'voice actions must not call cloud AI before opt-in');
    await page.locator('[data-cloud-ai-consent-accept]').click();
    assert.equal(await consentPanel.isHidden(), true,
      'accepting consent should close the blocking notice and expose the voice controls');
    const consentVersion = await page.locator('[data-voice-root]')
      .getAttribute('data-cloud-ai-consent-version');
    assert.ok(consentVersion, 'the active consent policy version must be available to the browser');
    assert.equal(
      await page.evaluate(() => localStorage.getItem('audentra.cloudAiConsent')),
      consentVersion,
      'the synthetic user opt-in should persist for the active policy version',
    );
    await page.locator('[data-auto-speak]').uncheck();
    assert.equal(await recordButton.isEnabled(), true,
      'recording should be available after the synthetic user opts in');
    result.journey.push('reviewed and accepted the cloud-processing notice in the isolated browser before using voice features');
    const assertMediaFallback = async (caseName, statusText, screenshotName) => {
      await page.waitForFunction((expected) =>
        document.querySelector('[data-media-status]')?.textContent?.trim() === expected, statusText);
      const recordEnabled = await recordButton.isEnabled();
      const messageEditable = await messageField.isEditable();
      const transcriptionRequests = result.api.transcription.length;
      assert.equal(recordEnabled, true, `${caseName} should restore the Record control`);
      assert.equal(messageEditable, true, `${caseName} should leave typed entry available`);
      assert.equal(transcriptionRequests, 0, `${caseName} must not send a transcription request`);
      result.media_error_cases.push({
        case: caseName,
        status: statusText,
        record_enabled: recordEnabled,
        message_editable: messageEditable,
        transcription_requests: transcriptionRequests,
      });
      await page.screenshot({ path: path.join(outputDir, screenshotName), fullPage: false });
      result.journey.push(`${caseName} restored the recorder and typed fallback without a transcription request`);
    };

    await page.evaluate(() => { window.__p8Voice.mediaErrorName = 'NotAllowedError'; });
    await activateByKeyboard(page, recordButton, 'Space');
    await assertMediaFallback(
      'synthetic microphone permission denial',
      'Microphone permission was denied. Type your message instead.',
      'media-permission-denied.png',
    );

    await page.evaluate(() => { window.__p8Voice.mediaErrorName = 'NotFoundError'; });
    await activateByKeyboard(page, recordButton, 'Space');
    await assertMediaFallback(
      'synthetic microphone unavailable',
      'No microphone is available. Type your message instead.',
      'media-no-device.png',
    );

    await page.evaluate(() => { window.__p8Voice.nextRecordingByteCount = 0; });
    await activateByKeyboard(page, recordButton, 'Space');
    await mediaStatus.getByText('Recording. Select Stop when you are done.').waitFor();
    await activateByKeyboard(page, page.getByRole('button', { name: 'Stop recording', exact: true }));
    await assertMediaFallback(
      'synthetic empty recording',
      'The recording was empty. Record again or type your message.',
      'media-empty.png',
    );
    assert.equal(await page.getByRole('button', { name: 'Transcribe', exact: true }).isDisabled(), true,
      'an empty recording must not enable Transcribe');

    const maxAudioBytes = Number(await page.locator('[data-voice-root]').getAttribute('data-max-audio-bytes'));
    assert.ok(Number.isSafeInteger(maxAudioBytes) && maxAudioBytes > 0,
      'the real page must expose its configured audio byte limit');
    await page.evaluate((byteCount) => { window.__p8Voice.nextRecordingByteCount = byteCount; }, maxAudioBytes + 1);
    await activateByKeyboard(page, recordButton, 'Space');
    await mediaStatus.getByText('Recording. Select Stop when you are done.').waitFor();
    await activateByKeyboard(page, page.getByRole('button', { name: 'Stop recording', exact: true }));
    await assertMediaFallback(
      'synthetic over-limit recording',
      'The recording is too large to transcribe. Reset and record a shorter message.',
      'media-oversized.png',
    );
    assert.equal(await page.getByRole('button', { name: 'Transcribe', exact: true }).isDisabled(), true,
      'an over-limit recording must not enable Transcribe');

    await activateByKeyboard(page, page.getByRole('button', { name: 'Record', exact: true }), 'Space');
    await page.waitForFunction(() => document.querySelector('[data-media-status]').textContent.startsWith('Recording.'));
    await activateByKeyboard(page, page.getByRole('button', { name: 'Stop recording', exact: true }));
    await page.waitForFunction(() => document.querySelector('[data-media-status]').textContent.startsWith('Recording ready.'));
    await activateByKeyboard(page, page.getByRole('button', { name: 'Transcribe', exact: true }), 'Space');
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
    result.journey.push('keyboard-activated Record, Stop and Transcribe; previewed a deterministic multipart transcript through the actual page');

    const sendButton = page.locator('[data-voice-chat-form] button[type="submit"]');
    await submitMessageByKeyboard(page, messageField, sendButton, 'Patient name is Ada Lovelace.');
    await firstExtractionStarted;
    assert.equal(await sendButton.isDisabled(), true);
    await page.locator('[data-voice-chat-form]').evaluate((form) => form.requestSubmit());
    await page.waitForTimeout(50);
    assert.equal(result.api.extraction.length, 1);
    releaseFirstExtraction();
    await page.waitForFunction(() => document.querySelector('[name="field_patient_name"]').value === 'Ada Lovelace');
    const patientName = page.locator('[name="field_patient_name"]');
    await replaceByKeyboard(page, patientName, 'Grace Hopper');
    const desktopState = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      selectedTemplate: Boolean(document.querySelector('[data-voice-root]')),
      chatVisible: Boolean(document.querySelector('[data-voice-chat-form]')),
      reviewVisible: Boolean(document.querySelector('[data-voice-review-form]')),
    }));
    assert.equal(desktopState.overflow, false);
    assert.equal(desktopState.selectedTemplate && desktopState.chatVisible && desktopState.reviewVisible, true);
    await page.screenshot({ path: path.join(outputDir, 'voice-review-desktop.png'), fullPage: false });
    result.viewports.push({ viewport: '1440x900', ...desktopState, keyboard_journey: 'template, media, chat, editable review' });
    await page.setViewportSize({ width: 390, height: 844 });
    await submitMessageByKeyboard(page, messageField, sendButton, 'Keep my reviewed name and add my email.', 'Space');
    await page.waitForFunction(() => document.querySelector('[name="field_email"]').value === 'grace@example.invalid');
    assert.equal(result.api.extraction.length, 2);
    assert.equal(result.api.extraction[0].prior_messages, 1);
    assert.equal(result.api.extraction[1].prior_messages, 3);
    assert.equal(result.api.extraction[1].current_patient_name, 'Grace Hopper');
    assert.equal(result.api.extraction.every((item) => item.csrf_header_present && item.marker_present
      && !item.authorization_header_present), true);
    result.journey.push('keyboard chat submission ignored a duplicate while busy; extraction matched a field, preserved the keyboard-edited name, and added the email on retry at mobile width');

    await replaceByKeyboard(page, patientName, '');
    await activateByKeyboard(page, page.getByRole('button', { name: 'Save filled form' }));
    assert.equal(await patientName.evaluate((field) => field.checkValidity()), false);
    assert.equal(await patientName.evaluate((field) => field === document.activeElement), true,
      'native required-field validation should return keyboard focus to the missing field');
    await replaceByKeyboard(page, patientName, 'Grace Hopper');
    result.journey.push('keyboard save hit native required-field validation and focus returned to the missing field');

    const mobileState = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      selectedTemplate: Boolean(document.querySelector('[data-voice-root]')),
      chatVisible: Boolean(document.querySelector('[data-voice-chat-form]')),
      reviewVisible: Boolean(document.querySelector('[data-voice-review-form]')),
    }));
    assert.equal(mobileState.overflow, false);
    assert.equal(mobileState.selectedTemplate && mobileState.chatVisible && mobileState.reviewVisible, true);
    await page.screenshot({ path: path.join(outputDir, 'voice-review-mobile.png'), fullPage: false });
    result.viewports.push({ viewport: '390x844', ...mobileState, keyboard_journey: 'chat retry, editable review, required validation, return and save' });
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
    await activateByKeyboard(page, page.getByRole('button', { name: 'Return to chat' }));
    const returnResponse = await returnResponsePromise;
    assert.equal(returnResponse.status(), 200, `Return to chat failed (${JSON.stringify({ csrfDiagnostics, returnRequestHeaders })}): ${await returnResponse.text()}`);
    await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('[data-chat-messages]').getByText('Keep my reviewed name and add my email.').count(), 1);
    assert.equal(await page.locator('[name="field_patient_name"]').inputValue(), 'Grace Hopper');
    assert.equal(await page.locator('[name="field_email"]').inputValue(), 'grace@example.invalid');
    result.journey.push('keyboard Return to chat preserved conversation and reviewed field values across Django form navigation');

    await activateByKeyboard(page, page.getByRole('button', { name: 'Reset chat', exact: true }));
    await page.locator('[data-chat-messages]')
      .getByText('Chat reset. Your current form draft is unchanged. Send a new message to continue.')
      .waitFor();
    assert.deepEqual(JSON.parse(await page.locator('[data-voice-chat-form] [name="conversation_json"]').inputValue()), []);
    assert.equal(await page.locator('[data-voice-message]').inputValue(), '');
    assert.equal(await page.locator('[name="field_patient_name"]').inputValue(), 'Grace Hopper');
    assert.equal(await page.locator('[name="field_email"]').inputValue(), 'grace@example.invalid');
    result.journey.push('keyboard Reset chat cleared the conversation and kept the reviewed form values');

    const saved = await Promise.all([
      page.waitForResponse((response) => response.url().includes('/filledtemplates') && response.status() === 200),
      activateByKeyboard(page, page.getByRole('button', { name: 'Save filled form' })),
    ]);
    assert.equal(saved[0].status(), 200);
    const savedCard = page.locator('article').filter({ hasText: 'Grace Hopper' });
    await savedCard.waitFor();
    assert.equal(await savedCard.getByText('Grace Hopper').count(), 1);
    await page.screenshot({ path: path.join(outputDir, 'filled-list-populated-mobile.png'), fullPage: false });
    result.journey.push('keyboard-saved reviewed values through the actual Django page and rendered the synthetic filled-list fixture');

    page.once('dialog', (dialog) => dialog.accept());
    await savedCard.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('status').filter({ hasText: 'Filled form deleted.' }).waitFor();
    assert.equal(await page.locator('article').filter({ hasText: 'Grace Hopper' }).count(), 0);
    result.journey.push('confirmed deletion updated the synthetic filled-list fixture');

    await page.goto(`${djangoBase}/AIVoiceAutoFill?template=${templateId}`, { waitUntil: 'networkidle' });
    await page.locator('[data-auto-speak]').uncheck();
    await submitMessageByKeyboard(page, page.locator('[data-voice-message]'), page.locator('[data-voice-chat-form] button[type="submit"]'), 'Discard this delayed answer.');
    await staleExtractionStarted;
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
    releaseStaleExtraction();
    await page.waitForTimeout(50);
    assert.equal(await page.locator('[data-chat-messages]').getByText('I kept your reviewed name.').count(), 0);
    assert.equal(await page.locator('[name="field_email"]').inputValue(), '');
    assert.equal(result.api.extraction.length, 3);
    result.journey.push('keyboard-submitted extraction was cancelled on pagehide without a stale answer or field update');

    await page.goto(`${djangoBase}/AIVoiceAutoFill?template=${templateId}`, { waitUntil: 'networkidle' });
    await page.locator('[data-auto-speak]').uncheck();
    await submitMessageByKeyboard(page, page.locator('[data-voice-message]'), page.locator('[data-voice-chat-form] button[type="submit"]'), 'Prepare a spoken response.');
    await page.getByRole('button', { name: 'Speak response' }).first().waitFor();
    const speak = page.getByRole('button', { name: 'Speak response' }).first();
    const firstTtsRequest = page.waitForRequest((request) => request.url().includes('/api/tts'));
    await activateByKeyboard(page, speak);
    await firstTtsRequest;
    await firstTtsReady;
    await page.waitForFunction(() => document.querySelector('[data-media-status]').textContent.includes('Preparing'));
    const secondTtsRequest = page.waitForRequest((request) => request.url().includes('/api/tts'));
    await activateByKeyboard(page, speak, 'Space');
    await secondTtsRequest;
    await secondTtsReady;
    if (releaseFirstTts) releaseFirstTts();
    if (releaseSecondTts) releaseSecondTts();
    await page.waitForTimeout(250);
    const firstSpeechState = await page.evaluate(() => ({
      audioCount: window.__p8Voice.audios.length,
      audioPaused: window.__p8Voice.audios.at(-1)?.paused ?? null,
      status: document.querySelector('[data-media-status]')?.textContent,
    }));
    assert.equal(firstSpeechState.audioCount, 1,
      `only the current TTS response should create audio: ${JSON.stringify(firstSpeechState)}`);
    assert.equal(firstSpeechState.status, 'Finished speaking the reply.',
      `the synthetic spoken reply should finish: ${JSON.stringify(firstSpeechState)}`);
    await page.waitForTimeout(50);
    assert.equal(await page.evaluate(() => window.__p8Voice.audios.length), 1);
    result.journey.push('keyboard Speak response replaced a pending TTS request; only the current response played');

    await activateByKeyboard(page, speak);
    await page.waitForFunction(() => window.__p8Voice.audios.length === 2);
    assert.equal(await page.evaluate(() => window.__p8Voice.audios[0].paused), true);
    assert.equal(await page.evaluate(() => window.__p8Voice.audios[0].src), '');
    await page.evaluate(() => { window.__p8Voice.rejectNextPlay = true; });
    await activateByKeyboard(page, speak, 'Space');
    await page.waitForFunction(() => document.querySelector('[data-media-status]').textContent
      .includes('The reply is ready. Select Speak response to play it.'));
    assert.equal(await page.evaluate(() => window.__p8Voice.audios[2].paused), true);
    result.journey.push('keyboard Speak response paused and released prior audio; rejected playback stayed visible');

    await activateByKeyboard(page, speak);
    await page.waitForFunction(() => document.querySelector('[data-media-status]').textContent.includes('Speech playback is unavailable'));
    assert.equal(await page.evaluate(() => window.__p8Voice.audios.length), 3);
    result.journey.push('keyboard Speak response rejected invalid TTS data without creating audio');

    await speak.click();
    await page.waitForTimeout(50);
    assert.equal(ttsCount, 6);
    await lastTtsReady;
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
    if (releaseLastTts) releaseLastTts();
    await page.waitForFunction(() => window.__p8Voice.audios[2].paused === true);
    await page.waitForTimeout(50);
    assert.equal(await page.evaluate(() => window.__p8Voice.audios.length), 3);
    result.journey.push('pagehide cancelled keyboard-started TTS and prevented a stale audio response');

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
