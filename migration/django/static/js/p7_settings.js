(() => {
  "use strict";

  const root = document.querySelector("[data-settings-root]");
  if (!root) return;

  const key = root.dataset.settingsKey || "";
  const status = root.querySelector("[data-settings-status]");
  const statusWrap = root.querySelector("[data-settings-status-wrap]");
  const saveButton = root.querySelector("[data-settings-save]");
  const discardButton = root.querySelector("[data-settings-discard]");
  const dirtyBadge = root.querySelector("[data-settings-dirty]");
  const weekdayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const weekdayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const defaults = {
    defaultDuration: 60,
    defaultReminderMinutes: 15,
    workingHours: { start: "09:00", end: "17:00" },
    workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    defaultView: "month",
    weekStartsOn: 1,
    showWeekends: true,
    compactView: false,
  };
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const allowedDays = new Set(weekdayKeys);
  const allowedReminders = new Set([0, 5, 10, 15, 30, 60, 1440]);
  let savedState = clone(defaults);
  let hasReadProblem = false;
  let hasSavedValue = false;

  function setStatus(message, type) {
    if (!status) return;
    status.textContent = message;
    status.dataset.state = type || "info";
    status.className = "text-sm " + (type === "error" ? "text-red-700" : type === "success" ? "text-emerald-800" : "text-text-secondary");
    if (statusWrap) {
      statusWrap.classList.toggle("border-red-200", type === "error");
      statusWrap.classList.toggle("bg-red-50", type === "error");
      statusWrap.classList.toggle("border-emerald-200", type === "success");
      statusWrap.classList.toggle("bg-emerald-50", type === "success");
    }
  }

  function validTime(value) {
    return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
  }

  function normalize(raw, base) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Settings must be a JSON object.");
    const value = clone(base || defaults);
    const errors = {};
    const has = (name) => Object.prototype.hasOwnProperty.call(raw, name);

    if (has("defaultDuration")) {
      if (!Number.isInteger(raw.defaultDuration) || raw.defaultDuration < 15 || raw.defaultDuration > 10080 || raw.defaultDuration % 15 !== 0) {
        errors.defaultDuration = "Choose a duration from 15 to 10,080 minutes in 15-minute steps.";
      } else value.defaultDuration = raw.defaultDuration;
    }
    if (has("defaultReminderMinutes")) {
      if (!allowedReminders.has(raw.defaultReminderMinutes)) errors.defaultReminderMinutes = "Choose one of the listed reminder intervals.";
      else value.defaultReminderMinutes = raw.defaultReminderMinutes;
    }
    if (has("workingHours")) {
      const hours = raw.workingHours;
      if (!hours || typeof hours !== "object" || Array.isArray(hours)) {
        errors["workingHours.start"] = "Enter a valid start time.";
        errors["workingHours.end"] = "Enter a valid end time.";
      } else {
        if (hasTime(hours.start)) value.workingHours.start = hours.start;
        else errors["workingHours.start"] = "Enter a valid time in 24-hour format.";
        if (hasTime(hours.end)) value.workingHours.end = hours.end;
        else errors["workingHours.end"] = "Enter a valid time in 24-hour format.";
        if (!errors["workingHours.start"] && !errors["workingHours.end"] && hours.end <= hours.start) {
          errors["workingHours.end"] = "End time must be later than start time.";
        }
      }
    }
    if (has("workingDays")) {
      if (!Array.isArray(raw.workingDays) || raw.workingDays.length > 7 || raw.workingDays.some((day) => !allowedDays.has(day))) {
        errors.workingDays = "Choose valid working days.";
      } else {
        value.workingDays = [...new Set(raw.workingDays)];
      }
    }
    if (has("defaultView")) {
      if (!["month", "week"].includes(raw.defaultView)) errors.defaultView = "Choose Month or Week.";
      else value.defaultView = raw.defaultView;
    }
    if (has("weekStartsOn")) {
      const start = typeof raw.weekStartsOn === "string" ? Number(raw.weekStartsOn) : raw.weekStartsOn;
      if (![0, 1].includes(start)) errors.weekStartsOn = "Choose Sunday or Monday.";
      else value.weekStartsOn = start;
    }
    for (const name of ["showWeekends", "compactView"]) {
      if (!has(name)) continue;
      if (typeof raw[name] !== "boolean") errors[name] = "Choose on or off.";
      else value[name] = raw[name];
    }
    return { value, errors };
  }

  function hasTime(value) {
    return validTime(value);
  }

  function isValid(result) {
    return Object.keys(result.errors).length === 0;
  }

  function parsePayload(payload, base) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Settings file must contain a JSON object.");
    if (Object.prototype.hasOwnProperty.call(payload, "schema_version")) {
      if (!Number.isInteger(payload.schema_version) || payload.schema_version < 1) throw new Error("Settings file has an invalid schema version.");
      if (payload.schema_version > 1) throw new Error("This settings file uses a newer format. Update VoiceForm before importing it.");
    }
    if (Object.prototype.hasOwnProperty.call(payload, "schema_version") && !Object.prototype.hasOwnProperty.call(payload, "settings")) {
      throw new Error("Settings file is missing its settings object.");
    }
    const raw = Object.prototype.hasOwnProperty.call(payload, "settings") ? payload.settings : payload;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Settings file must contain a settings object.");
    const result = normalize(raw, base || defaults);
    if (!isValid(result)) throw new Error(Object.values(result.errors)[0]);
    return result.value;
  }

  function readControls() {
    const get = (name) => root.querySelector('[data-setting="' + name + '"]');
    const duration = get("defaultDuration");
    const reminder = get("defaultReminderMinutes");
    const start = get("workingHours.start");
    const end = get("workingHours.end");
    const view = get("defaultView");
    const weekStart = get("weekStartsOn");
    return {
      defaultDuration: duration && duration.value !== "" ? Number(duration.value) : NaN,
      defaultReminderMinutes: reminder ? Number(reminder.value) : defaults.defaultReminderMinutes,
      workingHours: { start: start ? start.value : "", end: end ? end.value : "" },
      workingDays: [...root.querySelectorAll("[data-setting-array=workingDays]:checked")].map((control) => control.value),
      defaultView: view ? view.value : defaults.defaultView,
      weekStartsOn: weekStart ? Number(weekStart.value) : defaults.weekStartsOn,
      showWeekends: Boolean(root.querySelector('[data-setting="showWeekends"]')?.checked),
      compactView: Boolean(root.querySelector('[data-setting="compactView"]')?.checked),
    };
  }

  function apply(value) {
    root.querySelectorAll("[data-setting]").forEach((control) => {
      const path = control.dataset.setting.split(".");
      let result = value;
      for (const part of path) result = result && result[part];
      if (control.type === "checkbox") control.checked = Boolean(result);
      else if (result !== undefined && result !== null) control.value = String(result);
    });
    root.querySelectorAll("[data-setting-array]").forEach((control) => {
      control.checked = Array.isArray(value[control.dataset.settingArray]) && value[control.dataset.settingArray].includes(control.value);
    });
  }

  function showErrors(errors) {
    root.querySelectorAll("[data-settings-error]").forEach((item) => {
      const message = errors[item.dataset.settingsError] || "";
      item.textContent = message;
      item.hidden = !message;
      const control = root.querySelector('[data-setting="' + item.dataset.settingsError + '"]');
      if (control) {
        if (message) control.setAttribute("aria-invalid", "true");
        else control.removeAttribute("aria-invalid");
      }
      if (item.dataset.settingsError === "workingDays") {
        root.querySelectorAll('[data-setting-array="workingDays"]').forEach((box) => {
          if (message) box.setAttribute("aria-invalid", "true");
          else box.removeAttribute("aria-invalid");
        });
      }
    });
  }

  function same(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  function updateDirty(result) {
    const dirty = !isValid(result) || !same(result.value, savedState);
    if (dirtyBadge) dirtyBadge.hidden = !dirty;
    if (discardButton) discardButton.disabled = !dirty;
    if (saveButton) saveButton.disabled = !dirty || !key;
    return dirty;
  }

  function minutesLabel(minutes) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (!hours) return rest + " min";
    return hours + " hr" + (rest ? " " + rest + " min" : "");
  }

  function localDateLabel(date, options) {
    return new Intl.DateTimeFormat(undefined, options).format(date);
  }

  function localZoneLabel() {
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return zone ? zone.replaceAll("_", " ") : "Device time";
    } catch {
      return "Device time";
    }
  }

  function dateOnly(year, month, day) {
    return new Date(year, month, day, 12, 0, 0, 0);
  }

  function renderPreview(settings) {
    const weekdays = root.querySelector("[data-preview-weekdays]");
    const calendar = root.querySelector("[data-preview-calendar]");
    if (!weekdays || !calendar) return;
    const weekStart = settings.weekStartsOn;
    const orderedWeekdays = Array.from({ length: 7 }, (_, index) => (weekStart + index) % 7)
      .filter((day) => settings.showWeekends || (day !== 0 && day !== 6));
    calendar.classList.toggle("grid-cols-5", !settings.showWeekends);
    calendar.classList.toggle("grid-cols-7", settings.showWeekends);
    weekdays.replaceChildren();
    for (const day of orderedWeekdays) {
      const weekday = document.createElement("span");
      weekday.textContent = weekdayLabels[day].slice(0, 2);
      weekdays.append(weekday);
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    let first;
    let count;
    if (settings.defaultView === "week") {
      const offset = (now.getDay() - weekStart + 7) % 7;
      first = new Date(now);
      first.setDate(now.getDate() - offset);
      count = 7;
    } else {
      const monthFirst = dateOnly(now.getFullYear(), now.getMonth(), 1);
      const offset = (monthFirst.getDay() - weekStart + 7) % 7;
      first = dateOnly(now.getFullYear(), now.getMonth(), 1 - offset);
      const monthDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      count = Math.ceil((offset + monthDays) / 7) * 7;
    }

    const workingDayIndexes = settings.workingDays.map((day) => weekdayKeys.indexOf(day));
    let eventDate = null;
    for (let i = 0; i < count; i += 1) {
      const date = new Date(first);
      date.setDate(first.getDate() + i);
      const inCurrentMonth = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      if (workingDayIndexes.includes(date.getDay()) && (settings.defaultView === "week" || (inCurrentMonth && date >= now))) {
        eventDate = date;
        break;
      }
    }
    if (!eventDate) {
      for (let i = 0; i < count; i += 1) {
        const date = new Date(first);
        date.setDate(first.getDate() + i);
        if (workingDayIndexes.includes(date.getDay())) { eventDate = date; break; }
      }
    }

    calendar.replaceChildren();
    for (let i = 0; i < count; i += 1) {
      const date = new Date(first);
      date.setDate(first.getDate() + i);
      const outsideMonth = date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear();
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      if (isWeekend && !settings.showWeekends) continue;
      const tile = document.createElement("div");
      tile.className = "min-h-10 rounded-md border border-border p-1 text-center text-xs " + (outsideMonth && settings.defaultView === "month" ? "bg-surface-subtle text-text-muted " : "bg-white text-text-primary ");
      tile.setAttribute("aria-label", localDateLabel(date, { weekday: "long", month: "long", day: "numeric" }) + (sameDay(date, eventDate) ? "; example event" : ""));
      const time = document.createElement("time");
      time.dateTime = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
      time.textContent = String(date.getDate());
      if (sameDay(date, eventDate)) time.className = "inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-700 font-semibold text-white";
      tile.append(time);
      if (sameDay(date, eventDate)) {
        const marker = document.createElement("span");
        marker.className = "mt-1 block truncate rounded bg-blue-100 px-0.5 text-[8px] font-medium text-blue-900";
        marker.textContent = "Example";
        tile.append(marker);
      }
      calendar.append(tile);
    }

    const title = root.querySelector("[data-preview-title]");
    const zone = root.querySelector("[data-preview-zone]");
    const eventTime = root.querySelector("[data-preview-event-time]");
    const reminder = root.querySelector("[data-preview-reminder]");
    const hours = root.querySelector("[data-preview-hours]");
    const days = root.querySelector("[data-preview-days]");
    const eventCard = root.querySelector("[data-preview-event]");
    if (title) title.textContent = settings.defaultView === "week" ? "Example week" : localDateLabel(now, { month: "long", year: "numeric" });
    if (zone) zone.textContent = localZoneLabel();
    if (eventTime) eventTime.textContent = eventDate ? localDateLabel(eventDate, { weekday: "short", month: "short", day: "numeric" }) + " · " + settings.workingHours.start + " · " + minutesLabel(settings.defaultDuration) : "No sample event — no working days selected";
    const eventName = root.querySelector("[data-preview-event-name]");
    if (eventName) eventName.textContent = eventDate ? "Example intake review" : "Availability example";
    if (reminder) reminder.textContent = settings.defaultReminderMinutes === 0 ? "No reminder in this example" : minutesLabel(settings.defaultReminderMinutes) + " before";
    if (hours) hours.textContent = settings.workingHours.start + "–" + settings.workingHours.end;
    if (days) days.textContent = settings.workingDays.length ? settings.workingDays.map((day) => weekdayLabels[weekdayKeys.indexOf(day)]).join(", ") : "No working days selected";
    if (eventCard) {
      eventCard.classList.toggle("p-2", settings.compactView);
      eventCard.classList.toggle("p-3", !settings.compactView);
    }
  }

  function sameDay(left, right) {
    return Boolean(left && right && left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate());
  }

  function refreshFromControls() {
    const result = normalize(readControls(), defaults);
    showErrors(result.errors);
    const dirty = updateDirty(result);
    if (isValid(result)) {
      renderPreview(result.value);
      if (dirty) setStatus("Unsaved changes. The example preview updates locally.", "info");
      else setStatus("Saved on this device. Changes preview only.", "success");
    } else {
      if (Object.keys(result.errors).includes("defaultReminderMinutes")) result.errors.defaultReminderMinutes = "Choose one of the listed reminder intervals.";
      setStatus("Fix the highlighted fields before saving.", "error");
    }
    return result;
  }

  const storedValue = (() => {
    if (!key) {
      hasReadProblem = true;
      setStatus("This browser could not identify the local settings key. Preferences can be previewed but not saved.", "error");
      return clone(defaults);
    }
    try {
      const stored = window.localStorage.getItem(key);
      if (stored) {
        hasSavedValue = true;
        return parsePayload(JSON.parse(stored), defaults);
      }
      return clone(defaults);
    } catch (error) {
      hasReadProblem = true;
      const message = error instanceof Error ? error.message : "Saved preferences could not be read.";
      setStatus("Saved settings could not be read (" + message + "). Defaults are shown; Save will replace the unreadable value.", "error");
      return clone(defaults);
    }
  })();

  savedState = clone(storedValue);
  apply(storedValue);
  renderPreview(storedValue);
  if (!hasReadProblem) {
    setStatus(
      hasSavedValue ? "Saved settings loaded from this browser. Changes preview only." : "Using local defaults. Changes preview only.",
      hasSavedValue ? "success" : "info",
    );
  }

  const tabs = [...root.querySelectorAll("[data-settings-tab-button]")];
  const panels = [...root.querySelectorAll("[data-settings-panel]")];
  const tabList = root.querySelector('[role="tablist"]');
  const desktopTabs = window.matchMedia("(min-width: 1024px)");
  const updateOrientation = () => tabList?.setAttribute("aria-orientation", desktopTabs.matches ? "vertical" : "horizontal");
  const selectTab = (button, moveFocus) => {
    const selected = button.dataset.settingsTabButton;
    tabs.forEach((item) => {
      const active = item === button;
      item.setAttribute("aria-selected", String(active));
      item.tabIndex = active ? 0 : -1;
      item.classList.toggle("border", active);
      item.classList.toggle("border-blue-200", active);
      item.classList.toggle("bg-blue-50", active);
      item.classList.toggle("text-blue-800", active);
      item.classList.toggle("font-semibold", active);
      item.classList.toggle("text-text-primary", !active);
      item.classList.toggle("font-medium", !active);
      if (active && moveFocus) item.focus();
    });
    panels.forEach((panel) => {
      const active = panel.dataset.settingsPanel === selected;
      panel.hidden = !active;
      panel.classList.toggle("hidden", !active);
    });
  };
  tabs.forEach((button) => {
    const panel = panels.find((item) => item.dataset.settingsPanel === button.dataset.settingsTabButton);
    button.id = "scheduler-settings-tab-" + button.dataset.settingsTabButton;
    if (panel) {
      panel.id = "scheduler-settings-panel-" + panel.dataset.settingsPanel;
      button.setAttribute("aria-controls", panel.id);
      panel.setAttribute("aria-labelledby", button.id);
      panel.tabIndex = 0;
    }
    button.addEventListener("click", () => selectTab(button, false));
  });
  if (tabs.length) selectTab(tabs.find((button) => button.getAttribute("aria-selected") === "true") || tabs[0], false);
  updateOrientation();
  if (desktopTabs.addEventListener) desktopTabs.addEventListener("change", updateOrientation);
  else desktopTabs.addListener(updateOrientation);
  tabList?.addEventListener("keydown", (event) => {
    const current = tabs.indexOf(document.activeElement);
    if (current < 0 || !tabs.length) return;
    let next = current;
    if (desktopTabs.matches && event.key === "ArrowDown") next = (current + 1) % tabs.length;
    else if (desktopTabs.matches && event.key === "ArrowUp") next = (current - 1 + tabs.length) % tabs.length;
    else if (!desktopTabs.matches && event.key === "ArrowRight") next = (current + 1) % tabs.length;
    else if (!desktopTabs.matches && event.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    selectTab(tabs[next], true);
  });

  root.querySelectorAll("[data-setting], [data-setting-array]").forEach((control) => {
    control.addEventListener("input", refreshFromControls);
    control.addEventListener("change", refreshFromControls);
  });

  saveButton?.addEventListener("click", () => {
    const result = refreshFromControls();
    if (!isValid(result)) {
      const firstError = Object.keys(result.errors)[0];
      const control = root.querySelector('[data-setting="' + firstError + '"]') || root.querySelector('[data-setting-array="workingDays"]');
      const tabPanel = control?.closest("[data-settings-panel]");
      if (tabPanel) {
        const tab = tabs.find((item) => item.dataset.settingsTabButton === tabPanel.dataset.settingsPanel);
        if (tab) selectTab(tab, false);
      }
      control?.focus();
      return;
    }
    if (!key) return;
    try {
      window.localStorage.setItem(key, JSON.stringify({ schema_version: 1, settings: result.value }));
      savedState = clone(result.value);
      hasReadProblem = false;
      hasSavedValue = true;
      updateDirty(result);
      setStatus("Settings saved in this browser on this device.", "success");
    } catch (error) {
      setStatus(error instanceof Error ? "Settings could not be saved: " + error.message : "Settings could not be saved in this browser.", "error");
    }
  });

  discardButton?.addEventListener("click", () => {
    apply(savedState);
    showErrors({});
    renderPreview(savedState);
    updateDirty({ value: clone(savedState), errors: {} });
    setStatus("Unsaved changes discarded.", "success");
  });

  root.querySelector("[data-settings-reset]")?.addEventListener("click", () => {
    const current = normalize(readControls(), defaults);
    if (updateDirty(current) && !window.confirm("Reset this draft to defaults? Your saved preferences will stay unchanged until you save.")) return;
    apply(defaults);
    showErrors({});
    renderPreview(defaults);
    const result = { value: clone(defaults), errors: {} };
    updateDirty(result);
    setStatus(same(savedState, defaults) ? "Default preferences are already selected." : "Default values are in the draft. Save settings to keep them.", "info");
  });

  root.querySelector("[data-settings-export]")?.addEventListener("click", () => {
    const result = refreshFromControls();
    if (!isValid(result)) return;
    const blob = new Blob([JSON.stringify({ schema_version: 1, settings: result.value }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "scheduler-settings-" + new Date().toISOString().slice(0, 10) + ".json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setStatus("Settings exported. The file contains preference values only.", "success");
  });

  root.querySelector("[data-settings-import]")?.addEventListener("change", async (event) => {
    const input = event.currentTarget;
    const file = input.files && input.files[0];
    if (!file) return;
    if (file.size > 100000) {
      setStatus("Settings file is too large. Choose a file smaller than 100 KB.", "error");
      input.value = "";
      return;
    }
    try {
      const payload = JSON.parse(await file.text());
      const current = normalize(readControls(), defaults);
      const imported = parsePayload(payload, isValid(current) ? current.value : savedState);
      apply(imported);
      showErrors({});
      renderPreview(imported);
      const result = { value: imported, errors: {} };
      updateDirty(result);
      setStatus("Settings imported into the draft. Review it, then save to keep the changes.", "success");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Settings file could not be read.", "error");
    } finally {
      input.value = "";
    }
  });

  window.addEventListener("beforeunload", (event) => {
    const result = normalize(readControls(), defaults);
    if (updateDirty(result)) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
})();
