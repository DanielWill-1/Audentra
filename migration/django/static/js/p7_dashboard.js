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

  const dashboardRoot = document.querySelector("[data-dashboard-activity-key]");
  const recentFormsKey = dashboardRoot?.dataset.dashboardActivityKey || "";
  const recentFormsRoot = document.querySelector("[data-dashboard-recent-forms-root]");
  const recentFormsList = recentFormsRoot?.querySelector("[data-dashboard-recent-forms]");
  const recentFormsEmpty = recentFormsRoot?.querySelector("[data-dashboard-recent-forms-empty]");
  const recentFormsStatus = recentFormsRoot?.querySelector("[data-dashboard-recent-forms-status]");

  function renderRecentForms(items) {
    if (!recentFormsList || !recentFormsEmpty) return;
    recentFormsList.replaceChildren();
    const forms = Array.isArray(items)
      ? items.filter((item) =>
        item &&
        typeof item === "object" &&
        ["form_completed", "form_started"].includes(item.type) &&
        typeof item.title === "string" &&
        item.title.trim().length > 0 &&
        item.title.length <= 180 &&
        typeof item.time === "string" &&
        Number.isFinite(Date.parse(item.time)),
      ).slice(0, 5)
      : [];

    for (const form of forms) {
      const completed = form.type === "form_completed";
      const item = document.createElement("li");
      item.className = "flex flex-wrap items-center justify-between gap-3 px-6 py-4";
      const details = document.createElement("div");
      details.className = "min-w-0";
      const title = document.createElement("p");
      title.className = "truncate font-body-medium text-body-medium font-medium text-text-primary";
      title.textContent = form.title.trim();
      const time = document.createElement("p");
      time.className = "font-metadata text-metadata text-text-muted";
      const elapsedMinutes = Math.max(0, Math.floor((Date.now() - Date.parse(form.time)) / 60000));
      const elapsedDays = Math.floor(elapsedMinutes / 1440);
      time.textContent = elapsedMinutes < 1
        ? "Just now"
        : elapsedMinutes < 60
          ? `${elapsedMinutes} minute${elapsedMinutes === 1 ? "" : "s"} ago`
          : elapsedMinutes < 1440
            ? `${Math.floor(elapsedMinutes / 60)} hour${Math.floor(elapsedMinutes / 60) === 1 ? "" : "s"} ago`
            : elapsedMinutes < 7 * 1440
              ? `${elapsedDays} day${elapsedDays === 1 ? "" : "s"} ago`
            : new Date(form.time).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
      details.append(title, time);

      const actions = document.createElement("div");
      actions.className = "flex items-center gap-3";
      const badge = document.createElement("span");
      badge.className = `rounded px-2.5 py-1 font-label-code text-label-code font-medium ${completed ? "bg-success/10 text-success" : "bg-warning/15 text-warning"}`;
      badge.textContent = completed ? "Completed" : "In Progress";
      const link = document.createElement("a");
      link.className = "font-metadata text-metadata text-primary hover:text-brand-hover";
      link.href = completed ? "/filledtemplates" : "/AIVoiceAutoFill";
      link.textContent = completed ? "View" : "Resume";
      actions.append(badge, link);
      item.append(details, actions);
      recentFormsList.append(item);
    }

    recentFormsEmpty.hidden = forms.length > 0;
  }

  if (recentFormsRoot) {
    const exampleForms = [
      {
        type: "form_completed",
        title: "Patient Intake - John Smith",
        time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        type: "form_started",
        title: "Safety Inspection Report",
        time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
      {
        type: "form_completed",
        title: "Employee Onboarding - Maria Garcia",
        time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
    try {
      const raw = recentFormsKey ? localStorage.getItem(recentFormsKey) : null;
      renderRecentForms(raw === null ? exampleForms : JSON.parse(raw));
    } catch {
      renderRecentForms([]);
      if (recentFormsStatus) recentFormsStatus.textContent = "Browser history is unavailable.";
    }
  }

  const section = document.querySelector("[data-dashboard-settings]");
  const form = section?.querySelector("[data-dashboard-preferences]");
  const status = section?.querySelector("[data-dashboard-settings-status]");
  if (!section || !form) return;

  const key = "voiceform_dashboard_settings";
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

  const announce = (text) => {
    if (status) status.textContent = text;
  };

  const read = () => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return { ...defaults };
      const parsed = validate(JSON.parse(stored));
      if (parsed) return parsed;
      announce("Saved preferences were invalid. Defaults are shown until you change a setting.");
    } catch {
      announce("Browser storage is unavailable. Changes will stay on this page.");
    }
    return { ...defaults };
  };

  const controls = Object.fromEntries(
    Object.keys(defaults).map((name) => [name, form.elements.namedItem(name)]),
  );
  const output = section.querySelector("[data-sensitivity-output]");

  const apply = (values) => {
    Object.entries(controls).forEach(([name, control]) => {
      if (control) control.value = String(values[name]);
    });
    if (output) output.value = String(values.voiceSensitivity);
  };

  apply(read());
  form.addEventListener("input", () => {
    const current = validate(Object.fromEntries(
      Object.entries(controls).map(([name, control]) => [name, control?.value]),
    ));
    if (!current) {
      announce("Choose valid values for each preference.");
      return;
    }
    if (output) output.value = String(current.voiceSensitivity);
    try {
      localStorage.setItem(key, JSON.stringify(current));
      announce("Preferences saved in this browser.");
    } catch {
      announce("Browser storage is unavailable. Changes are not saved after you leave this page.");
    }
  });
})();
