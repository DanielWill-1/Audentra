const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.P7_DJANGO_BASE_URL || 'http://127.0.0.1:18875';
const requestedEvidenceDirectory = process.env.P9_DEVICE_EVIDENCE_DIR
  ? path.resolve(process.env.P9_DEVICE_EVIDENCE_DIR)
  : '';
const evidenceDirectory = requestedEvidenceDirectory && fs.existsSync(requestedEvidenceDirectory)
  ? (() => {
    let attempt = 2;
    let candidate = path.join(requestedEvidenceDirectory, `attempt-${String(attempt).padStart(2, '0')}`);
    while (fs.existsSync(candidate)) {
      attempt += 1;
      candidate = path.join(requestedEvidenceDirectory, `attempt-${String(attempt).padStart(2, '0')}`);
    }
    return candidate;
  })()
  : requestedEvidenceDirectory;
const resultPath = evidenceDirectory ? path.join(evidenceDirectory, 'P9_DESKTOP_MIC_RESULTS.json') : '';

function inspectMultipart(request) {
  const contentType = request.headers()['content-type'] || '';
  const boundary = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType)?.slice(1).find(Boolean)?.trim();
  if (!boundary) throw new Error('Transcription request did not include a multipart boundary.');
  const body = request.postDataBuffer();
  if (!body) throw new Error('Transcription request did not include a multipart body.');
  const parts = body.toString('latin1').split(`--${boundary}`).map((part) => {
    const divider = part.indexOf('\r\n\r\n');
    if (divider < 0) return null;
    const headers = part.slice(0, divider);
    let value = part.slice(divider + 4);
    if (value.endsWith('\r\n')) value = value.slice(0, -2);
    return {
      name: /name="([^"]+)"/i.exec(headers)?.[1] || null,
      filename: /filename="([^"]+)"/i.exec(headers)?.[1] || null,
      content_type: /content-type:\s*([^\r\n]+)/i.exec(headers)?.[1] || null,
      bytes: Buffer.byteLength(value, 'latin1'),
      value,
    };
  }).filter(Boolean);
  const audio = parts.find((part) => part.name === 'audio');
  const mime = parts.find((part) => part.name === 'mimeType');
  if (!audio || !mime) throw new Error('Transcription multipart body is missing audio or mimeType.');
  return {
    request_content_type: contentType.split(';')[0],
    filename: audio.filename,
    file_content_type: audio.content_type,
    file_bytes: audio.bytes,
    mime_type_field: mime.value,
  };
}

