(() => {
  "use strict";

  const root = document.querySelector("[data-voice-root]");
  const form = document.querySelector("[data-voice-chat-form]");
  if (!root || !form) return;
  const input = form.querySelector("[data-voice-message]");
  const conversationInput = form.elements.namedItem("conversation_json");
  const dataInput = form.elements.namedItem("form_data");
  const messages = document.querySelector("[data-chat-messages]");
  const csrf = form.querySelector('[name="csrfmiddlewaretoken"]')?.value || "";
  const marker = root.dataset.apiMarker || "";
  let requestNumber = 0;
  let busy = false;

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
    document.querySelectorAll('[name^="field_"]').forEach((control) => {
      if (control.name === "field_data") return;
      const id = control.name.slice(6);
      if (!Object.hasOwn(data, id)) return;
      if (control.type === "checkbox") control.checked = Boolean(data[id]);
      else control.value = String(data[id] ?? "");
    });
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
    if (busy) return;
    const text = input.value.trim();
    if (!text) {
      announce("Enter a message before sending.");
      input.focus();
      return;
    }
    busy = true;
    const thisRequest = ++requestNumber;
    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    const conversation = parseState(conversationInput, []);
    const current = parseState(dataInput, {});
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
      });
      const result = await response.json();
      if (thisRequest !== requestNumber) return;
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
      conversationInput.value = JSON.stringify(conversation);
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
      if (thisRequest === requestNumber) {
        announce(error instanceof Error ? error.message : "The assistant is temporarily unavailable.");
      }
    } finally {
      if (thisRequest === requestNumber) {
        busy = false;
        if (button) button.disabled = false;
      }
    }
  });

  async function speakText(text) {
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
      });
      const result = await response.json();
      if (!response.ok || typeof result.audioContent !== "string") {
        throw new Error(result.error || "Speech playback is unavailable.");
      }
      const audio = new Audio("data:audio/mpeg;base64," + result.audioContent);
      await audio.play();
      announce("Playing the assistant response.");
    } catch (error) {
      announce(error instanceof Error ? error.message : "Speech playback is unavailable.");
    }
  }
})();
