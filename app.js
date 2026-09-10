const APPROVED_DATA_SOURCES = [
  "data/app_data/customer_city_aggregates.csv",
  "data/app_data/customer_segment_city_aggregates.csv",
  "data/app_data/historical_sales_weekly_deduplicated.csv",
];

const routes = new Set(["home", "simulator", "cities"]);

function currentRoute() {
  const route = window.location.hash.replace("#", "");
  return routes.has(route) ? route : "home";
}

function renderRoute() {
  const route = currentRoute();
  document.querySelectorAll("[data-view]").forEach((view) => {
    view.hidden = view.dataset.view !== route;
  });
  document.querySelectorAll("[data-route-link]").forEach((link) => {
    link.toggleAttribute("aria-current", link.dataset.routeLink === route);
  });
  document.title = `${route === "home" ? "Accueil" : route === "simulator" ? "Scénarios ROI" : "Priorisation villes"} — LUMEN`;
}

async function checkApprovedDataSources() {
  const statuses = document.querySelectorAll("[data-data-status]");
  try {
    const responses = await Promise.all(APPROVED_DATA_SOURCES.map((source) => fetch(source)));
    if (responses.some((response) => !response.ok)) {
      throw new Error("A required application data source could not be loaded.");
    }
    statuses.forEach((status) => {
      status.textContent = "Sources agrégées prêtes";
    });
  } catch {
    statuses.forEach((status) => {
      status.textContent = "Données à charger via serveur local";
    });
  }
}

window.addEventListener("hashchange", renderRoute);
window.addEventListener("DOMContentLoaded", () => {
  if (!window.location.hash || !routes.has(window.location.hash.slice(1))) {
    window.location.hash = "#home";
  }
  renderRoute();
  checkApprovedDataSources();
});
