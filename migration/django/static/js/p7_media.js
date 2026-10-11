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
  let stream = null;
  let recorder = null;
  let chunks = [];
  let recording = null;
  let objectUrl = null;
  let generation = 0;
  let busy = false;

  const announce = (text) => { if (status) status.textContent = text; };
  function stopTracks() {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  }
  function releasePreview() {
    preview?.pause();
    if (preview) {
      preview.removeAttribute("src");
      preview.hidden = true;
      preview.load();
    }
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    recording = null;
    if (transcribeButton) transcribeButton.disabled = true;
  }
  function clearRecorder() {
    generation += 1;
    if (recorder && recorder.state !== "inactive") {
      try { recorder.stop(); } catch { /* A closing recorder may already be inactive. */ }
    }
    recorder = null;
    stopTracks();
    chunks = [];
    releasePreview();
    if (startButton) startButton.disabled = false;
    if (stopButton) stopButton.disabled = true;
    busy = false;
  }
  function chooseMimeType() {
    if (!window.MediaRecorder) return "";
    const choices = [
      "audio/webm;codecs=opus",
      "audio/ogg;codecs=opus",
      "audio/webm",
      "audio/ogg",
      "audio/mp4",
    ];
    return choices.find((type) => MediaRecorder.isTypeSupported?.(type)) || "";
  }

  startButton?.addEventListener("click", async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      announce("Audio recording is not supported in this browser. Type your message instead.");
      return;
    }
    clearRecorder();
    const current = generation;
    releasePreview();
    const mimeType = chooseMimeType();
    if (!mimeType) {
      announce("No supported recording format is available in this browser. Type your message instead.");
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (current !== generation) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      recorder = new MediaRecorder(stream, { mimeType });
      chunks = [];
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data?.size) chunks.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        stopTracks();
        if (current !== generation) return;
        const selectedMime = recorder?.mimeType || mimeType;
        const blob = new Blob(chunks, { type: selectedMime });
        chunks = [];
        if (!blob.size) {
          announce("The recording was empty. Record again or type your message.");
          if (startButton) startButton.disabled = false;
          return;
        }
        if (maxBytes > 0 && blob.size > maxBytes) {
          announce("The recording is too large to transcribe. Reset and record a shorter message.");
          if (startButton) startButton.disabled = false;
          return;
        }
        recording = { blob, mimeType: selectedMime };
        objectUrl = URL.createObjectURL(blob);
        if (preview) {
          preview.src = objectUrl;
          preview.hidden = false;
        }
        if (transcribeButton) transcribeButton.disabled = false;
        if (startButton) startButton.disabled = false;
        if (stopButton) stopButton.disabled = true;
        announce("Recording ready. Preview it or transcribe it into the message field.");
      }, { once: true });
      recorder.start(1000);
      if (startButton) startButton.disabled = true;
      if (stopButton) stopButton.disabled = false;
      announce("Recording. Select Stop when you are done.");
    } catch (error) {
      stopTracks();
      if (current === generation) {
        announce(error instanceof Error && error.name === "NotAllowedError"
          ? "Microphone permission was denied. Type your message instead."
          : "No microphone is available. Type your message instead.");
        if (startButton) startButton.disabled = false;
        if (stopButton) stopButton.disabled = true;
      }
    }
  });
  stopButton?.addEventListener("click", () => {
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      stopTracks();
      announce("Finishing the recording.");
    }
  });
  transcribeButton?.addEventListener("click", async () => {
    if (!recording || busy) return;
    busy = true;
    const current = generation;
    if (transcribeButton) transcribeButton.disabled = true;
    announce("Transcribing the recording.");
    try {
      const body = new FormData();
      const extension = recording.mimeType.includes("ogg") ? "ogg" : recording.mimeType.includes("mp4") ? "m4a" : "webm";
      body.append("audio", recording.blob, "recording." + extension);
      body.append("mimeType", recording.mimeType);
      const response = await fetch("/api/transcribe", {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-Internal-Api-Token": marker, "X-CSRFToken": csrf },
        body,
      });
      const result = await response.json();
      if (current !== generation) return;
      if (!response.ok || typeof result.transcript !== "string" || !result.transcript.trim()) {
        throw new Error(result.error || "The recording could not be transcribed.");
      }
      if (message) {
        message.value = message.value ? message.value + " " + result.transcript : result.transcript;
        message.focus();
      }
      announce("Transcript added to the message field. Review it before sending.");
    } catch (error) {
      if (current === generation) announce(error instanceof Error ? error.message : "The recording could not be transcribed.");
    } finally {
      if (current === generation) {
        busy = false;
        if (transcribeButton) transcribeButton.disabled = !recording;
      }
    }
  });
  resetButton?.addEventListener("click", () => {
    clearRecorder();
    announce("Recording reset. Ready to record again.");
  });
  window.addEventListener("pagehide", clearRecorder);
})();
