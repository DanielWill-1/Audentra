(() => {
  "use strict";

  const root = document.querySelector("[data-settings-root]");
  if (!root) return;
  const host = document.querySelector("[data-settings-key]");
  const status = document.querySelector("[data-settings-status]");
  const key = host?.dataset.settingsKey;
  const defaults = {
    defaultDuration: 60, defaultReminderMinutes: 15,
    workingHours: { start: "09:00", end: "17:00" },
    workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    timezone: "America/New_York",
    emailNotifications: true, pushNotifications: true, reminderNotifications: true,
    dailyDigest: false, weeklyReport: true, defaultView: "month", weekStartsOn: 1,
    showWeekends: true, showDeclinedEvents: false, shareCalendar: false,
    allowGuestInvites: true, showBusyTime: true, theme: "light", colorScheme: "blue",
    compactView: false, googleCalendarSync: false, outlookSync: false,
    slackNotifications: false, teamsNotifications: false,
  };
  const known = new Set(Object.keys(defaults));

  function announce(message) {
    if (status) status.textContent = message;
  }
  function readPath(value, path) {
    return path.split(".").reduce((current, part) => current?.[part], value);
  }
  function sanitize(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Settings must be a JSON object.");
    const result = { ...defaults, workingHours: { ...defaults.workingHours } };
    for (const name of known) {
      if (!Object.hasOwn(raw, name)) continue;
      const value = raw[name];
      if (name === "workingHours") {
        if (!value || typeof value !== "object" || typeof value.start !== "string" || typeof value.end !== "string") throw new Error("Working hours are invalid.");
        result.workingHours = { start: value.start.slice(0, 5), end: value.end.slice(0, 5) };
      } else if (name === "workingDays") {
        const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
        if (!Array.isArray(value) || value.length > 7 || value.some((day) => !days.includes(day))) throw new Error("Working days are invalid.");
        result.workingDays = [...new Set(value)];
      } else if (typeof defaults[name] === "boolean") {
        if (typeof value !== "boolean") throw new Error(name + " must be true or false.");
        result[name] = value;
      } else if (typeof defaults[name] === "number") {
        if (!Number.isFinite(value) || value < 0 || value > 10080) throw new Error(name + " is outside the supported range.");
        result[name] = value;
      } else if (typeof defaults[name] === "string") {
        if (typeof value !== "string" || value.length > 100) throw new Error(name + " is invalid.");
        result[name] = value;
      }
    }
    if (!["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Asia/Tokyo", "Australia/Sydney"].includes(result.timezone)
      || !["month", "week"].includes(result.defaultView)
      || ![0, 1].includes(result.weekStartsOn)
      || !["light", "dark", "auto"].includes(result.theme)
      || !["blue", "emerald", "purple", "orange", "pink", "indigo"].includes(result.colorScheme)) {
      throw new Error("A selected settings option is not supported.");
    }
    return result;
  }
  function apply(value) {
    root.querySelectorAll("[data-setting]").forEach((control) => {
      const result = readPath(value, control.dataset.setting);
      if (control.type === "checkbox") control.checked = Boolean(result);
      else if (result !== undefined && result !== null) control.value = String(result);
    });
    root.querySelectorAll("[data-setting-array]").forEach((control) => {
      control.checked = Array.isArray(value[control.dataset.settingArray]) && value[control.dataset.settingArray].includes(control.value);
    });
  }
  function read() {
    const result = JSON.parse(JSON.stringify(defaults));
    root.querySelectorAll("[data-setting]").forEach((control) => {
      const path = control.dataset.setting.split(".");
      const defaultValue = readPath(defaults, control.dataset.setting);
      const value = control.type === "checkbox"
        ? control.checked
        : typeof defaultValue === "number"
          ? Number(control.value)
          : control.value;
      let target = result;
      while (path.length > 1) target = target[path.shift()];
      target[path[0]] = value;
    });
    result.workingDays = [...root.querySelectorAll("[data-setting-array]:checked")].map((control) => control.value);
    return sanitize(result);
  }

  try {
    const stored = key ? localStorage.getItem(key) : null;
    apply(stored ? sanitize(JSON.parse(stored)) : defaults);
  } catch {
    apply(defaults);
    announce("Saved settings could not be read. Defaults are shown; saving will replace the unreadable value.");
  }
  root.querySelectorAll("[data-settings-tab-button]").forEach((button) => {
    button.addEventListener("click", () => {
      const selected = button.dataset.settingsTabButton;
      root.querySelectorAll("[data-settings-tab-button]").forEach((item) => item.setAttribute("aria-selected", String(item === button)));
      root.querySelectorAll("[data-settings-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.settingsPanel !== selected;
        panel.classList.toggle("hidden", panel.hidden);
      });
    });
  });
  root.querySelector("[data-settings-save]")?.addEventListener("click", () => {
    try {
      if (!key) throw new Error("This browser could not identify the account settings key.");
      localStorage.setItem(key, JSON.stringify(read()));
      announce("Settings saved in this browser.");
    } catch (error) {
      announce(error instanceof Error ? error.message : "Settings could not be saved.");
    }
  });
  root.querySelector("[data-settings-reset]")?.addEventListener("click", () => {
    apply(defaults);
    announce("Defaults restored in this form. Save settings to keep them.");
  });
  root.querySelector("[data-settings-export]")?.addEventListener("click", () => {
    try {
      const value = read();
      const payload = { exported_at: new Date().toISOString(), user_id: host?.dataset.settingsUserId || undefined, settings: value };
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "scheduler_settings_" + new Date().toISOString().slice(0, 10) + ".json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      announce("Settings exported.");
    } catch (error) {
      announce(error instanceof Error ? error.message : "Settings could not be exported.");
    }
  });
  root.querySelector("[data-settings-import]")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 100_000) {
      announce("Settings file is too large.");
      event.target.value = "";
      return;
    }
    try {
      const imported = JSON.parse(await file.text());
      const parsed = sanitize(imported.settings || imported);
      apply(sanitize({ ...read(), ...parsed }));
      announce("Settings imported into this form. Save settings to keep them.");
    } catch (error) {
      announce(error instanceof Error ? error.message : "Settings file could not be read.");
    } finally {
      event.target.value = "";
    }
  });
})();
