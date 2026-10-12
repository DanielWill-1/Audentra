(() => {
  "use strict";

  const root = document.querySelector("[data-voice-root]");
  const form = document.querySelector("[data-voice-chat-form]");
  if (!root || !form) return;
  const input = form.querySelector("[data-voice-message]");
  const conversationInput = form.elements.namedItem("conversation_json");
  const dataInput = form.elements.namedItem("form_data");
  const reviewForm = document.querySelector("[data-voice-review-form]");
  const saveConversationInput = reviewForm?.elements.namedItem("conversation_json");
  const returnForm = document.querySelector("[data-voice-return-form]");
  const messages = document.querySelector("[data-chat-messages]");
  const csrf = form.querySelector('[name="csrfmiddlewaretoken"]')?.value || "";
  const marker = root.dataset.apiMarker || "";
  let requestNumber = 0;
  let busy = false;
  let chatController = null;
  let ttsSequence = 0;
  let ttsController = null;
  let audioHandle = null;
  let disposed = false;

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
    if (!messages) return;
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

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || disposed) return;
    const text = input.value.trim();
    if (!text) {
      announce("Enter a message before sending.");
      input.focus();
      return;
    }
    busy = true;
    const thisRequest = ++requestNumber;
    const controller = new AbortController();
    chatController = controller;
    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
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
          "X-Internal-Api-Token": marker,
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
      addMessage("assistant", answer);
      const speak = document.createElement("button");
      speak.type = "button";
      speak.className = "text-sm font-medium text-blue-700 underline";
      speak.textContent = "Speak response";
      speak.addEventListener("click", () => speakText(answer));
      messages?.append(speak);
      input.value = "";
      announce("Assistant response received. Review the fields before saving.");
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

  async function speakText(text) {
    if (disposed) return;
    const thisSpeech = ++ttsSequence;
    const replacing = Boolean(ttsController || audioHandle);
    ttsController?.abort();
    releaseAudio();
    announce(replacing ? "Replacing assistant speech playback." : "Preparing assistant speech playback.");
    const controller = new AbortController();
    ttsController = controller;
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Api-Token": marker,
          "X-CSRFToken": csrf,
        },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      const result = await response.json();
      if (disposed || thisSpeech !== ttsSequence) return;
      if (!response.ok || typeof result.audioContent !== "string"
        || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(result.audioContent)
        || !result.audioContent) {
        throw new Error(result.error || "Speech playback is unavailable.");
      }
      const audio = new Audio("data:audio/mpeg;base64," + result.audioContent);
      audioHandle = audio;
      audio.addEventListener("ended", () => {
        if (audioHandle === audio) releaseAudio(audio);
      }, { once: true });
      audio.addEventListener("error", () => {
        if (audioHandle === audio) {
          releaseAudio(audio);
          announce("Speech playback failed. Try again or continue without audio.");
        }
      }, { once: true });
      await audio.play();
      if (!disposed && thisSpeech === ttsSequence && audioHandle === audio) {
        announce("Playing the assistant response.");
      }
    } catch (error) {
      if (!disposed && thisSpeech === ttsSequence && error?.name !== "AbortError") {
        releaseAudio();
        announce(error instanceof Error ? error.message : "Speech playback is unavailable.");
      }
    } finally {
      if (ttsController === controller) ttsController = null;
    }
  }

  function releaseAudio(audio = audioHandle) {
    if (!audio) return;
    if (audio === audioHandle) audioHandle = null;
    try { audio.pause(); } catch { /* The browser may already have released playback. */ }
    audio.removeAttribute?.("src");
    try { audio.load?.(); } catch { /* Detached audio can reject a load call. */ }
  }

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
