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
  const status = form.querySelector("[data-media-status]");
  const csrf = form.querySelector('[name="csrfmiddlewaretoken"]')?.value || "";
  const marker = root.dataset.apiMarker || "";
  const maxBytes = Number(root.dataset.maxAudioBytes || 0);
  let attemptSequence = 0;
  let activeAttempt = null;
  let recording = null;
  let previewUrl = null;
  let transcription = null;
  let disposed = false;

  const announce = (text) => { if (status) status.textContent = text; };

  function stopStream(attempt, stream = attempt?.stream) {
    if (!stream || attempt.stoppedStreams.has(stream)) return;
    attempt.stoppedStreams.add(stream);
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
  }

  function disposeAttempt(attempt) {
    if (!attempt || attempt.disposed) return;
    attempt.disposed = true;
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
      transcription.controller.abort();
      transcription = null;
    }
    releasePreview();
    if (startButton) startButton.disabled = disposed;
    if (stopButton) stopButton.disabled = true;
  }

  function chooseMimeType() {
    if (!window.MediaRecorder) return "";
    const choices = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus"];
    return choices.find((type) => MediaRecorder.isTypeSupported?.(type)) || "";
  }

  function finishAttempt(attempt) {
    stopStream(attempt);
    if (activeAttempt !== attempt || attempt.failed) return;
    activeAttempt = null;
    attempt.disposed = true;
    if (startButton) startButton.disabled = false;
    if (stopButton) stopButton.disabled = true;

    const selectedMime = attempt.recorder?.mimeType || attempt.mimeType;
    const blob = new Blob(attempt.chunks, { type: selectedMime });
    attempt.chunks.length = 0;
    if (!blob.size) {
      announce("The recording was empty. Record again or type your message.");
      return;
    }
    if (maxBytes > 0 && blob.size > maxBytes) {
      announce("The recording is too large to transcribe. Reset and record a shorter message.");
      return;
    }

    recording = { blob, mimeType: selectedMime };
    previewUrl = URL.createObjectURL(blob);
    if (preview) {
      preview.src = previewUrl;
      preview.hidden = false;
    }
    if (transcribeButton) transcribeButton.disabled = false;
    announce("Recording ready. Preview it or transcribe it into the message field.");
  }

  function failAttempt(attempt, detail) {
    attempt.failed = true;
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
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      announce("Audio recording is not supported in this browser. Type your message instead.");
      return;
    }

    resetCurrent();
    const mimeType = chooseMimeType();
    if (!mimeType) {
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
    };
    activeAttempt = attempt;
    if (startButton) startButton.disabled = true;
    if (stopButton) stopButton.disabled = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (disposed || activeAttempt !== attempt || attempt.id !== attemptSequence) {
        stopStream(attempt, stream);
        return;
      }
      attempt.stream = stream;
      const recorder = new MediaRecorder(stream, { mimeType });
      attempt.recorder = recorder;
      recorder.addEventListener("dataavailable", (event) => {
        if (activeAttempt === attempt && !attempt.failed && event.data?.size) {
          attempt.chunks.push(event.data);
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
      if (startButton) startButton.disabled = false;
      if (stopButton) stopButton.disabled = true;
      announce(error instanceof Error && error.name === "NotAllowedError"
        ? "Microphone permission was denied. Type your message instead."
        : "No microphone is available. Type your message instead.");
    }
  });

  stopButton?.addEventListener("click", () => {
    const attempt = activeAttempt;
    if (!attempt || attempt.pending || !attempt.recorder) return;
    try {
      if (attempt.recorder.state !== "inactive") attempt.recorder.stop();
      stopStream(attempt);
      announce("Finishing the recording.");
    } catch {
      failAttempt(attempt, "Recording failed. Record again or type your message.");
    }
  });

  transcribeButton?.addEventListener("click", async () => {
    if (!recording || transcription || disposed) return;
    const submitted = recording;
    const submittedSequence = attemptSequence;
    const controller = new AbortController();
    transcription = { controller, sequence: submittedSequence };
    transcribeButton.disabled = true;
    announce("Transcribing the recording.");
    try {
      const body = new FormData();
      const extension = submitted.mimeType.includes("ogg") ? "ogg" : "webm";
      body.append("audio", submitted.blob, "recording." + extension);
      body.append("mimeType", submitted.mimeType);
      const response = await fetch("/api/transcribe", {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-Internal-Api-Token": marker, "X-CSRFToken": csrf },
        body,
        signal: controller.signal,
      });
      const result = await response.json();
      if (disposed || submittedSequence !== attemptSequence || recording !== submitted) return;
      if (!response.ok || typeof result.transcript !== "string" || !result.transcript.trim()) {
        throw new Error(result.error || "The recording could not be transcribed.");
      }
      if (message) {
        message.value = message.value ? message.value + " " + result.transcript : result.transcript;
        message.focus();
      }
      announce("Transcript added to the message field. Review it before sending.");
    } catch (error) {
      if (!disposed && submittedSequence === attemptSequence && error?.name !== "AbortError") {
        announce(error instanceof Error ? error.message : "The recording could not be transcribed.");
      }
    } finally {
      if (transcription?.controller === controller) {
        transcription = null;
        if (recording === submitted && transcribeButton) transcribeButton.disabled = false;
      }
    }
  });

  resetButton?.addEventListener("click", () => {
    resetCurrent();
    announce("Recording reset. Ready to record again.");
  });
  window.addEventListener("pagehide", () => {
    disposed = true;
    resetCurrent();
  }, { once: true });
})();
