(() => {
  "use strict";

  const root = document.querySelector("[data-voice-root]");
  const form = document.querySelector("[data-voice-chat-form]");
  if (!root || !form) return;
  const input = form.querySelector("[data-voice-message]");
  const autoSpeak = form.querySelector("[data-auto-speak]");
  const stopSpeechButton = form.querySelector("[data-stop-speech]");
  const conversationInput = form.elements.namedItem("conversation_json");
  const dataInput = form.elements.namedItem("form_data");
  const resetChatButton = root.querySelector("[data-chat-reset]");
  const reviewForm = document.querySelector("[data-voice-review-form]");
  const saveConversationInput = reviewForm?.elements.namedItem("conversation_json");
  const returnForm = document.querySelector("[data-voice-return-form]");
  const messages = document.querySelector("[data-chat-messages]");
  const csrf = form.querySelector('[name="csrfmiddlewaretoken"]')?.value || "";
  const consentVersion = root.dataset.cloudAiConsentVersion || "";
  const consentKey = "audentra.cloudAiConsent";
  const consentPanel = root.querySelector("[data-cloud-ai-consent]");
  const consentStatus = root.querySelector("[data-cloud-ai-consent-status]");
  const consentToggle = root.querySelector("[data-cloud-ai-consent-toggle]");
  const consentField = form.elements.namedItem("cloud_ai_consent_version");
  const consentAccept = root.querySelector("[data-cloud-ai-consent-accept]");
  const consentDecline = root.querySelector("[data-cloud-ai-consent-decline]");
  let requestNumber = 0;
  let busy = false;
  let chatController = null;
  let ttsSequence = 0;
  let ttsController = null;
  let audioHandle = null;
  let disposed = false;

  function hasCloudAiConsent() {
    try {
      return Boolean(consentVersion) && localStorage.getItem(consentKey) === consentVersion;
    } catch {
      return false;
    }
  }
  function refreshConsentUi(showPrompt = false) {
    const accepted = hasCloudAiConsent();
    if (consentField) consentField.value = accepted ? consentVersion : "";
    if (consentStatus) {
      consentStatus.textContent = accepted
        ? "Cloud AI consent is enabled for this browser. You can withdraw it when no request is in progress."
        : "Cloud AI consent has not been granted. Chat, recording, transcription, and spoken replies are blocked.";
    }
    if (consentToggle) {
      consentToggle.textContent = accepted ? "Withdraw cloud AI consent" : "Review and enable cloud AI";
    }
    if (consentPanel) consentPanel.hidden = accepted || !showPrompt;
    return accepted;
  }
  function requestCloudAiConsent() {
    if (!hasCloudAiConsent()) {
      refreshConsentUi(true);
      consentPanel?.querySelector("[data-cloud-ai-consent-accept]")?.focus();
    }
  }
  function grantCloudAiConsent() {
    try {
      localStorage.setItem(consentKey, consentVersion);
    } catch {
      announce("This browser could not save your consent. Enable browser storage, then try again.");
      return;
    }
    refreshConsentUi();
    announce("Cloud AI consent saved for this browser. You can now use chat and speech.");
    input?.focus();
  }
  function withdrawCloudAiConsent() {
    if (busy) {
      announce("Wait for the current AI request to finish before withdrawing consent.");
      return;
    }
    chatController?.abort();
    stopSpeech(false);
    try { localStorage.removeItem(consentKey); } catch {
      announce("This browser could not remove the saved consent. Check browser storage settings and try again.");
      return;
    }
    if (hasCloudAiConsent()) {
      announce("This browser could not remove the saved consent. Check browser storage settings and try again.");
      return;
    }
    refreshConsentUi();
    announce("Cloud AI consent withdrawn. Future chat and speech requests are blocked until you opt in again.");
  }

  function announce(text) {
    const status = document.querySelector("[data-media-status]");
    if (status) status.textContent = text;
  }
  function parseState(control, fallback) {
    try {
      const value = JSON.parse(control.value || "");
      return value && typeof value === "object" ? value : fallback;
    } catch {
      return fallback;
    }
  }
  function addMessage(type, content) {
    if (!messages) return null;
    const article = document.createElement("article");
    article.className = "rounded-lg bg-white p-3";
    const label = document.createElement("p");
    label.className = "text-xs font-medium uppercase text-text-muted";
    label.textContent = type === "user" ? "You" : "Assistant";
    const body = document.createElement("p");
    body.className = "mt-1 whitespace-pre-wrap text-sm";
    body.textContent = content;
    article.append(label, body);
    messages.append(article);
    messages.scrollTop = messages.scrollHeight;
    return article;
  }
  function updateReview(data) {
    reviewForm?.querySelectorAll('[name^="field_"]').forEach((control) => {
      if (control.name === "field_data") return;
      const id = control.name.slice(6);
      if (!Object.hasOwn(data, id)) return;
      if (control.type === "checkbox") control.checked = Boolean(data[id]);
      else control.value = String(data[id] ?? "");
    });
  }
  function readReviewData(initial) {
    const values = { ...initial };
    reviewForm?.querySelectorAll('[name^="field_"]').forEach((control) => {
      if (control.name === "field_data") return;
      const id = control.name.slice(6);
      values[id] = control.type === "checkbox" ? control.checked : control.value;
    });
    return values;
  }
  function syncConversation(value) {
    const serialized = JSON.stringify(value);
    if (conversationInput) conversationInput.value = serialized;
    if (saveConversationInput) saveConversationInput.value = serialized;
    const returnConversationInput = returnForm?.elements.namedItem("conversation_json");
    if (returnConversationInput) returnConversationInput.value = serialized;
  }
  function resetChat() {
    requestNumber += 1;
    chatController?.abort();
    chatController = null;
    busy = false;
    const sendButton = form.querySelector('button[type="submit"]');
    if (sendButton) sendButton.disabled = false;
    input.value = "";
    syncConversation([]);
    stopSpeech(false);
    if (messages) {
      messages.replaceChildren();
      const placeholder = document.createElement("p");
      placeholder.className = "text-sm text-text-secondary";
      placeholder.textContent = "Chat reset. Your current form draft is unchanged. Send a new message to continue.";
      messages.append(placeholder);
    }
    root.dispatchEvent(new CustomEvent("voicechat:reset"));
    announce("Chat reset. Your current form draft was kept.");
  }
  function applyExtraction(extracted, fields, current) {
    const updated = { ...current };
    const normalize = (value) => String(value).replace(/[^a-z0-9]/gi, "").toLowerCase();
    Object.entries(extracted).forEach(([key, value]) => {
      const name = normalize(key);
      const field = fields.find((item) =>
        item && typeof item.id === "string"
        && (normalize(item.id) === name || normalize(item.label || "") === name));
      if (field) updated[field.id] = value;
    });
    return updated;
  }

  resetChatButton?.addEventListener("click", resetChat);
  consentAccept?.addEventListener("click", grantCloudAiConsent);
  consentDecline?.addEventListener("click", () => {
    refreshConsentUi();
    announce("Cloud AI was not enabled. You can review consent later; no chat or speech data was sent.");
  });
  consentToggle?.addEventListener("click", () => {
    if (hasCloudAiConsent()) withdrawCloudAiConsent();
    else requestCloudAiConsent();
  });
  root.addEventListener("cloudai:needs-consent", requestCloudAiConsent);
  refreshConsentUi(!hasCloudAiConsent());

  function splitSpeech(text, maximum = 199) {
    const remainingText = String(text).replace(/\s+/g, " ").trim();
    const chunks = [];
    let remaining = remainingText;
    while (remaining.length > maximum) {
      const window = remaining.slice(0, maximum + 1);
      const sentenceBreak = Math.max(
        window.lastIndexOf(". "),
        window.lastIndexOf("? "),
        window.lastIndexOf("! "),
      );
      let cut = sentenceBreak >= maximum * 0.45 ? sentenceBreak + 1 : window.lastIndexOf(" ");
      if (cut < 1) cut = maximum;
      chunks.push(remaining.slice(0, cut).trim());
      remaining = remaining.slice(cut).trimStart();
    }
    if (remaining) chunks.push(remaining);
    return chunks;
  }

  function stopSpeech(announceStopped = true) {
    ttsSequence += 1;
    ttsController?.abort();
    ttsController = null;
    releaseAudio();
    if (stopSpeechButton) stopSpeechButton.disabled = true;
    if (announceStopped) announce("Speech stopped.");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!hasCloudAiConsent()) {
      requestCloudAiConsent();
      announce("Accept cloud AI processing before sending this message.");
      return;
    }
    if (busy || disposed) return;
    const text = input.value.trim();
    if (!text) {
      announce("Enter a message before sending.");
      input.focus();
      return;
    }
    busy = true;
    stopSpeech(false);
    const thisRequest = ++requestNumber;
    const controller = new AbortController();
    chatController = controller;
    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    announce("Thinking about your answer.");
    const conversation = parseState(conversationInput, []);
    const current = readReviewData(parseState(dataInput, {}));
    if (dataInput) dataInput.value = JSON.stringify(current);
    let fields = [];
    try {
      const parsed = JSON.parse(root.dataset.fieldsJson || "[]");
      if (Array.isArray(parsed)) fields = parsed;
    } catch {
      fields = [];
    }
    try {
      const response = await fetch("/api/ai/extract", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-Cloud-AI-Consent": consentVersion,
          "X-CSRFToken": csrf,
        },
        body: JSON.stringify({
          userInput: text,
          formFields: fields,
          currentFormData: current,
          conversation,
        }),
        signal: controller.signal,
      });
      const result = await response.json();
      if (disposed || thisRequest !== requestNumber) return;
      if (!response.ok) throw new Error(result.error || "The assistant is temporarily unavailable.");
      const updated = applyExtraction(
        result.extractedData && typeof result.extractedData === "object" ? result.extractedData : {},
        fields,
        current,
      );
      const answer = typeof result.response === "string" && result.response
        ? result.response
        : "I could not find a matching field in that message. You can continue in chat or edit the fields.";
      conversation.push({ type: "user", content: text }, { type: "assistant", content: answer });
      if (conversation.length > 30) conversation.splice(0, conversation.length - 30);
      syncConversation(conversation);
      dataInput.value = JSON.stringify(updated);
      updateReview(updated);
      addMessage("user", text);
      const assistantMessage = addMessage("assistant", answer);
      const speak = document.createElement("button");
      speak.type = "button";
      speak.className = "text-sm font-medium text-blue-700 underline";
      speak.textContent = "Speak response";
      speak.addEventListener("click", () => speakText(answer));
      assistantMessage?.append(speak);
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      announce("Assistant response received. Review the fields before saving.");
      if (autoSpeak?.checked) void speakText(answer);
    } catch (error) {
      if (!disposed && thisRequest === requestNumber && error?.name !== "AbortError") {
        announce(error instanceof Error ? error.message : "The assistant is temporarily unavailable.");
      }
    } finally {
      if (thisRequest === requestNumber) {
        busy = false;
        chatController = null;
        if (button) button.disabled = false;
      }
    }
  });

  returnForm?.addEventListener("submit", () => {
    const conversation = parseState(conversationInput, []);
    const returnConversationInput = returnForm.elements.namedItem("conversation_json");
    const returnDataInput = returnForm.elements.namedItem("form_data");
    if (returnConversationInput) returnConversationInput.value = JSON.stringify(conversation);
    if (returnDataInput) {
      returnDataInput.value = JSON.stringify(readReviewData(parseState(dataInput, {})));
    }
  });

  function playAudioBlob(blob, signal) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioHandle = audio;
      let settled = false;
      const finish = (error) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", onAbort);
        audio.removeEventListener("ended", onEnded);
        audio.removeEventListener("error", onError);
        if (audioHandle === audio) releaseAudio(audio);
        URL.revokeObjectURL(url);
        if (error) reject(error);
        else resolve();
      };
      const onEnded = () => finish();
      const onError = () => finish(new Error("Speech playback failed."));
      const onAbort = () => finish(new DOMException("Speech stopped.", "AbortError"));
      audio.addEventListener("ended", onEnded, { once: true });
      audio.addEventListener("error", onError, { once: true });
      signal.addEventListener("abort", onAbort, { once: true });
      if (signal.aborted) {
        onAbort();
        return;
      }
      audio.play().catch(finish);
    });
  }

  async function speakText(text) {
    if (disposed) return;
    if (!hasCloudAiConsent()) {
      requestCloudAiConsent();
      announce("Accept cloud AI processing before requesting a spoken reply.");
      return;
    }
    const thisSpeech = ++ttsSequence;
    ttsController?.abort();
    releaseAudio();
    const controller = new AbortController();
    ttsController = controller;
    const chunks = splitSpeech(text);
    if (!chunks.length) return;
    if (stopSpeechButton) stopSpeechButton.disabled = false;
    try {
      for (let index = 0; index < chunks.length; index += 1) {
        if (disposed || thisSpeech !== ttsSequence || controller.signal.aborted) return;
        announce(chunks.length > 1
          ? `Preparing spoken reply (${index + 1} of ${chunks.length}).`
          : "Preparing spoken reply.");
        const response = await fetch("/api/tts", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "X-Cloud-AI-Consent": consentVersion,
            "X-CSRFToken": csrf,
          },
          body: JSON.stringify({ text: chunks[index] }),
          signal: controller.signal,
        });
        const result = await response.json();
        if (disposed || thisSpeech !== ttsSequence) return;
        if (!response.ok || typeof result.audioContent !== "string"
          || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(result.audioContent)
          || !result.audioContent) {
          throw new Error(result.error || "Speech playback is unavailable.");
        }
        const binary = atob(result.audioContent);
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        const encoding = String(result.metadata?.encoding || "mp3").toLowerCase();
        const mime = encoding === "wav" ? "audio/wav" : "audio/mpeg";
        await playAudioBlob(new Blob([bytes], { type: mime }), controller.signal);
      }
      if (!disposed && thisSpeech === ttsSequence) announce("Finished speaking the reply.");
    } catch (error) {
      if (!disposed && thisSpeech === ttsSequence && error?.name !== "AbortError") {
        releaseAudio();
        const message = error instanceof Error && error.name === "NotAllowedError"
          ? "The reply is ready. Select Speak response to play it."
          : error instanceof Error
            ? error.message
            : "Speech playback is unavailable.";
        announce(`${message} The text reply is still available.`);
      }
    } finally {
      if (ttsController === controller) {
        ttsController = null;
        if (stopSpeechButton) stopSpeechButton.disabled = true;
      }
    }
  }

  function releaseAudio(audio = audioHandle) {
    if (!audio) return;
    if (audio === audioHandle) audioHandle = null;
    try { audio.pause(); } catch { /* The browser may already have released playback. */ }
    audio.removeAttribute?.("src");
    try { audio.load?.(); } catch { /* Detached audio can reject a load call. */ }
  }

  stopSpeechButton?.addEventListener("click", () => stopSpeech());
  autoSpeak?.addEventListener("change", () => {
    if (!autoSpeak.checked) stopSpeech(false);
    announce(autoSpeak.checked ? "Automatic speech is on." : "Automatic speech is off.");
  });

  window.addEventListener("pagehide", () => {
    disposed = true;
    requestNumber += 1;
    ttsSequence += 1;
    chatController?.abort();
    ttsController?.abort();
    chatController = null;
    ttsController = null;
    releaseAudio();
  }, { once: true });
})();
