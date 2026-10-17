(() => {
  "use strict";

  document.querySelectorAll("[data-activity-remove]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      if (!window.confirm("Remove this entry from your activity history?")) {
        event.preventDefault();
      }
    });
  });
})();
