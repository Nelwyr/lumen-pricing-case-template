import { initialiseSimulator } from "./simulator-ui.js";

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
    if (link.dataset.routeLink === route) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document.title = `${route === "home" ? "Home" : route === "simulator" ? "ROI scenarios" : "City prioritisation"} — LUMEN`;
}

async function checkApprovedDataSources() {
  const statuses = document.querySelectorAll("[data-data-status]");
  try {
    const responses = await Promise.all(APPROVED_DATA_SOURCES.map((source) => fetch(source)));
    if (responses.some((response) => !response.ok)) {
      throw new Error("A required application data source could not be loaded.");
    }
    statuses.forEach((status) => {
      status.textContent = "Aggregated data sources ready";
    });
  } catch {
    statuses.forEach((status) => {
      status.textContent = "Unable to load data. Serve the app through a local web server.";
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
  initialiseSimulator();
});
