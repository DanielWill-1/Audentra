(() => {
  "use strict";

  const dashboardPanels = [...document.querySelectorAll("[data-dashboard-panel]")];
  const dashboardViewLinks = [...document.querySelectorAll('a[href^="/dashboard#"]')];
  const selectDashboardPanel = () => {
    const requested = window.location.hash.slice(1);
    const selected = ["team", "settings"].includes(requested) ? requested : "home";
    dashboardPanels.forEach((panel) => {
      const active = panel.dataset.dashboardPanel === selected;
      panel.hidden = !active;
      panel.classList.toggle("hidden", !active);
    });
    dashboardViewLinks.forEach((link) => {
      if (link.getAttribute("href") === `/dashboard#${selected}` && selected !== "home") {
        link.setAttribute("aria-current", "page");
      } else if (link.hasAttribute("aria-current")) {
        link.removeAttribute("aria-current");
      }
    });
  };
  window.addEventListener("hashchange", selectDashboardPanel);
  selectDashboardPanel();

  const section = document.querySelector("[data-dashboard-settings]");
  const form = section?.querySelector("[data-dashboard-preferences]");
  const status = section?.querySelector("[data-dashboard-settings-status]");
  if (!section || !form) return;

  const key = "voiceform_dashboard_settings";
  const storageState = section.querySelector("[data-dashboard-preferences-state]");
  const saveButton = section.querySelector("[data-dashboard-settings-save]");
  const discardButton = section.querySelector("[data-dashboard-settings-discard]");
  const resetButton = section.querySelector("[data-dashboard-settings-reset]");
  const defaults = {
    language: "English (US)",
    voiceSensitivity: 7,
    aiProcessingSpeed: "Real-time (Recommended)",
    industrySpecialization: "Healthcare",
  };
  const languages = new Set(["English (US)", "English (UK)", "Spanish", "French", "German"]);
  const speeds = new Set(["Real-time (Recommended)", "Fast", "Balanced", "Accurate"]);
  const industries = new Set([
    "Healthcare",
    "Field Work & Construction",
    "Human Resources",
    "Legal Services",
    "Education",
    "General Business",
  ]);

  const validate = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const sensitivity = Number(value.voiceSensitivity);
    if (
      !languages.has(value.language) ||
      !Number.isInteger(sensitivity) || sensitivity < 1 || sensitivity > 10 ||
      !speeds.has(value.aiProcessingSpeed) ||
      !industries.has(value.industrySpecialization)
    ) return null;
    return {
      language: value.language,
      voiceSensitivity: sensitivity,
      aiProcessingSpeed: value.aiProcessingSpeed,
      industrySpecialization: value.industrySpecialization,
    };
  };

  const read = () => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return { values: { ...defaults }, message: "Default preferences are shown. Save to store them in this browser.", state: "Using defaults" };
      const parsed = validate(JSON.parse(stored));
      if (parsed) return { values: parsed, message: "Saved preferences loaded from this browser.", state: "Saved in browser" };
      return { values: { ...defaults }, message: "Saved preferences were invalid. Defaults are shown. Change a preference to save valid settings.", state: "Using defaults" };
    } catch {
      return { values: { ...defaults }, message: "Browser storage is unavailable. Preferences cannot be saved after you leave this page.", state: "Storage unavailable" };
    }
  };

  const loaded = read();
  let savedValues = { ...loaded.values };
  let hasSavedValues = loaded.state === "Saved in browser";
  let storageAvailable = loaded.state !== "Storage unavailable";
  const controls = Object.fromEntries(
    Object.keys(defaults).map((name) => [name, form.elements.namedItem(name)]),
  );
  const output = section.querySelector("[data-sensitivity-output]");
  const valuesEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);

  const apply = (values) => {
    Object.entries(controls).forEach(([name, control]) => {
      if (control) control.value = String(values[name]);
    });
    if (output) output.value = `${values.voiceSensitivity} / 10`;
  };

  const currentValues = () => validate(Object.fromEntries(
      Object.entries(controls).map(([name, control]) => [name, control?.value]),
    ));

  const setStatus = (message, state) => {
    if (status) status.textContent = message;
    if (storageState) storageState.textContent = state;
  };

  const updateState = (message = "") => {
    const current = currentValues();
    if (!current) {
      if (saveButton) saveButton.disabled = true;
      if (discardButton) discardButton.disabled = true;
      if (resetButton) resetButton.disabled = true;
      setStatus("Choose a valid value for each preference.", "Check settings");
      return;
    }

    const dirty = !valuesEqual(current, savedValues);
    if (saveButton) saveButton.disabled = !dirty;
    if (discardButton) discardButton.disabled = !dirty;
    if (resetButton) resetButton.disabled = valuesEqual(current, defaults);
    if (message) {
      const state = !storageAvailable
        ? "Storage unavailable"
        : dirty
          ? "Unsaved changes"
          : hasSavedValues
            ? "Saved in browser"
            : loaded.state;
      setStatus(message, state);
    } else if (!storageAvailable) {
      setStatus("Browser storage is unavailable. Preferences cannot be saved after you leave this page.", "Storage unavailable");
    } else if (dirty) {
      setStatus("You have unsaved changes. Save them to this browser or discard them.", "Unsaved changes");
    } else if (hasSavedValues) {
      setStatus("Saved preferences loaded from this browser.", "Saved in browser");
    } else {
      setStatus(loaded.message, loaded.state);
    }
  };

  apply(savedValues);
  Object.values(controls).forEach((control) => {
    if (control) control.disabled = false;
  });
  updateState();

  form.addEventListener("input", () => {
    const current = currentValues();
    if (current && output) output.value = `${current.voiceSensitivity} / 10`;
    updateState();
  });
  form.addEventListener("change", () => updateState());
  form.addEventListener("submit", (event) => event.preventDefault());

  saveButton?.addEventListener("click", () => {
    const current = currentValues();
    if (!current) {
      updateState();
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(current));
      savedValues = { ...current };
      hasSavedValues = true;
      storageAvailable = true;
      updateState("Preferences saved in this browser. They do not change live provider or processing settings.");
    } catch {
      storageAvailable = false;
      updateState("Browser storage is unavailable. Your changes remain on this page but will not persist after you leave.");
    }
  });

  discardButton?.addEventListener("click", () => {
    apply(savedValues);
    updateState("Unsaved changes discarded.");
  });

  resetButton?.addEventListener("click", () => {
    apply(defaults);
    updateState("Defaults selected. Save to store them in this browser.");
  });
})();
