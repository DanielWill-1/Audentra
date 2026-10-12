(() => {
  "use strict";

  const filters = document.querySelector('form[role="search"]');
  const calendar = document.querySelector('section[aria-labelledby="calendar-title"]');
  if (!filters || !calendar) return;

  const search = filters.querySelector('[name="q"]');
  const type = filters.querySelector('[name="type"]');
  const navigation = [...calendar.querySelectorAll('a[href]')];

  function preserveFilters() {
    navigation.forEach((link) => {
      const target = new URL(link.href, window.location.href);
      target.searchParams.set("q", search?.value || "");
      target.searchParams.set("type", type?.value || "all");
      link.href = `${target.pathname}${target.search}${target.hash}`;
    });
  }

  filters.addEventListener("input", preserveFilters);
  filters.addEventListener("change", preserveFilters);
  preserveFilters();
})();