async function main() {
  if (!requestedEvidenceDirectory) throw new Error('Set P9_DEVICE_EVIDENCE_DIR to a P9 evidence directory.');
  if (fs.existsSync(evidenceDirectory)) throw new Error(`Refusing to overwrite evidence: ${evidenceDirectory}`);
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  if (fs.existsSync(resultPath)) throw new Error(`Refusing to overwrite evidence: ${resultPath}`);

  const writeResult = async (result) => {
    await fs.promises.writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, {
      encoding: 'utf8',
      flag: fs.existsSync(resultPath) ? 'w' : 'wx',
    });
  };
  const evidenceParts = path.resolve(evidenceDirectory).split(path.sep);
  const p9Index = evidenceParts.lastIndexOf('p9');
  const runId = p9Index >= 0 ? evidenceParts[p9Index + 1] : 'unknown';

  const browser = await chromium.launch({
    headless: false,
    ignoreDefaultArgs: ['--disable-back-forward-cache'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ['microphone'],
    reducedMotion: 'reduce',
    extraHTTPHeaders: { 'X-P7-Fixture-Reset': '1', 'X-P7-Auth-Flow': '1' },
  });
  await context.grantPermissions(['microphone'], { origin: baseUrl });
  await context.addInitScript(() => {
    const stored = sessionStorage.getItem('p9-mic-lifecycle');
    const prior = stored ? JSON.parse(stored) : {};
    window.__p9Mic = { streams: [], recordings: prior.recordings || [], lifecycle: prior.lifecycle || [] };
    const saveLifecycle = (event, persisted) => {
      queueMicrotask(() => {
        const entry = {
          event,
          persisted,
          track_states: window.__p9Mic.streams.flatMap(({ stream }) =>
            stream.getTracks().map((track) => track.readyState)),
          stream_stop_calls: window.__p9Mic.streams.map(({ record }) => record.track_stop_calls),
          recorder_button_enabled: document.querySelector('[data-record-start]')
            ? !document.querySelector('[data-record-start]').disabled
            : null,
        };
        window.__p9Mic.lifecycle.push(entry);
        sessionStorage.setItem('p9-mic-lifecycle', JSON.stringify({
          recordings: window.__p9Mic.recordings,
          lifecycle: window.__p9Mic.lifecycle,
        }));
      });
    };
    window.addEventListener('pageshow', (event) => saveLifecycle('pageshow', event.persisted));
    window.__p9InstallLifecycleObserver = () => {
      if (window.__p9Mic.lifecycleObserverInstalled) return;
      window.__p9Mic.lifecycleObserverInstalled = true;
      window.addEventListener('pagehide', (event) => saveLifecycle('pagehide', event.persisted));
    };
    const nativeGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (...args) => {
      const stream = await nativeGetUserMedia(...args);
      const tracks = stream.getTracks();
      const record = {
        tracks: tracks.map((track) => ({ kind: track.kind, label: '' })),
        track_stop_calls: 0,
      };
      for (const track of tracks) {
        const nativeStop = track.stop.bind(track);
        track.stop = () => {
          record.track_stop_calls += 1;
          return nativeStop();
        };
      }
      window.__p9Mic.streams.push({ stream, record });
      return stream;
    };
    const NativeMediaRecorder = window.MediaRecorder;
    if (NativeMediaRecorder) {
      window.MediaRecorder = class P9ObservedMediaRecorder extends NativeMediaRecorder {
        constructor(...args) {
          super(...args);
          const record = { mime_type: this.mimeType, chunk_bytes: [], state_at_create: this.state };
          window.__p9Mic.recordings.push(record);
          this.addEventListener('dataavailable', (event) => {
            if (event.data?.size) record.chunk_bytes.push(event.data.size);
          });
          this.addEventListener('stop', () => { record.state_after_stop = this.state; }, { once: true });
        }
      };
    }
  });

  const page = await context.newPage();
  const providerRequests = [];
  const localApiRequests = [];
  const transcriptionRequests = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname === '/api/transcribe') {
      localApiRequests.push({ method: request.method(), path: url.pathname });
    } else if (url.pathname.startsWith('/api/')) {
      providerRequests.push({ method: request.method(), path: url.pathname });
    }
  });
  await page.route('**/api/transcribe', async (route) => {
    try {
      transcriptionRequests.push(inspectMultipart(route.request()));
    } catch (error) {
      result.transcription_capture_error = error instanceof Error ? error.message : String(error);
    }
    await route.continue();
  });
  let result = {
    run_id: runId,
    captured_at: new Date().toISOString(),
    device_scope: 'desktop microphone only',
    boundary: 'Real browser microphone and MediaRecorder; successful audio is sent only to the isolated localhost Django mock transcription endpoint. No audio is saved and no external provider is called.',
    os: { platform: os.platform(), release: os.release(), arch: os.arch() },
    browser: { name: 'Chromium', version: browser.version() },
    origin: baseUrl,
    secure_context: null,
    session_scope: 'P7 local auth-flow fixture creates a synthetic session and authenticates the local API request; no hosted Auth request',
    permission: 'programmatically granted to the local origin; no permission prompt was clicked',
    microphone_inputs: null,
    device_class: 'desktop; microphone model and label intentionally omitted',
    recordings: [],
    local_intercepted_requests: localApiRequests,
    transcription_contract: null,
    preview_play_started: false,
    track_states_after_reset: [],
    navigation: null,
    provider_requests: providerRequests,
    status: 'running',
  };
  await writeResult(result);
  process.stdout.write('P9 desktop mic check opened local voice page.\n');

  try {
    await page.goto(`${baseUrl}/login/?p7_auth_flow=1&next=%2Fdashboard`, { waitUntil: 'domcontentloaded' });
    await page.locator('#id_email').fill('p9-desktop-mic@example.invalid');
    await page.locator('#id_password').fill('synthetic-passphrase');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/dashboard\/?$/);
    await page.getByRole('heading', { name: 'What would you like to work on?' }).waitFor();

    const response = await page.goto(`${baseUrl}/AIVoiceAutoFill`, { waitUntil: 'domcontentloaded' });
    assert.equal(response?.status(), 200);
    await page.getByRole('heading', { name: 'Choose a Form Template' }).waitFor();
    await page.getByRole('link', { name: 'Use template' }).first().click();
    await page.getByRole('heading', { name: 'Review form fields' }).waitFor();
    await page.locator('[data-record-start]').waitFor();
    await page.evaluate(() => window.__p9InstallLifecycleObserver());
    result = {
      ...result,
      secure_context: await page.evaluate(() => window.isSecureContext),
      microphone_inputs: await page.evaluate(async () => {
        const permission = await navigator.permissions.query({ name: 'microphone' });
        const devices = await navigator.mediaDevices.enumerateDevices();
        return {
          permission_state: permission.state,
          audioinput_count: devices.filter((device) => device.kind === 'audioinput').length,
          get_user_media: typeof navigator.mediaDevices.getUserMedia === 'function',
          media_recorder: typeof window.MediaRecorder === 'function',
          supported_mime_types: ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus']
            .filter((mime) => window.MediaRecorder?.isTypeSupported(mime)),
        };
      }),
    };
    await writeResult(result);
    process.stdout.write('P9 desktop mic check recorded local browser capability.\n');

    const start = page.locator('[data-record-start]');
    const stop = page.locator('[data-record-stop]');
    const status = page.locator('[data-media-status]');
    const preview = page.locator('[data-audio-preview]');
    for (let index = 0; index < 2; index += 1) {
      await start.click();
      try {
        await page.waitForFunction(() =>
          document.querySelector('[data-media-status]')?.textContent?.trim() === 'Recording. Select Stop when you are done.',
        { timeout: 8000 });
      } catch {
        // The real device can be unavailable or the OS may deny access.
      }
      const startedText = await status.innerText();
      if (startedText !== 'Recording. Select Stop when you are done.') {
        result.status = 'blocked';
        result.block_reason = startedText || 'The microphone did not start.';
        await writeResult(result);
        break;
      }
      await page.waitForTimeout(index === 0 ? 1800 : 1200);
      await stop.click();
      await status.getByText('Recording ready. Preview it or transcribe it into the message field.').waitFor({ timeout: 5000 });
      const observed = await page.evaluate((recordingIndex) => {
        const capture = window.__p9Mic.recordings[recordingIndex];
        const stream = window.__p9Mic.streams[recordingIndex];
        return {
          mime_type: capture?.mime_type || null,
          chunk_bytes: capture?.chunk_bytes || [],
          stream_track_states: stream?.stream.getTracks().map((track) => track.readyState) || [],
          track_stop_calls: stream?.record.track_stop_calls ?? null,
        };
      }, index);
      const metadata = { attempt: index + 1, ...observed };
      result.recordings.push(metadata);
      assert.ok(metadata.mime_type, `attempt ${index + 1} must report its recorder MIME type`);
      assert.ok(metadata.chunk_bytes.reduce((total, size) => total + size, 0) > 0,
        `attempt ${index + 1} must produce a nonempty microphone recording`);
      assert.ok(metadata.stream_track_states.every((state) => state === 'ended'),
        `attempt ${index + 1} must release microphone tracks after Stop`);
      await writeResult(result);
      process.stdout.write(`P9 desktop mic check completed recording attempt ${index + 1}.\n`);
      if (index === 0) {
        await page.screenshot({ path: path.join(evidenceDirectory, 'desktop-mic-preview.png'), fullPage: false });
        try {
          await page.evaluate(async () => {
            const audio = document.querySelector('[data-audio-preview]');
            audio.currentTime = 0;
            await audio.play();
            await new Promise((resolve) => setTimeout(resolve, 250));
            audio.pause();
          });
          result.preview_play_started = true;
        } catch (error) {
          result.preview_play_error = error instanceof Error ? error.name : String(error);
        }
        await page.locator('[data-record-reset]').click();
        await status.getByText('Recording reset. Ready to record again.').waitFor();
        result.track_states_after_reset = await page.evaluate(() =>
          window.__p9Mic.streams.flatMap(({ stream }) => stream.getTracks().map((track) => track.readyState)));
        assert.equal(await preview.isHidden(), true);
        await writeResult(result);
      }
    }

    if (result.status !== 'blocked') {
      const transcriptionResponse = page.waitForResponse((response) => {
        const request = response.request();
        return new URL(response.url()).pathname === '/api/transcribe' && request.method() === 'POST';
      });
      await page.locator('[data-record-transcribe]').click();
      const response = await transcriptionResponse;
      assert.equal(response.status(), 200, 'local mock transcription endpoint should accept the real recording');
      const transcriptPayload = await response.json();
      assert.equal(transcriptionRequests.length, 1);
      const multipart = transcriptionRequests[0];
      assert.equal(multipart.request_content_type, 'multipart/form-data');
      assert.equal(multipart.filename, 'recording.webm');
      assert.equal(multipart.file_content_type, 'audio/webm;codecs=opus');
      assert.equal(multipart.mime_type_field, 'audio/webm;codecs=opus');
      assert.ok(multipart.file_bytes > 0);
      assert.equal(typeof transcriptPayload.transcript, 'string');
      assert.ok(transcriptPayload.transcript.length > 0);
      await status.getByText('Transcript added to the message field. Review it before sending.').waitFor();
      result.transcription_contract = {
        ...multipart,
        local_mock_transcript: transcriptPayload.transcript,
        transcript_added_to_message: await page.locator('[data-voice-message]').inputValue(),
        request_reached_local_django: true,
        external_provider_request_sent: false,
        audio_saved: false,
      };
      assert.equal(result.transcription_contract.transcript_added_to_message, transcriptPayload.transcript);
      assert.equal(providerRequests.length, 0, 'real audio must not be sent to an external speech provider');
      await writeResult(result);

      await start.click();
      await status.getByText('Recording. Select Stop when you are done.').waitFor({ timeout: 8000 });
      await page.waitForTimeout(500);
      const beforeNavigation = await page.evaluate(() => ({
        tracks: window.__p9Mic.streams.flatMap(({ stream }) => stream.getTracks().map((track) => track.readyState)),
      }));
      assert.ok(beforeNavigation.tracks.some((state) => state === 'live'));
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: 'What would you like to work on?' }).waitFor();
      const backResponse = await page.goBack({ waitUntil: 'domcontentloaded' });
      assert.ok(backResponse, 'back navigation should restore the selected voice route');
      await page.locator('[data-record-start]').waitFor();
      result.navigation = await page.evaluate(() => ({
        lifecycle: window.__p9Mic.lifecycle.slice(-3),
        pageshow_persisted: window.__p9Mic.lifecycle.filter((entry) => entry.event === 'pageshow').at(-1)?.persisted ?? null,
        start_enabled: !document.querySelector('[data-record-start]').disabled,
        track_states: window.__p9Mic.streams.flatMap(({ stream }) => stream.getTracks().map((track) => track.readyState))
          .concat(window.__p9Mic.lifecycle.filter((entry) => entry.event === 'pagehide' && entry.track_states.length)
            .at(-1)?.track_states || []),
      }));
      assert.ok(result.navigation.track_states.every((state) => state === 'ended'),
        'leaving the voice route must release the active microphone stream');
      assert.equal(result.navigation.start_enabled, true,
        'the recorder must remain usable after back navigation restores the voice route');
      await writeResult(result);
      await page.screenshot({ path: path.join(evidenceDirectory, 'desktop-mic-back-forward.png'), fullPage: false });
      result.status = 'passed';
      await writeResult(result);
      process.stdout.write('P9 desktop mic check completed back-forward restoration.\n');
    }
  } catch (error) {
    result.status = result.status === 'blocked' ? 'blocked' : 'failed';
    result.error = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  } finally {
    result.provider_requests = providerRequests;
    result.no_provider_or_transcription_request = providerRequests.length === 0 && localApiRequests.length === 0;
    result.no_provider_request_sent = providerRequests.length === 0;
    result.local_mock_transcription_request_sent = localApiRequests.some((request) => request.path === '/api/transcribe');
    try {
      await writeResult(result);
    } finally {
      await context.close().catch(() => {});
      await browser.close().catch(() => {});
    }
  }
  process.stdout.write(`${JSON.stringify({ status: result.status, evidence: resultPath, reason: result.block_reason || result.error || null })}\n`);
  if (result.status === 'failed') process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
