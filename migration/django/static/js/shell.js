(() => {
  if (window.__audentraShellEventsBound) return;
  window.__audentraShellEventsBound = true;

  const focusableSelector = [
    'a[href]', 'area[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  const focusables = (dialog) => Array.from(dialog.querySelectorAll(focusableSelector))
    .filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
  document.querySelectorAll('[data-local-datetime]').forEach((element) => {
    if (!(element instanceof HTMLTimeElement)) return;
    const date = new Date(element.dateTime);
    if (!Number.isNaN(date.getTime())) element.textContent = date.toLocaleString();
  });
  const clearNativeKeyboardFocus = () => {
    document.querySelectorAll('.keyboard-focus-visible').forEach((element) => {
      element.classList.remove('keyboard-focus-visible');
    });
  };

  document.addEventListener('pointerdown', clearNativeKeyboardFocus, true);
  document.addEventListener('focusout', (event) => {
    if (event.target instanceof HTMLElement) event.target.classList.remove('keyboard-focus-visible');
  }, true);
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    window.setTimeout(() => {
      clearNativeKeyboardFocus();
      const active = document.activeElement;
      if (active instanceof HTMLInputElement && ['date', 'time'].includes(active.type)) {
        active.classList.add('keyboard-focus-visible');
      }
    }, 0);
  }, true);

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const navigationLink = target.closest('#mobile-navigation a[href]');
    const navigationDialog = navigationLink?.closest('dialog[data-shell-dialog]');
    if (navigationDialog instanceof HTMLDialogElement && navigationDialog.open) {
      navigationDialog.close();
    }

    const opener = target.closest('[data-modal-open]');
    if (opener) {
      const dialog = document.getElementById(opener.getAttribute('data-modal-open'));
      if (dialog instanceof HTMLDialogElement && !dialog.open) {
        dialog.__audentraReturnFocus = opener;
        dialog.__audentraOpener = opener;
        opener.setAttribute('aria-expanded', 'true');
        if (!opener.hasAttribute('aria-controls')) opener.setAttribute('aria-controls', dialog.id);
        dialog.showModal();
        const initial = dialog.querySelector('[data-modal-initial-focus]') || focusables(dialog)[0];
        if (initial instanceof HTMLElement) requestAnimationFrame(() => initial.focus());
      }
      return;
    }

    const closer = target.closest('[data-modal-close]');
    if (closer) {
      const dialog = closer.closest('dialog[data-shell-dialog]');
      if (dialog instanceof HTMLDialogElement && dialog.open) dialog.close();
      return;
    }

    if (target instanceof HTMLDialogElement && target.matches('[data-shell-dialog]') && target.open) {
      const bounds = target.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right
          || event.clientY < bounds.top || event.clientY > bounds.bottom) target.close();
    }
  });

  document.addEventListener('keydown', (event) => {
    const dialog = document.querySelector('dialog[data-shell-dialog][open]');
    if (!(dialog instanceof HTMLDialogElement) || event.key !== 'Tab') return;
    const items = focusables(dialog);
    if (!items.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  });

  document.addEventListener('close', (event) => {
    const dialog = event.target;
    if (!(dialog instanceof HTMLDialogElement) || !dialog.matches('[data-shell-dialog]')) return;
    const opener = dialog.__audentraOpener;
    if (opener instanceof HTMLElement) {
      opener.setAttribute('aria-expanded', 'false');
      if (opener.isConnected) opener.focus();
    }
    dialog.__audentraOpener = null;
    dialog.__audentraReturnFocus = null;
  }, true);
})();
