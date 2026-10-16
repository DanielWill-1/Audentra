(() => {
  "use strict";

  const root = document.querySelector("[data-voice-root]");
  const form = document.querySelector("[data-voice-chat-form]");
  if (!root || !form) return;
  const startButton = form.querySelector("[data-record-start]");
  const stopButton = form.querySelector("[data-record-stop]");
  const transcribeButton = form.querySelector("[data-record-transcribe]");
  const resetButton = form.querySelector("[data-record-reset]");
  const preview = form.querySelector("[data-audio-preview]");
  const message = form.querySelector("[data-voice-message]");
  const sendButton = form.querySelector('button[type="submit"]');
  const status = form.querySelector("[data-media-status]");
  const csrf = form.querySelector('[name="csrfmiddlewaretoken"]')?.value || "";
  const consentVersion = root.dataset.cloudAiConsentVersion || "";
  const consentKey = "audentra.cloudAiConsent";
  const maxBytes = Number(root.dataset.maxAudioBytes || 0);
  let attemptSequence = 0;
  let activeAttempt = null;
  const ownedStreams = new Set();
  let recording = null;
  let previewUrl = null;
  let transcription = null;
  let disposed = false;

  const announce = (text) => { if (status) status.textContent = text; };
  function hasCloudAiConsent() {
    try {
      return Boolean(consentVersion) && localStorage.getItem(consentKey) === consentVersion;
    } catch {
      return false;
    }
  }
  function requestCloudAiConsent() {
    root.dispatchEvent(new CustomEvent("cloudai:needs-consent"));
    announce("Accept cloud AI processing before recording or sending audio.");
  }
  function refreshSendLabel() {
    if (sendButton) {
      sendButton.textContent = (recording || activeAttempt) && !message?.value.trim()
        ? "Send recording"
        : "Send";
    }
  }

  function stopStream(attempt, stream = attempt?.stream) {
    if (!stream || attempt.stoppedStreams.has(stream)) return;
    attempt.stoppedStreams.add(stream);
    ownedStreams.delete(stream);
    stream.getTracks().forEach((track) => track.stop());
    if (attempt.stream === stream) attempt.stream = null;
  }

  function releasePreview() {
    preview?.pause();
    if (preview) {
      preview.removeAttribute("src");
      preview.hidden = true;
      preview.load();
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    recording = null;
    if (transcribeButton) transcribeButton.disabled = true;
    refreshSendLabel();
  }

  function disposeAttempt(attempt) {
    if (!attempt || attempt.disposed) return;
    attempt.disposed = true;
    attempt.settle(null);
    if (attempt.recorder && attempt.recorder.state !== "inactive") {
      try { attempt.recorder.stop(); } catch { /* A closing recorder may already be inactive. */ }
    }
    stopStream(attempt);
    attempt.chunks.length = 0;
  }

  function resetCurrent() {
    attemptSequence += 1;
    const previous = activeAttempt;
    activeAttempt = null;
    disposeAttempt(previous);
    if (transcription) {
      const wasDirectSend = transcription.sendDirectly;
      transcription.controller.abort();
      transcription = null;
      if (wasDirectSend && sendButton) sendButton.disabled = false;
    }
    releasePreview();
    if (startButton) startButton.disabled = disposed;
    if (stopButton) stopButton.disabled = true;
  }

  function chooseMimeType() {
    if (!window.MediaRecorder) return "";
    const choices = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"];
    if (typeof MediaRecorder.isTypeSupported !== "function") return null;
    return choices.find((type) => MediaRecorder.isTypeSupported(type)) || "";
  }

  function finishAttempt(attempt) {
    stopStream(attempt);
    if (activeAttempt !== attempt || attempt.failed) {
      attempt.settle(null);
      return;
    }
    activeAttempt = null;
    attempt.disposed = true;
    if (startButton) startButton.disabled = false;
    if (stopButton) stopButton.disabled = true;
    refreshSendLabel();

    const selectedMime = attempt.recorder?.mimeType
      || attempt.chunks.find((chunk) => chunk.type)?.type
      || attempt.mimeType
      || "";
    const blob = new Blob(attempt.chunks, { type: selectedMime });
    attempt.chunks.length = 0;
    if (!blob.size) {
      announce("The recording was empty. Record again or type your message.");
      attempt.settle(null);
      return;
    }
    if (attempt.oversized || (maxBytes > 0 && blob.size > maxBytes)) {
      announce("The recording is too large to transcribe. Reset and record a shorter message.");
      attempt.settle(null);
      return;
    }

    recording = { blob, mimeType: selectedMime };
    attempt.settle(recording);
    previewUrl = URL.createObjectURL(blob);
    if (preview) {
      preview.src = previewUrl;
      preview.hidden = false;
    }
    if (transcribeButton) transcribeButton.disabled = false;
    refreshSendLabel();
    announce("Recording ready. Select Send recording to send it now, or Transcribe to review it first.");
  }

  function failAttempt(attempt, detail) {
    attempt.failed = true;
    attempt.settle(null);
    if (attempt.recorder && attempt.recorder.state !== "inactive") {
      try { attempt.recorder.stop(); } catch { /* The recorder may already have stopped. */ }
    }
    stopStream(attempt);
    attempt.chunks.length = 0;
    if (activeAttempt !== attempt) return;
    activeAttempt = null;
    attempt.disposed = true;
    releasePreview();
    if (startButton) startButton.disabled = false;
    if (stopButton) stopButton.disabled = true;
    announce(detail);
  }

  startButton?.addEventListener("click", async () => {
    if (disposed || activeAttempt?.pending) return;
    if (!hasCloudAiConsent()) {
      requestCloudAiConsent();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      announce("Audio recording is not supported in this browser. Type your message instead.");
      return;
    }

    resetCurrent();
    const mimeType = chooseMimeType();
    if (mimeType === "") {
      announce("No supported recording format is available in this browser. Type your message instead.");
      return;
    }

    const attempt = {
      id: ++attemptSequence,
      mimeType,
      stream: null,
      recorder: null,
      chunks: [],
      stoppedStreams: new WeakSet(),
      pending: true,
      failed: false,
      disposed: false,
      settled: false,
      bytes: 0,
      oversized: false,
      finished: null,
      settle: null,
    };
    attempt.finished = new Promise((resolve) => {
      attempt.settle = (value) => {
        if (attempt.settled) return;
        attempt.settled = true;
        resolve(value);
      };
    });
    activeAttempt = attempt;
    if (startButton) startButton.disabled = true;
    if (stopButton) stopButton.disabled = true;
    refreshSendLabel();
    announce("Requesting microphone access.");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (disposed || activeAttempt !== attempt || attempt.id !== attemptSequence) {
        stopStream(attempt, stream);
        return;
      }
      attempt.stream = stream;
      ownedStreams.add(stream);
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      attempt.recorder = recorder;
      recorder.addEventListener("dataavailable", (event) => {
        if (activeAttempt === attempt && !attempt.failed && event.data?.size) {
          attempt.chunks.push(event.data);
          attempt.bytes += event.data.size;
          if (!attempt.oversized && maxBytes > 0 && attempt.bytes > maxBytes) {
            attempt.oversized = true;
            if (stopButton) stopButton.disabled = true;
            announce("Recording reached the size limit. Finishing it now.");
            if (recorder.state !== "inactive") {
              try { recorder.stop(); } catch { failAttempt(attempt, "Recording failed. Record again or type your message."); }
            }
          }
        }
      });
      recorder.addEventListener("error", () => {
        failAttempt(attempt, "Recording failed. Record again or type your message.");
      });
      recorder.addEventListener("stop", () => finishAttempt(attempt), { once: true });
      recorder.start(1000);
      attempt.pending = false;
      if (stopButton) stopButton.disabled = false;
      announce("Recording. Select Stop when you are done.");
    } catch (error) {
      if (attempt.stream) stopStream(attempt);
      if (activeAttempt !== attempt) return;
      activeAttempt = null;
      attempt.disposed = true;
      attempt.settle(null);
      if (startButton) startButton.disabled = false;
      if (stopButton) stopButton.disabled = true;
      refreshSendLabel();
      const errorName = error instanceof Error ? error.name : "";
      announce(errorName === "NotAllowedError" || errorName === "SecurityError"
        ? "Microphone permission was denied. Type your message instead."
        : errorName === "NotFoundError" || errorName === "DevicesNotFoundError"
          ? "No microphone is available. Type your message instead."
          : errorName === "NotReadableError" || errorName === "TrackStartError"
            ? "The microphone could not start. Check that another app is not using it, then try again."
            : "Could not start recording. Check browser permissions and try again.");
    }
  });

  stopButton?.addEventListener("click", () => {
    const attempt = activeAttempt;
    if (!attempt || attempt.pending || !attempt.recorder) return;
    try {
      if (attempt.recorder.state !== "inactive") attempt.recorder.stop();
      announce("Finishing the recording.");
    } catch {
      failAttempt(attempt, "Recording failed. Record again or type your message.");
    }
  });

  async function transcribeRecording(sendDirectly = false) {
    if (!recording || transcription || disposed) return;
    if (!hasCloudAiConsent()) {
      requestCloudAiConsent();
      return;
    }
    const submitted = recording;
    const submittedSequence = attemptSequence;
    const controller = new AbortController();
    transcription = { controller, sequence: submittedSequence, sendDirectly };
    const timeoutMs = 60_000;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    if (transcribeButton) transcribeButton.disabled = true;
    if (sendDirectly && sendButton) sendButton.disabled = true;
    announce("Transcribing the recording.");
    try {
      const body = new FormData();
      const mimeType = String(submitted.mimeType || "").toLowerCase();
      const extension = mimeType.includes("ogg")
        ? "ogg"
        : mimeType.includes("mp4")
          ? "mp4"
          : "webm";
      body.append("audio", submitted.blob, "recording." + extension);
      body.append("mimeType", submitted.mimeType || submitted.blob.type || "");
      const response = await fetch("/api/transcribe", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "X-Cloud-AI-Consent": consentVersion,
          "X-CSRFToken": csrf,
        },
        body,
        signal: controller.signal,
      });
      let result = null;
      try { result = await response.json(); } catch { /* Treat invalid provider responses as a retryable failure. */ }
      if (timedOut) throw new Error("Transcription timed out.");
      if (disposed || submittedSequence !== attemptSequence || recording !== submitted) return;
      if (!response.ok || typeof result?.transcript !== "string" || !result.transcript.trim()) {
        throw new Error(typeof result?.error === "string" && result.error.trim()
          ? result.error
          : "The recording could not be transcribed. Your recording is still available; try again.");
      }
      const transcript = result.transcript.trim();
      if (sendDirectly) {
        if (!message) throw new Error("The message field is unavailable.");
        message.value = transcript;
        transcription = null;
        resetCurrent();
        if (sendButton) sendButton.disabled = false;
        form.requestSubmit();
        return;
      }
      if (message) message.value = message.value ? message.value + " " + transcript : transcript;
      refreshSendLabel();
      message?.focus();
      announce("Transcript added to the message field. Review it before sending.");
    } catch (error) {
      if (!disposed && submittedSequence === attemptSequence) {
        if (timedOut) {
          announce("Transcription timed out. Your recording is still available; try again.");
        } else if (error?.name !== "AbortError") {
          announce(error?.name === "TypeError"
            ? "Network error while transcribing. Your recording is still available; try again."
            : error instanceof Error
              ? error.message
              : "The recording could not be transcribed. Your recording is still available; try again.");
        }
      }
    } finally {
      window.clearTimeout(timeout);
      if (transcription?.controller === controller) {
        transcription = null;
        if (recording === submitted && transcribeButton) transcribeButton.disabled = false;
        if (sendDirectly && sendButton) sendButton.disabled = false;
      }
    }
  }

  async function sendRecording() {
    if (!hasCloudAiConsent()) {
      requestCloudAiConsent();
      return;
    }
    if (transcription) {
      announce("The recording is already being transcribed.");
      return;
    }
    let submitted = recording;
    if (!submitted && activeAttempt) {
      const attempt = activeAttempt;
      if (attempt.pending || !attempt.recorder) {
        announce("The microphone is still starting. Wait for recording to begin, then select Send recording.");
        return;
      }
      if (attempt.recorder.state !== "inactive") {
        try {
          attempt.recorder.stop();
          announce("Finishing the recording before sending it.");
        } catch {
          failAttempt(attempt, "Recording failed. Record again or type your message.");
          return;
        }
      }
      submitted = await attempt.finished;
    }
    if (disposed) return;
    if (!submitted || recording !== submitted) {
      announce("There is no complete recording to send. Record again or type your message.");
      return;
    }
    await transcribeRecording(true);
  }

  form.addEventListener("submit", (event) => {
    if (message?.value.trim() || (!recording && !activeAttempt)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void sendRecording();
  }, true);

  transcribeButton?.addEventListener("click", () => { void transcribeRecording(); });
  message?.addEventListener("input", refreshSendLabel);

  resetButton?.addEventListener("click", () => {
    resetCurrent();
    announce("Recording reset. Ready to record again.");
  });
  root.addEventListener("voicechat:reset", () => {
    if (transcription?.sendDirectly) {
      transcription.controller.abort();
      transcription = null;
      if (recording && transcribeButton) transcribeButton.disabled = false;
      if (sendButton) sendButton.disabled = false;
    }
    refreshSendLabel();
  });
  window.addEventListener("pagehide", () => {
    disposed = true;
    resetCurrent();
    for (const stream of ownedStreams) {
      stream.getTracks().forEach((track) => track.stop());
    }
    ownedStreams.clear();
  }, { once: true });
})();
