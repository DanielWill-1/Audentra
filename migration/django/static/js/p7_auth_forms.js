document.addEventListener('submit', (event) => {
  const form = event.target.closest('form[data-submit-once]');
  if (!form) return;
  if (form.dataset.submitted === 'true') {
    event.preventDefault();
    return;
  }
  form.dataset.submitted = 'true';
  const button = form.querySelector('button[type="submit"]');
  if (button) {
    window.setTimeout(() => {
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
    }, 0);
  }
});

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-password-toggle]');
  if (!button) return;
  const input = document.getElementById(button.dataset.passwordToggle);
  if (!(input instanceof HTMLInputElement)) return;
  const visible = input.type === 'password';
  input.type = visible ? 'text' : 'password';
  button.textContent = visible ? 'Hide password' : 'Show password';
  button.setAttribute('aria-pressed', String(visible));
});
