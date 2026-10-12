const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..', '..', '..');
const mediaScript = path.join(__dirname, '..', 'static', 'js', 'p7_media.js');
const outputDir = process.env.P8_EVIDENCE_DIR
  ? path.resolve(process.env.P8_EVIDENCE_DIR)
  : path.join(root, 'docs', 'services', 'evidence', 'p8', 'closeout-20261012');
const djangoBase = process.env.P7_DJANGO_BASE_URL || 'http://127.0.0.1:8875';
const evidence = {
  captured_at: new Date().toISOString(),
  source: 'Playwright Chromium with deterministic fake MediaDevices/MediaRecorder and mocked same-origin API responses',
  django_test_origin: djangoBase,
  browser: null,
  checks: [],
  transport: {},
  resources: {},
};

const markup = `
  <main data-voice-root data-api-marker="fixture-marker" data-max-audio-bytes="4">
    <form data-voice-chat-form>
      <input type="hidden" name="csrfmiddlewaretoken" value="fixture-csrf">
      <textarea data-voice-message></textarea>
      <button type="button" data-record-start>Record</button>
      <button type="button" data-record-stop disabled>Stop</button>
      <button type="button" data-record-transcribe disabled>Transcribe recording</button>
      <button type="button" data-record-reset>Reset recording</button>
      <audio controls data-audio-preview hidden></audio>
      <p data-media-status role="status" aria-live="polite"></p>
    </form>
  </main>`;

async function setupPage(browser, options = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${djangoBase}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('body').evaluate((body, html) => { body.innerHTML = html; }, markup);
  await page.evaluate((config) => {
    const fixture = {
      mode: config.mode || 'granted',
      supported: config.supported !== false,
      bytes: config.bytes === undefined ? 12 : config.bytes,
      stoppedTracks: 0,
      getUserMediaCalls: 0,
      createdUrls: [],
      revokedUrls: [],
      recorders: [],
      playCalls: 0,
      mediaResolvers: [],
      streams: [],
    };
    window.__p8 = fixture;

    const makeStream = () => {
      const stream = {
        tracks: [{ stopped: false, stop() { this.stopped = true; fixture.stoppedTracks += 1; } }],
        getTracks() { return this.tracks; },
      };
      fixture.streams.push(stream);
      return stream;
    };
    fixture.makeStream = makeStream;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: config.noMediaDevices ? undefined : {
        getUserMedia: () => {
          fixture.getUserMediaCalls += 1;
          if (fixture.mode === 'denied') {
            const error = new DOMException('permission denied', 'NotAllowedError');
            return Promise.reject(error);
          }
          if (fixture.mode === 'missing') {
            const error = new DOMException('device unavailable', 'NotFoundError');
            return Promise.reject(error);
          }
          if (fixture.mode === 'pending') {
            return new Promise((resolve) => { fixture.mediaResolvers.push(resolve); });
          }
          return Promise.resolve(makeStream());
        },
      },
    });

    if (config.noRecorder) {
      Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: undefined });
    } else {
      window.MediaRecorder = class FixtureRecorder extends EventTarget {
        static isTypeSupported(type) {
          return fixture.supported && type === 'audio/webm;codecs=opus';
        }
        constructor(stream, settings) {
          super();
          this.stream = stream;
          this.mimeType = settings.mimeType;
          this.state = 'inactive';
          fixture.recorders.push(this);
        }
        start() { this.state = 'recording'; }
        emitData(size = fixture.bytes) {
          const data = new Blob([new Uint8Array(size)], { type: this.mimeType });
          this.dispatchEvent(Object.assign(new Event('dataavailable'), { data }));
        }
        stop() {
          if (this.state === 'inactive') return;
          this.state = 'inactive';
          this.emitData();
          const finish = () => this.dispatchEvent(new Event('stop'));
          if (config.deferStop) fixture.pendingStop = finish;
          else queueMicrotask(finish);
        }
        emitError() { this.dispatchEvent(Object.assign(new Event('error'), { error: new Error('Synthetic recorder failure') })); }
      };
    }

    let nextUrl = 0;
    URL.createObjectURL = (blob) => {
      const url = `blob:fixture-${++nextUrl}`;
      fixture.createdUrls.push({ url, type: blob.type, size: blob.size });
      return url;
    };
    URL.revokeObjectURL = (url) => { fixture.revokedUrls.push(url); };
    HTMLMediaElement.prototype.play = function playFixture() {
      fixture.playCalls += 1;
      return Promise.resolve();
    };
  }, options);
  await page.addScriptTag({ path: mediaScript });
  return page;
}

