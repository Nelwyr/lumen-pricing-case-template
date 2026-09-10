import { CRITERIA, EQUAL_WEIGHTS, normaliseWeights, rankCities, reliabilityLabel } from "./city-engine.js";

const number = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
const pct = (value) => `${number.format(value * 100)}%`;
const money = (value) => `€${number.format(value / 1e6)}m`;
const names = ["Market size", "Regional growth", "Wellness density proxy"];
const element = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};

export async function initialiseCities() {
  const get = (id) => document.getElementById(id);
  const form = get("city-form");
  const controls = get("city-controls");
  const status = get("city-status");
  const error = get("city-error");
  const results = get("city-results");
  const retry = get("retry-cities");
  const inputs = CRITERIA.map((key) => get(`weight-${key}`));
  let data;
  let baseline;

  function renderDiagnostics(city) {
    get("city-diagnostic-title").textContent = `${city.city} · survey diagnostics`;
    get("city-survey-summary").textContent = `City purchase intent: ${number.format(city.purchaseIntent)}/10 · n=${city.respondentCount} · ${reliabilityLabel(city.respondentCount)}. Wellness proxy: ${city.wellnessRespondentCount} of ${city.respondentCount} respondents (${pct(city.wellnessDensity)}).`;
    const cards = data.segmentDiagnostics.filter((row) => row.city === city.city).map((row) => {
      const card = element("article", undefined, "segment-card");
      card.append(element("h3", row.segment));
      card.append(element("p", `${reliabilityLabel(row.respondentCount)} · n=${row.respondentCount}`, `reliability ${row.respondentCount < 15 ? "small-sample" : ""}`));
      card.append(element("p", row.respondentCount < 8
        ? "Too few respondents to interpret purchase intent."
        : `Purchase intent: ${number.format(row.purchaseIntent)}/10 · diagnostic only`));
      return card;
    });
    get("city-segment-diagnostics").replaceChildren(...cards);
  }

  function update() {
    if (!data) return;
    error.hidden = true;
    try {
      const weights = inputs.map((input) => input.valueAsNumber);
      const shares = normaliseWeights(weights);
      const ranked = rankCities(data.cities, weights);
      shares.forEach((share, index) => { get(`share-${CRITERIA[index]}`).textContent = pct(share); });
      get("city-weight-summary").textContent = names.map((name, index) => `${name}: ${pct(shares[index])}`).join(" · ");
      const leaders = ranked.filter((city) => city.rank === 1).map((city) => city.city);
      get("city-ranking-summary").textContent = `${leaders.join(" and ")} ${leaders.length > 1 ? "tie for first" : "ranks first"} with these weights. This is a relative priority index, not a sales or ROI forecast.`;
      const extremes = CRITERIA.map((key, index) => {
        const max = Math.max(...ranked.map((city) => city[key]));
        return `${names[index]} favours ${ranked.filter((city) => city[key] === max).map((city) => city.city).sort().join(" and ")}`;
      });
      get("city-tradeoff").textContent = `${extremes.join("; ")}. More weight on one criterion gives up influence from the others.`;
      const rows = ranked.map((city) => {
        const row = element("tr");
        row.dataset.city = city.city;
        row.append(element("td", String(city.rank), "city-rank"));
        const cityCell = element("th");
        cityCell.scope = "row";
        const button = element("button", city.city, "city-select");
        button.type = "button";
        button.setAttribute("aria-label", `Show ${city.city} survey diagnostics`);
        button.addEventListener("click", () => {
          get("city-diagnostic-select").value = city.city;
          renderDiagnostics(city);
          get("city-diagnostic-select").focus();
        });
        cityCell.append(button, element("small", `n=${city.respondentCount} · ${reliabilityLabel(city.respondentCount)}`));
        row.append(cityCell);
        const score = element("td");
        score.append(element("strong", number.format(city.score)));
        const bar = element("div", undefined, "score-bar");
        bar.setAttribute("aria-hidden", "true");
        city.contributions.forEach((value, index) => {
          const part = element("span", undefined, `criterion-${index}`);
          part.style.width = `${value}%`;
          bar.append(part);
        });
        score.append(bar, element("small", city.contributions.map((value, index) => `${names[index]} ${number.format(value)}`).join(" + ")));
        row.append(score, element("td", money(city.marketSizeEur)), element("td", pct(city.growth)), element("td", pct(city.wellnessDensity)));
        const delta = baseline.find((item) => item.city === city.city).rank - city.rank;
        row.append(element("td", delta > 0 ? `↑ ${delta}` : delta < 0 ? `↓ ${-delta}` : "—", "rank-change"));
        return row;
      });
      get("city-ranking-body").replaceChildren(...rows);
      renderDiagnostics(data.cities.find((city) => city.city === get("city-diagnostic-select").value));
      results.hidden = false;
    } catch (cause) {
      error.textContent = cause.message;
      error.hidden = false;
      results.hidden = true;
      get("city-ranking-body").replaceChildren();
      get("city-weight-summary").textContent = "No ranking until weights are valid.";
      CRITERIA.forEach((key) => { get(`share-${key}`).textContent = "—"; });
    }
  }

  async function load() {
    data = undefined;
    controls.disabled = true;
    results.hidden = true;
    retry.hidden = true;
    error.hidden = true;
    status.textContent = "Loading city data…";
    try {
      const response = await fetch("data/app_data/city_prioritisation.json");
      if (!response.ok) throw new Error("City data could not be loaded.");
      const loaded = await response.json();
      baseline = rankCities(loaded.cities, EQUAL_WEIGHTS);
      if (!Array.isArray(loaded.segmentDiagnostics)) throw new Error("Survey diagnostics are missing.");
      loaded.segmentDiagnostics.forEach((row) => reliabilityLabel(row.respondentCount));
      data = loaded;
      const select = get("city-diagnostic-select");
      select.replaceChildren(...baseline.map((city) => {
        const option = element("option", city.city);
        option.value = city.city;
        return option;
      }));
      const other = data.cities.find((city) => city.city === "Other Germany");
      get("city-other-context").textContent = other
        ? `Other Germany: ${money(other.marketSizeEur)} illustrative market, ${pct(other.growth)} growth, ${pct(other.wellnessDensity)} wellness survey share · n=${other.respondentCount} · ${reliabilityLabel(other.respondentCount)}. Kept outside the ranking because it combines multiple places, not one launch city.`
        : "Other Germany is not included in the candidate-city ranking.";
      get("city-source-context").textContent = `${data.year} functional-beverage market: ${money(data.nationalMarketEur)}. Source: Exhibit 1 regional assumptions and prepared city survey aggregates.`;
      controls.disabled = false;
      status.textContent = "City data ready";
      update();
    } catch (cause) {
      data = undefined;
      status.textContent = "City data unavailable";
      error.textContent = `${cause.message} Check the prepared data and local web server, then retry.`;
      error.hidden = false;
      retry.hidden = false;
    }
  }
  form.addEventListener("input", update);
  form.addEventListener("submit", (event) => { event.preventDefault(); update(); });
  get("city-reset-weights").addEventListener("click", () => {
    inputs.forEach((input) => { input.value = 50; });
    update();
  });
  get("city-diagnostic-select").addEventListener("change", () => {
    if (data) renderDiagnostics(data.cities.find((city) => city.city === get("city-diagnostic-select").value));
  });
  retry.addEventListener("click", load);
  await load();
}
