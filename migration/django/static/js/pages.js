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
  document.addEventListener('click', async (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest('[data-copy-code], body[data-active-route="/documentation"] button');
    if (!(button instanceof HTMLButtonElement)) return;
    if (!button.hasAttribute('data-copy-code') && !['Copy', 'Copied'].includes(button.innerText.trim())) return;

    const section = button.closest('section');
    const block = section?.querySelector('pre code');
    if (!(block instanceof HTMLElement) || !section) return;
    let feedback = section.querySelector('[data-copy-feedback]');
    if (!(feedback instanceof HTMLElement)) {
      feedback = document.createElement('p');
      feedback.className = 'sr-only';
      feedback.setAttribute('data-copy-feedback', '');
      feedback.setAttribute('aria-live', 'polite');
      section.append(feedback);
    }

    window.clearTimeout(button.__audentraCopyTimer);
    button.textContent = 'Copy';
    feedback.textContent = '';
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(block.textContent || '');
      button.textContent = 'Copied';
      feedback.textContent = 'Copied code to clipboard.';
    } catch {
      button.textContent = 'Copy';
      feedback.textContent = 'Copy failed. Select and copy this block above.';
    }
    button.__audentraCopyTimer = window.setTimeout(() => {
      button.textContent = 'Copy';
      feedback.textContent = '';
    }, 2000);
  });
})();
