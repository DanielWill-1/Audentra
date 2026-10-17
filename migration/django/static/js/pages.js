(() => {
  const button = document.querySelector("[data-copy-pgp]");
  if (!button) return;

  const block = document.getElementById("pgp-key-block");
  const feedback = document.getElementById("pgp-copy-feedback");
  if (!block || !feedback) return;

  let resetTimer;
  button.addEventListener("click", async () => {
    window.clearTimeout(resetTimer);
    feedback.textContent = "";
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(block.textContent.trim());
      feedback.textContent = "Copied";
    } catch {
      feedback.textContent = "Copy failed. Select and copy the key above.";
    }
    resetTimer = window.setTimeout(() => {
      feedback.textContent = "";
    }, 2500);
  });
})();

(() => {
  document.querySelectorAll("button[data-copy-code]").forEach((button) => {
    const codeBlock = document.getElementById(button.dataset.copyCode || "");
    const feedback = document.getElementById(button.getAttribute("aria-controls") || "");
    if (codeBlock instanceof HTMLElement && feedback instanceof HTMLElement) button.hidden = false;
  });

  document.addEventListener("click", async (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest("button[data-copy-code]");
    if (!(button instanceof HTMLButtonElement)) return;

    const blockId = button.dataset.copyCode;
    const block = blockId ? document.getElementById(blockId) : null;
    if (!(block instanceof HTMLElement)) return;

    const feedbackId = button.getAttribute("aria-controls");
    let feedback = feedbackId ? document.getElementById(feedbackId) : null;
    if (!(feedback instanceof HTMLElement)) {
      feedback = button.parentElement?.querySelector("[data-copy-feedback]") || null;
    }
    if (!(feedback instanceof HTMLElement)) return;

    const copyLabel = button.dataset.copyLabel || "Copy";
    button.dataset.copyLabel = copyLabel;
    window.clearTimeout(button.__audentraCopyTimer);
    feedback.textContent = "";
    button.textContent = copyLabel;

    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(block.textContent || "");
      button.textContent = "Copied";
      feedback.textContent = "Copied this code block to the clipboard.";
    } catch {
      feedback.textContent = "Copy failed. Select and copy the code block above.";
    }

    button.__audentraCopyTimer = window.setTimeout(() => {
      button.textContent = copyLabel;
      feedback.textContent = "";
    }, 2500);
  });
})();