async function status(page) {
  return page.locator('[data-media-status]').textContent();
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  evidence.browser = browser.version();
  try {
    let page = await setupPage(browser, { noMediaDevices: true, noRecorder: true });
    await page.getByRole('button', { name: 'Record', exact: true }).click();
    assert.match(await status(page), /not supported in this browser/i);
    evidence.checks.push('unsupported browser exposes typed-input fallback');
    await page.close();

    page = await setupPage(browser, { supported: false });
    await page.getByRole('button', { name: 'Record', exact: true }).click();
    assert.match(await status(page), /no supported recording format/i);
    assert.equal(await page.evaluate(() => window.__p8.getUserMediaCalls), 0);
    evidence.checks.push('unsupported codecs are rejected before microphone access');
    await page.close();

    for (const [mode, message] of [
      ['denied', /permission was denied/i],
      ['missing', /no microphone is available/i],
    ]) {
      page = await setupPage(browser, { mode });
      await page.getByRole('button', { name: 'Record', exact: true }).click();
      await page.locator('[data-media-status]').filter({ hasText: message }).waitFor();
      assert.equal(await page.evaluate(() => window.__p8.stoppedTracks), 0);
      evidence.checks.push(`${mode} microphone path exposes an accessible fallback`);
      await page.close();
    }

    page = await setupPage(browser, { bytes: 0 });
    let emptyUploads = 0;
    await page.route('**/api/transcribe', async (route) => {
      emptyUploads += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"transcript":"stale"}' });
    });
    await page.getByRole('button', { name: 'Record', exact: true }).click();
    await page.getByRole('button', { name: 'Stop' }).click();
    await page.locator('[data-media-status]').filter({ hasText: /recording was empty/i }).waitFor();
    assert.equal(await page.evaluate(() => window.__p8.stoppedTracks), 1);
    assert.equal(await page.getByRole('button', { name: 'Transcribe recording' }).isDisabled(), true);
    assert.equal(await page.getByRole('button', { name: 'Stop' }).isDisabled(), true);
    assert.equal(await page.getByRole('button', { name: 'Record', exact: true }).isDisabled(), false);
    assert.equal(emptyUploads, 0);
    evidence.checks.push('empty recording is rejected and microphone tracks stop');
    await page.close();

    page = await setupPage(browser, { mode: 'pending' });
    await page.getByRole('button', { name: 'Record', exact: true }).click();
    await page.evaluate(() => document.querySelector('[data-record-start]').click());
    assert.equal(await page.evaluate(() => window.__p8.getUserMediaCalls), 1);
    assert.equal(await page.getByRole('button', { name: 'Record', exact: true }).isDisabled(), true);
    await page.close();

    page = await setupPage(browser, { bytes: 4, deferStop: true });
    await page.getByRole('button', { name: 'Record', exact: true }).click();
    await page.getByRole('button', { name: 'Stop' }).click();
    await page.getByRole('button', { name: 'Reset recording' }).click();
    await page.getByRole('button', { name: 'Record', exact: true }).click();
    await page.evaluate(() => window.__p8.recorders[0].emitData(99));
    await page.evaluate(() => window.__p8.pendingStop());
    assert.equal(await page.evaluate(() => window.__p8.streams[1].tracks[0].stopped), false);
    assert.equal(await page.evaluate(() => window.__p8.recorders[1].state), 'recording');
    await page.getByRole('button', { name: 'Stop' }).click();
    await page.evaluate(() => window.__p8.pendingStop());
    await page.locator('[data-media-status]').filter({ hasText: /recording ready/i }).waitFor();
    assert.equal(await page.evaluate(() => window.__p8.createdUrls.at(-1).size), 4);
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    assert.equal(await page.evaluate(() => window.__p8.streams[1].tracks[0].stopped), true);
    evidence.checks.push('delayed data and stop events from a discarded recorder cannot mutate the newer attempt');
    await page.close();

    page = await setupPage(browser, { mode: 'pending' });
    await page.getByRole('button', { name: 'Record', exact: true }).click();
    await page.waitForFunction(() => window.__p8.mediaResolvers.length === 1);
    await page.getByRole('button', { name: 'Reset recording' }).click();
    await page.getByRole('button', { name: 'Record', exact: true }).click();
    await page.waitForFunction(() => window.__p8.mediaResolvers.length === 2);
    await page.evaluate(() => window.__p8.mediaResolvers[1](window.__p8.makeStream()));
    await page.waitForFunction(() => window.__p8.recorders.length === 1);
    await page.evaluate(() => window.__p8.mediaResolvers[0](window.__p8.makeStream()));
    await page.waitForFunction(() => window.__p8.stoppedTracks === 1);
    assert.equal(await page.evaluate(() => window.__p8.recorders[0].stream.getTracks()[0].stopped), false);
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    assert.equal(await page.evaluate(() => window.__p8.recorders[0].stream.getTracks()[0].stopped), true);
    evidence.checks.push('out-of-order permission results dispose only their own streams');
    await page.close();

    page = await setupPage(browser, { bytes: 4 });
    let failedCaptureUploads = 0;
    await page.route('**/api/transcribe', async (route) => {
      failedCaptureUploads += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"transcript":"stale"}' });
    });
    await page.getByRole('button', { name: 'Record', exact: true }).click();
    await page.evaluate(() => window.__p8.recorders[0].emitError());
    await page.locator('[data-media-status]').filter({ hasText: /recording failed/i }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Stop' }).isDisabled(), true);
    assert.equal(await page.getByRole('button', { name: 'Record', exact: true }).isDisabled(), false);
    assert.equal(await page.getByRole('button', { name: 'Transcribe recording' }).isDisabled(), true);
    assert.equal(await page.evaluate(() => window.__p8.streams[0].tracks[0].stopped), true);
    assert.equal(failedCaptureUploads, 0);
    await page.getByRole('button', { name: 'Record', exact: true }).click();
    await page.getByRole('button', { name: 'Stop' }).click();
    await page.locator('[data-media-status]').filter({ hasText: /recording ready/i }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Transcribe recording' }).isDisabled(), false);
    assert.equal(failedCaptureUploads, 0);
    evidence.checks.push('asynchronous recorder error cleans its attempt, restores controls, and permits a clean retry');
    await page.close();

    page = await setupPage(browser, { bytes: 12 });
    let oversizedUploads = 0;
    await page.route('**/api/transcribe', async (route) => {
      oversizedUploads += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"transcript":"stale"}' });
    });
    await page.getByRole('button', { name: 'Record', exact: true }).click();
    await page.getByRole('button', { name: 'Stop' }).click();
    await page.locator('[data-media-status]').filter({ hasText: /recording is too large/i }).waitFor();
    assert.equal(await page.evaluate(() => window.__p8.stoppedTracks), 1);
    assert.equal(await page.getByRole('button', { name: 'Stop' }).isDisabled(), true);
    assert.equal(await page.getByRole('button', { name: 'Record', exact: true }).isDisabled(), false);
    assert.equal(await page.getByRole('button', { name: 'Transcribe recording' }).isDisabled(), true);
    assert.equal(oversizedUploads, 0);
    evidence.checks.push('oversized recording is rejected before multipart submission');
    await page.close();

    page = await setupPage(browser, { bytes: 4 });
    let transportRequest = null;
    await page.route('**/api/transcribe', async (route) => {
      const request = route.request();
      transportRequest = {
        method: request.method(),
        headers: await request.allHeaders(),
        body: request.postData() || '',
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ transcript: 'Synthetic transcript' }),
      });
    });
    await page.getByRole('button', { name: 'Record', exact: true }).click();
    await page.getByRole('button', { name: 'Stop' }).click();
    await page.getByRole('button', { name: 'Transcribe recording' }).click();
    await page.locator('[data-voice-message]').waitFor();
    await page.waitForFunction(() => document.querySelector('[data-voice-message]').value === 'Synthetic transcript');
    assert.ok(transportRequest);
    assert.equal(transportRequest.method, 'POST');
    assert.match(transportRequest.headers['content-type'], /^multipart\/form-data; boundary=/i);
    assert.equal(transportRequest.headers['x-csrftoken'], 'fixture-csrf');
    assert.equal(transportRequest.headers['x-internal-api-token'], 'fixture-marker');
    assert.equal(transportRequest.headers.authorization, undefined);
    assert.match(transportRequest.body, /name="audio"; filename="recording\.webm"/);
    assert.match(transportRequest.body, /name="mimeType"\r\n\r\naudio\/webm;codecs=opus/);
    assert.equal(await page.locator('[data-audio-preview]').isVisible(), true);
    assert.match(await page.locator('[data-audio-preview]').getAttribute('src'), /^blob:fixture-/);
    await page.locator('[data-audio-preview]').evaluate((audio) => audio.play());
    assert.equal(await page.evaluate(() => window.__p8.playCalls), 1);
    await page.screenshot({ path: path.join(outputDir, 'recording-preview-and-transcript.png'), fullPage: true });
    evidence.transport = {
      method: transportRequest.method,
      content_type: 'multipart/form-data with boundary',
      audio_filename: 'recording.webm',
      mime_type: 'audio/webm;codecs=opus',
      csrf_header_present: true,
      request_marker_present: true,
      authorization_header_present: false,
      transcript_inserted_for_review: true,
      preview_audio_control_present: true,
      preview_play_action_exercised: true,
    };
    evidence.checks.push('supported codec creates a preview and same-origin multipart transcript request');
    await page.close();

    page = await setupPage(browser, { bytes: 4 });
    await page.evaluate(() => {
      window.__p8.pendingTranscript = null;
      window.__p8.transcriptParsed = false;
      window.fetch = () => new Promise((resolve) => {
        window.__p8.pendingTranscript = () => resolve({
          ok: true,
          json: async () => {
            window.__p8.transcriptParsed = true;
            return { transcript: 'Stale transcript must not be inserted.' };
          },
        });
      });
    });
    await page.getByRole('button', { name: 'Record', exact: true }).click();
    await page.getByRole('button', { name: 'Stop' }).click();
    await page.getByRole('button', { name: 'Transcribe recording' }).click();
    await page.waitForFunction(() => typeof window.__p8.pendingTranscript === 'function');
    await page.getByRole('button', { name: 'Reset recording' }).click();
    await page.locator('[data-voice-message]').fill('Keep this draft.');
    await page.evaluate(() => window.__p8.pendingTranscript());
    await page.waitForFunction(() => window.__p8.transcriptParsed);
    assert.equal(await page.locator('[data-voice-message]').inputValue(), 'Keep this draft.');
    assert.equal(await status(page), 'Recording reset. Ready to record again.');
    assert.equal(await page.getByRole('button', { name: 'Transcribe recording' }).isDisabled(), true);
    evidence.checks.push('late transcription response after reset cannot insert text or report stale success');
    await page.close();

    page = await setupPage(browser, { bytes: 4 });
    await page.getByRole('button', { name: 'Record', exact: true }).click();
    await page.getByRole('button', { name: 'Stop' }).click();
    await page.locator('[data-media-status]').filter({ hasText: /recording ready/i }).waitFor();
    const firstUrl = await page.locator('[data-audio-preview]').getAttribute('src');
    await page.getByRole('button', { name: 'Reset recording' }).click();
    assert.equal(await page.locator('[data-audio-preview]').isHidden(), true);
    assert.equal(await page.getByRole('button', { name: 'Transcribe recording' }).isDisabled(), true);
    assert.deepEqual(await page.evaluate(() => window.__p8.revokedUrls), [firstUrl]);
    assert.equal(await page.evaluate(() => window.__p8.stoppedTracks), 1);
    evidence.checks.push('reset clears recording state, stops tracks and revokes its blob URL');
    await page.close();

    page = await setupPage(browser, { bytes: 4 });
    await page.getByRole('button', { name: 'Record', exact: true }).click();
    await page.getByRole('button', { name: 'Stop' }).click();
    await page.locator('[data-media-status]').filter({ hasText: /recording ready/i }).waitFor();
    await page.getByRole('button', { name: 'Record', exact: true }).click();
    assert.equal(await page.evaluate(() => window.__p8.revokedUrls.length), 1);
    assert.equal(await page.evaluate(() => window.__p8.stoppedTracks), 1);
    await page.getByRole('button', { name: 'Stop' }).click();
    await page.locator('[data-media-status]').filter({ hasText: /recording ready/i }).waitFor();
    const secondUrl = await page.locator('[data-audio-preview]').getAttribute('src');
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    assert.equal(await page.evaluate(() => window.__p8.stoppedTracks), 2);
    assert.deepEqual(await page.evaluate(() => window.__p8.revokedUrls), [
      await page.evaluate(() => window.__p8.createdUrls[0].url),
      secondUrl,
    ]);
    evidence.resources = {
      tracks_stopped_across_replacement_and_navigation: 2,
      replaced_preview_revoked: true,
      active_preview_revoked_on_navigation: true,
      recorder_state_after_navigation: await page.evaluate(() => window.__p8.recorders.at(-1).state),
    };
    assert.equal(evidence.resources.recorder_state_after_navigation, 'inactive');
    evidence.checks.push('replacement and pagehide release active tracks, recorder and object URLs');
    await page.close();

    page = await setupPage(browser, { bytes: 4 });
    await page.getByRole('button', { name: 'Record', exact: true }).click();
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await page.waitForFunction(() => window.__p8.stoppedTracks === 1);
    assert.equal(await page.evaluate(() => window.__p8.recorders[0].state), 'inactive');
    evidence.resources.navigation_during_capture_stops_live_track = true;
    evidence.checks.push('navigation during active capture stops the live microphone track');
    await page.close();

    page = await setupPage(browser, { mode: 'pending' });
    await page.getByRole('button', { name: 'Record', exact: true }).click();
    await page.waitForFunction(() => window.__p8.mediaResolvers.length === 1);
    await page.getByRole('button', { name: 'Reset recording' }).click();
    await page.evaluate(() => window.__p8.mediaResolvers[0]({
      getTracks: () => [{ stop: () => { window.__p8.stoppedTracks += 1; } }],
    }));
    await page.waitForFunction(() => window.__p8.stoppedTracks === 1);
    assert.equal(await page.evaluate(() => window.__p8.recorders.length), 0);
    evidence.checks.push('late microphone permission result is stopped after reset and cannot start stale recording');
    await page.close();

    page = await setupPage(browser, { bytes: 4 });
    await page.route('**/api/transcribe', (route) => route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Synthetic provider unavailable' }),
    }));
    await page.getByRole('button', { name: 'Record', exact: true }).click();
    await page.getByRole('button', { name: 'Stop' }).click();
    await page.getByRole('button', { name: 'Transcribe recording' }).click();
    await page.locator('[data-media-status]').filter({ hasText: /synthetic provider unavailable/i }).waitFor();
    evidence.checks.push('provider failure remains visible and does not report transcription success');
    await page.screenshot({ path: path.join(outputDir, 'transcription-provider-error.png'), fullPage: true });
    await page.close();
  } finally {
    await browser.close();
  }

  await fs.writeFile(path.join(outputDir, 'media-results.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({ checks: evidence.checks.length, output: outputDir }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
