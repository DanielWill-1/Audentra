(() => {
  "use strict";

  const root = document.querySelector("[data-activity-root]");
  if (!root) return;
  const key = root.dataset.activityKey || "";
  const list = root.querySelector("[data-activity-list]");
  const filter = root.querySelector("[data-activity-filter]");
  const status = root.querySelector("[data-activity-status]");
  const types = {
    form_completed: "Form Completed",
    template_created: "Template Created",
    team_invite: "Team Invitation",
    template_shared: "Template Shared",
    form_started: "Form Started",
    template_reviewed: "Template Reviewed",
  };
  const presentation = {
    form_completed: { status: "Completed", box: "bg-green-50 border-green-200", badge: "bg-green-100 text-green-800", icon: "text-green-600", symbol: "check-circle" },
    template_created: { status: "Created", box: "bg-blue-50 border-blue-200", badge: "bg-blue-100 text-blue-800", icon: "text-blue-600", symbol: "file-text" },
    team_invite: { status: "Joined", box: "bg-purple-50 border-purple-200", badge: "bg-purple-100 text-purple-800", icon: "text-purple-600", symbol: "users" },
    template_shared: { status: "Shared", box: "bg-emerald-50 border-emerald-200", badge: "bg-emerald-100 text-emerald-800", icon: "text-emerald-600", symbol: "share-2" },
    form_started: { status: "In Progress", box: "bg-orange-50 border-orange-200", badge: "bg-orange-100 text-orange-800", icon: "text-orange-600", symbol: "clock" },
    template_reviewed: { status: "Reviewed", box: "bg-indigo-50 border-indigo-200", badge: "bg-indigo-100 text-indigo-800", icon: "text-indigo-600", symbol: "message-square" },
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
  let storageError = false;
  let storageErrorMessage = "";

  function seedExamples() {
    return samples.map(([id, type, title, description, hours]) => ({
      id,
      type,
      title,
      description,
      time: new Date(Date.now() - Number(hours) * 60 * 60 * 1000).toISOString(),
      user: id === "4" ? "System" : id === "6" ? "Alex Chen" : id === "7" ? "Maria Johnson" : "You",
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
    storageError = false;
    storageErrorMessage = "";
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        const parsed = validItems(JSON.parse(saved));
        if (parsed) return parsed;
      }
      const initial = seedExamples();
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    } catch {
      storageError = true;
      storageErrorMessage = "Activity could not be read from this browser. Check local storage and refresh.";
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
      storageError = true;
      storageErrorMessage = "Activity could not be saved in this browser.";
      announce("Activity could not be saved in this browser.");
      return false;
    }
  }
  function timeLabel(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  function icon(name, className) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", className);
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "/static/icons/sprite.svg#icon-" + name);
    svg.append(use);
    return svg;
  }
  function metadata(iconName, value) {
    const detail = document.createElement("span");
    detail.className = "flex items-center";
    detail.append(icon(iconName, "mr-1 h-4 w-4"), document.createTextNode(value));
    return detail;
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
      const cutoff = new Date();
      if (range === "today") cutoff.setHours(0, 0, 0, 0);
      if (range === "week") cutoff.setDate(cutoff.getDate() - 7);
      if (range === "month") cutoff.setMonth(cutoff.getMonth() - 1);
      if (time < cutoff) return false;
    }
    return true;
  }
  function render() {
    if (!list) return;
    list.replaceChildren();
    const visible = items.filter(matches);
    const count = root.querySelector("[data-activity-count]");
    const listHeading = root.querySelector("[data-activity-list-heading]");
    if (count) count.textContent = visible.length + (visible.length === 1 ? " activity" : " activities");
    if (listHeading) listHeading.hidden = !visible.length;
    visible.forEach((item) => {
      const row = document.createElement("article");
      row.className = "p-6 transition-colors hover:bg-gray-50";
      const layout = document.createElement("div");
      layout.className = "flex items-start justify-between gap-4";
      const content = document.createElement("div");
      content.className = "flex min-w-0 flex-1 items-start gap-4";
      const style = presentation[item.type] || {
        status: "Updated",
        box: "bg-gray-50 border-gray-200",
        badge: "bg-gray-100 text-gray-800",
        icon: "text-gray-600",
        symbol: "file-text",
      };
      const iconBox = document.createElement("div");
      iconBox.className = "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg " + style.box;
      iconBox.append(icon(style.symbol, "h-5 w-5 " + style.icon));
      const body = document.createElement("div");
      body.className = "min-w-0 flex-1";
      const heading = document.createElement("h3");
      heading.className = "min-w-0 break-words text-lg font-semibold text-gray-900";
      heading.textContent = item.title;
      const headingRow = document.createElement("div");
      headingRow.className = "mb-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1";
      const badge = document.createElement("span");
      badge.className = "shrink-0 rounded-full px-2 py-1 text-xs " + style.badge;
      badge.textContent = style.status;
      headingRow.append(heading, badge);
      const description = document.createElement("p");
      description.className = "mb-2 text-gray-600";
      description.textContent = item.description || "";
      const details = document.createElement("p");
      details.className = "mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500";
      details.textContent = timeLabel(item.time) + " · " + item.user + " · " + (types[item.type] || item.type);
      details.replaceChildren(
        metadata("clock", timeLabel(item.time)),
        metadata("users", item.user),
        metadata("file-text", types[item.type] || item.type),
      );
      body.append(headingRow, description, details);
      content.append(iconBox, body);
      const actions = document.createElement("div");
      actions.className = "flex shrink-0 items-center gap-2";
      actions.setAttribute("data-activity-actions", "");
      if (item.type === "form_completed" || item.type === "form_started") {
        const inactive = document.createElement("button");
        inactive.type = "button";
        inactive.className = "rounded-md p-2 text-gray-400 transition-colors hover:text-blue-600";
        inactive.setAttribute("aria-label", item.type === "form_completed" ? "Download (unavailable)" : "Continue (unavailable)");
        inactive.title = item.type === "form_completed" ? "Download" : "Continue";
        inactive.setAttribute("aria-disabled", "true");
        inactive.append(icon(item.type === "form_completed" ? "download" : "clock", "h-4 w-4"));
        actions.append(inactive);
      }
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "rounded-md p-2 text-gray-400 transition-colors hover:text-red-600";
      remove.title = "Delete";
      remove.setAttribute("aria-label", "Delete " + item.title);
      remove.append(icon("trash-2", "h-4 w-4"));
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
      layout.append(content, actions);
      row.append(layout);
      list.append(row);
    });
    if (!visible.length) {
      const empty = document.createElement("div");
      empty.className = "py-12 text-center";
      empty.append(icon("clock", "mx-auto mb-4 h-12 w-12 text-gray-400"));
      const emptyTitle = document.createElement("h3");
      emptyTitle.className = "mb-2 text-lg font-medium text-gray-900";
      emptyTitle.textContent = "No activity found";
      const emptyMessage = document.createElement("p");
      emptyMessage.className = "mb-6 text-gray-600";
      const data = new FormData(filter);
      const hasFilter = Boolean(String(data.get("q") || ""))
        || String(data.get("type") || "all") !== "all"
        || String(data.get("range") || "all") !== "all";
      emptyMessage.textContent = hasFilter
        ? "Try adjusting your filters to see more results"
        : "Start using the platform to see your activity here";
      const returnLink = document.createElement("a");
      returnLink.className = "inline-flex items-center rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700";
      returnLink.href = "/dashboard";
      returnLink.textContent = "Return to Dashboard";
      empty.append(emptyTitle, emptyMessage, returnLink);
      list.append(empty);
    }
    if (storageError) {
      announce(storageErrorMessage);
      return;
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
