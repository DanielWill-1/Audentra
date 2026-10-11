(() => {
  "use strict";

  const types = ["text", "email", "number", "date", "textarea", "select", "radio", "checkbox"];
  const createFieldId = () =>
    "field_" + (globalThis.crypto?.randomUUID?.() || Date.now() + "_" + Math.random().toString(16).slice(2));

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

    originalFields.forEach(renderField);
    form.querySelector("[data-add-field]")?.addEventListener("click", () => {
      renderField({ id: createFieldId(), label: "", type: "text", required: false });
      list.lastElementChild?.querySelector('[data-property="label"]')?.focus();
      sync();
    });
    list.addEventListener("input", sync);
    list.addEventListener("change", sync);
    form.addEventListener("submit", (event) => {
      const fields = serialize();
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
})();
