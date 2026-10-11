(() => {
  "use strict";

  const root = document.querySelector("[data-activity-root]");
  if (!root) return;
  const key = root.dataset.activityKey || "";
  const list = root.querySelector("[data-activity-list]");
  const filter = root.querySelector("[data-activity-filter]");
  const status = root.querySelector("[data-activity-status]");
  const legacyKey = "recentActivity";
  const types = {
    form_completed: "Form completed",
    template_created: "Template created",
    team_invite: "Team invitation",
    template_shared: "Template shared",
    form_started: "Form started",
    template_reviewed: "Template reviewed",
  };
  const samples = [
    ["1", "form_completed", "Patient Intake - John Smith", "Completed in 1:34 minutes", 2],
    ["2", "form_started", "Safety Inspection Report", "Started 30 minutes ago", 0.5],
    ["3", "template_created", "HR Onboarding Template", "New template created", 4],
    ["4", "team_invite", "Alex Chen joined your team", "Accepted invitation", 24],
    ["5", "template_shared", "Patient Intake Form shared", "Shared with 2 team members", 48],
    ["6", "form_completed", "Employee Onboarding - Maria Garcia", "Completed in 2:15 minutes", 72],
    ["7", "template_reviewed", "Safety Inspection Checklist reviewed", "Approved with 5-star rating", 96],
  ];

  function seedExamples() {
    return samples.map(([id, type, title, description, hours]) => ({
      id,
      type,
      title,
      description,
      time: new Date(Date.now() - Number(hours) * 60 * 60 * 1000).toISOString(),
      user: ["4"].includes(id) ? "System" : ["6", "7"].includes(id) ? "Alex Chen" : "You",
    }));
  }
  function validItems(value) {
    return Array.isArray(value)
      ? value.filter((item) => item && typeof item === "object"
        && typeof item.id === "string" && typeof item.type === "string"
        && typeof item.title === "string" && typeof item.time === "string"
        && typeof item.user === "string").slice(0, 500)
      : null;
  }
  function load() {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        const parsed = validItems(JSON.parse(saved));
        if (parsed) return parsed;
      }
      const legacy = localStorage.getItem(legacyKey);
      const prior = legacy === null ? null : validItems(JSON.parse(legacy));
      const initial = prior || seedExamples();
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    } catch {
      announce("Activity could not be read from this browser. Check local storage and refresh.");
      return [];
    }
  }
  let items = load();
  function announce(message) {
    if (status) status.textContent = message;
  }
  function persist() {
    try {
      localStorage.setItem(key, JSON.stringify(items));
      return true;
    } catch {
      announce("Activity could not be saved in this browser.");
      return false;
    }
  }
  function timeLabel(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString();
  }
  function matches(item) {
    const data = new FormData(filter);
    const query = String(data.get("q") || "").toLocaleLowerCase();
    const type = String(data.get("type") || "all");
    const range = String(data.get("range") || "all");
    if (type !== "all" && item.type !== type) return false;
    const text = [item.title, item.description || "", item.user].join(" ").toLocaleLowerCase();
    if (query && !text.includes(query)) return false;
    if (range !== "all") {
      const time = new Date(item.time);
      if (Number.isNaN(time.getTime())) return false;
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (range === "today" && time < start) return false;
      if (range !== "today" && time < new Date(Date.now() - Number(range) * 24 * 60 * 60 * 1000)) return false;
    }
    return true;
  }
  function render() {
    if (!list) return;
    list.replaceChildren();
    const visible = items.filter(matches);
    visible.forEach((item) => {
      const row = document.createElement("article");
      row.className = "flex flex-wrap items-start justify-between gap-4 p-5";
      const body = document.createElement("div");
      body.className = "min-w-0 flex-1";
      const heading = document.createElement("h2");
      heading.className = "font-semibold";
      heading.textContent = item.title;
      const description = document.createElement("p");
      description.className = "mt-1 text-sm text-text-secondary";
      description.textContent = item.description || "";
      const details = document.createElement("p");
      details.className = "mt-3 text-xs text-text-muted";
      details.textContent = timeLabel(item.time) + " · " + item.user + " · " + (types[item.type] || item.type);
      body.append(heading, description, details);
      const actions = document.createElement("div");
      actions.className = "flex items-center gap-2";
      if (item.type === "form_completed" || item.type === "form_started") {
        const inactive = document.createElement("button");
        inactive.type = "button";
        inactive.className = "rounded-md border border-border px-3 py-2 text-sm text-text-muted";
        inactive.setAttribute("aria-label", item.type === "form_completed" ? "Download (unavailable)" : "Continue (unavailable)");
        inactive.title = item.type === "form_completed" ? "Download" : "Continue";
        inactive.textContent = item.type === "form_completed" ? "Download" : "Continue";
        actions.append(inactive);
      }
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "text-sm font-medium text-red-700 underline";
      remove.textContent = "Delete";
      remove.setAttribute("aria-label", "Delete " + item.title);
      remove.addEventListener("click", () => {
        if (!window.confirm("Delete this activity item?")) return;
        const before = items;
        items = items.filter((candidate) => candidate.id !== item.id);
        if (!persist()) {
          items = before;
          return;
        }
        render();
        announce("Activity item deleted.");
      });
      actions.append(remove);
      row.append(body, actions);
      list.append(row);
    });
    if (!visible.length) {
      const empty = document.createElement("p");
      empty.className = "p-8 text-center text-sm text-text-secondary";
      empty.textContent = items.length ? "No activity matches these filters." : "No activity found. Start using the platform to see activity here.";
      list.append(empty);
    }
    announce(visible.length + (visible.length === 1 ? " activity item shown." : " activity items shown."));
  }
  filter?.addEventListener("input", render);
  filter?.addEventListener("change", render);
  root.querySelector("[data-activity-refresh]")?.addEventListener("click", () => {
    items = load();
    render();
    announce("Activity refreshed from this browser.");
  });
  render();
})();
