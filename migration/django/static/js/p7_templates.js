(() => {
  "use strict";

  const types = ["text", "email", "number", "date", "textarea", "select", "radio", "checkbox"];
  const createFieldId = () => {
    const randomId = (globalThis.crypto?.randomUUID?.() || "").replaceAll("-", "").slice(0, 10);
    return `field_${randomId || Date.now().toString(36) + Math.random().toString(36).slice(2, 5)}`;
  };

  function addControl(parent, tag, attributes = {}) {
    const control = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === "text") control.textContent = value;
      else if (key === "className") control.className = value;
      else if (key === "value") control.value = value;
      else if (key === "checked") control.checked = Boolean(value);
      else control.setAttribute(key, value);
    });
    parent.append(control);
    return control;
  }

  function initForm(form) {
    const list = form.querySelector("[data-fields]");
    const payload = form.querySelector("[data-form-data]");
    let originalFields = [];
    const initial = form.querySelector('script[type="application/json"]');
    if (initial?.textContent) {
      try {
        const decoded = JSON.parse(initial.textContent);
        if (Array.isArray(decoded?.fields)) originalFields = decoded.fields;
      } catch {
        originalFields = [];
      }
    }

    function serialize() {
      return [...list.children].map((row) => {
        const old = JSON.parse(row.dataset.original || "{}");
        const field = {
          ...old,
          id: row.querySelector('[data-property="id"]').value.trim(),
          label: row.querySelector('[data-property="label"]').value.trim(),
          type: row.querySelector('[data-property="type"]').value,
          required: row.querySelector('[data-property="required"]').checked,
        };
        const placeholder = row.querySelector('[data-property="placeholder"]').value;
        if (placeholder) field.placeholder = placeholder;
        else delete field.placeholder;
        if (["select", "radio"].includes(field.type)) {
          field.options = row.querySelector('[data-property="options"]').value
            .split(/\r?\n/)
            .map((value) => value.trim())
            .filter(Boolean)
            .slice(0, 100);
        }
        return field;
      });
    }

    function renderField(source = {}) {
      if (list.children.length >= 200) return;
      const row = document.createElement("fieldset");
      row.className = "grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2";
      row.dataset.original = JSON.stringify(source);
      addControl(row, "legend", { className: "sr-only", text: "Template field" });
      const id = addControl(row, "input", {
        className: "field-input",
        value: source.id || createFieldId(),
        "data-property": "id",
        "aria-label": "Field identifier",
        required: "required",
      });
      id.name = "field_identifier_preview";
      const label = addControl(row, "input", {
        className: "field-input",
        value: source.label || "",
        "data-property": "label",
        "aria-label": "Field label",
        placeholder: "Field label",
        required: "required",
      });
      label.name = "field_label_preview";
      const type = document.createElement("select");
      type.className = "field-input";
      type.setAttribute("aria-label", "Field type");
      type.dataset.property = "type";
      types.forEach((value) => addControl(type, "option", { value, text: value }));
      type.value = types.includes(source.type) ? source.type : "text";
      row.append(type);
      const placeholder = addControl(row, "input", {
        className: "field-input",
        value: source.placeholder || "",
        "data-property": "placeholder",
        "aria-label": "Placeholder",
        placeholder: "Placeholder (optional)",
      });
      placeholder.name = "field_placeholder_preview";
      const requiredLabel = document.createElement("label");
      requiredLabel.className = "flex items-center gap-2 text-sm";
      const required = addControl(requiredLabel, "input", {
        type: "checkbox",
        checked: Boolean(source.required),
        "data-property": "required",
      });
      required.setAttribute("aria-label", "Required field");
      requiredLabel.append(document.createTextNode("Required"));
      row.append(requiredLabel);

      const options = addControl(row, "textarea", {
        className: "field-input sm:col-span-2",
        "data-property": "options",
        "aria-label": "Options, one per line",
        rows: "2",
        placeholder: "Options, one per line",
      });
      options.value = Array.isArray(source.options) ? source.options.join("\n") : "";
      options.name = "field_options_preview";
      options.hidden = !["select", "radio"].includes(type.value);
      type.addEventListener("change", () => {
        options.hidden = !["select", "radio"].includes(type.value);
      });

      const actions = document.createElement("div");
      actions.className = "flex flex-wrap gap-2 sm:col-span-2";
      [["↑", "Move up"], ["↓", "Move down"], ["Remove", "Remove field"]].forEach(([text, labelText]) => {
        const button = addControl(actions, "button", { type: "button", className: "button-secondary", text });
        button.setAttribute("aria-label", labelText);
        button.addEventListener("click", () => {
          if (labelText === "Remove field") row.remove();
          else if (labelText === "Move up" && row.previousElementSibling) {
            list.insertBefore(row, row.previousElementSibling);
          } else if (labelText === "Move down" && row.nextElementSibling) {
            list.insertBefore(row.nextElementSibling, row);
          }
          sync();
        });
      });
      row.append(actions);
      list.append(row);
    }

    function sync() {
      payload.value = JSON.stringify({ fields: serialize() });
    }

    const dialog = form.closest("dialog[data-template-dialog]");
    if (dialog) {
      const opener = document.querySelector('[data-template-dialog-open]');
      const close = dialog.querySelector("[data-template-dialog-close]");
      const setExpanded = (expanded) => opener?.setAttribute("aria-expanded", String(expanded));
      opener?.addEventListener("click", () => {
        if (!dialog.open) dialog.showModal();
        setExpanded(true);
      });
      close?.addEventListener("click", () => dialog.close());
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
      });
      dialog.addEventListener("close", () => {
        setExpanded(false);
        opener?.focus();
      });
      if (window.location.hash === `#${dialog.id}`) {
        dialog.showModal();
        setExpanded(true);
      }
    }

    if (form.dataset.templateFlow === "true") {
      const steps = [...form.querySelectorAll("[data-template-step]")];
      const labels = [...form.querySelectorAll("[data-step-label]")];
      const back = form.querySelector("[data-template-back]");
      const next = form.querySelector("[data-template-next]");
      const save = form.querySelector("[data-template-save]");
      const status = form.querySelector("[data-template-flow-status]");
      const file = form.querySelector('[name="template_file"]');
      let currentStep = 1;

      function announce(message) {
        if (status) status.textContent = message;
      }

      function updateCreationPath() {
        const method = form.querySelector('[name="creation_method"]:checked')?.value || "";
        const manual = form.querySelector('[data-template-path="manual"]');
        const upload = form.querySelector('[data-template-path="upload"]');
        if (manual) manual.hidden = currentStep !== 3 || method !== "manual";
        if (upload) upload.hidden = currentStep !== 3 || method !== "upload";
        if (file) file.required = currentStep === 3 && method === "upload";
        if (method === "manual") announce("Build fields manually. Add at least one field before saving.");
        else if (method === "upload") announce("The private source file is stored as an attachment; its contents are not converted into fields.");
      }

      function setStep(step) {
        currentStep = step;
        steps.forEach((panel) => { panel.hidden = Number(panel.dataset.templateStep) !== step; });
        labels.forEach((label) => {
          const active = Number(label.dataset.stepLabel) === step;
          if (active) label.setAttribute("aria-current", "step");
          else label.removeAttribute("aria-current");
          label.classList.toggle("font-medium", active);
          label.classList.toggle("text-text-secondary", !active);
        });
        if (back) back.hidden = step === 1;
        if (next) next.hidden = step === 3;
        if (save) save.hidden = step !== 3;
        updateCreationPath();
      }

      next?.addEventListener("click", () => {
        if (currentStep === 1) {
          const name = form.querySelector('[name="name"]');
          const category = form.querySelector('[name="category"]');
          if (!name.value.trim()) { name.focus(); name.reportValidity(); return; }
          if (!category.value) { category.focus(); category.reportValidity(); return; }
          announce("");
        } else if (currentStep === 2) {
          const method = form.querySelector('[name="creation_method"]:checked');
          if (!method) {
            const firstMethod = form.querySelector('[name="creation_method"]');
            firstMethod?.focus();
            announce("Choose manual builder or private file upload to continue.");
            return;
          }
        }
        setStep(Math.min(3, currentStep + 1));
      });
      back?.addEventListener("click", () => setStep(Math.max(1, currentStep - 1)));
      form.querySelectorAll('[name="creation_method"]').forEach((radio) => {
        radio.addEventListener("change", updateCreationPath);
      });
      setStep(1);
    }

    originalFields.forEach(renderField);
    form.querySelector("[data-add-field]")?.addEventListener("click", () => {
      renderField({ id: createFieldId(), label: "", type: "text", required: false });
      list.lastElementChild?.querySelector('[data-property="label"]')?.focus();
      const status = form.querySelector("[data-template-flow-status]");
      if (status?.textContent.includes("Add at least one field before creating")) status.textContent = "";
      sync();
    });
    list.addEventListener("input", sync);
    list.addEventListener("change", sync);
    form.addEventListener("submit", (event) => {
      const fields = serialize();
      if (form.dataset.templateFlow === "true") {
        const method = form.querySelector('[name="creation_method"]:checked')?.value;
        if (!method) {
          event.preventDefault();
          form.querySelector("[data-template-next]")?.click();
          return;
        }
        if (method === "manual" && fields.length === 0) {
          event.preventDefault();
          const status = form.querySelector("[data-template-flow-status]");
          if (status) status.textContent = "Add at least one field before creating a voice-enabled form.";
          form.querySelector("[data-add-field]")?.focus();
          return;
        }
        if (method === "upload" && !form.querySelector('[name="template_file"]')?.files?.length) {
          event.preventDefault();
          const file = form.querySelector('[name="template_file"]');
          file?.focus();
          file?.reportValidity();
          return;
        }
      }
      if (fields.some((field) => !field.id || !field.label)) {
        event.preventDefault();
        const invalid = [...list.querySelectorAll("input[required]")].find((item) => !item.value.trim());
        invalid?.focus();
        return;
      }
      sync();
    });
    sync();
  }

  document.querySelectorAll("[data-template-builder]").forEach(initForm);
  document.querySelector("[data-template-refresh]")?.addEventListener("click", () => window.location.reload());
  document.querySelectorAll("[data-template-results]").forEach((results) => {
    const controls = [...document.querySelectorAll("[data-template-view]")];
    const status = document.querySelector("[data-template-view-status]");
    controls.forEach((button) => {
      button.addEventListener("click", () => {
        const layout = button.dataset.templateView === "list" ? "list" : "grid";
        results.dataset.templateLayout = layout;
        results.classList.toggle("sm:grid-cols-2", layout === "grid");
        results.classList.toggle("xl:grid-cols-3", layout === "grid");
        controls.forEach((control) => control.setAttribute("aria-pressed", String(control === button)));
        if (status) status.textContent = `${layout === "grid" ? "Grid" : "List"} layout selected.`;
      });
    });
  });

  const templateActionMenus = [...document.querySelectorAll("details[data-template-actions]")];
  const templateFilterDisclosures = [...document.querySelectorAll("details[data-template-filters]")];
  const templateDismissibleDisclosures = [...templateActionMenus, ...templateFilterDisclosures];
  document.addEventListener("click", (event) => {
    templateDismissibleDisclosures.forEach((menu) => {
      if (menu.open && !menu.contains(event.target)) menu.open = false;
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const openMenu = [...templateDismissibleDisclosures].reverse().find((menu) => menu.open);
    if (!openMenu) return;
    openMenu.open = false;
    openMenu.querySelector(":scope > summary")?.focus();
  });

  const collaboration = document.querySelector("details[data-template-collaboration]");
  const openCollaborationForHash = () => {
    if (location.hash === "#collaboration" && collaboration) collaboration.open = true;
  };
  openCollaborationForHash();
  window.addEventListener("hashchange", openCollaborationForHash);
})();
