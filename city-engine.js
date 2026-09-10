export const CRITERIA = ["marketSizeEur", "growth", "wellnessDensity"];
export const EQUAL_WEIGHTS = [1, 1, 1];

export function reliabilityLabel(count) {
  if (!Number.isInteger(count) || count < 1) throw new Error("Invalid survey sample size.");
  return count >= 15 ? "Reliable" : count >= 8 ? "Directional · small sample" : "Insufficient";
}

export function normaliseWeights(weights) {
  if (!Array.isArray(weights) || weights.length !== 3 ||
      weights.some((weight) => !Number.isFinite(weight) || weight < 0 || weight > 100)) {
    throw new Error("Each importance must be between 0 and 100.");
  }
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (!total) throw new Error("Give at least one criterion a positive importance to rank cities.");
  return weights.map((value) => value / total);
}

// Only city-level inputs enter this function. Segment diagnostics cannot affect it.
export function rankCities(cities, weights = EQUAL_WEIGHTS) {
  const shares = normaliseWeights(weights);
  const candidates = cities.filter((city) => city.city !== "Other Germany");
  if (!candidates.length) throw new Error("No candidate cities available.");
  if (new Set(candidates.map((city) => city.city)).size !== candidates.length) {
    throw new Error("Duplicate candidate cities.");
  }
  candidates.forEach((city) => {
    reliabilityLabel(city.respondentCount);
    if (city.respondentCount < 15) throw new Error(`${city.city}: city sample below n=15; ranking unavailable.`);
    if (!city.city || CRITERIA.some((key) => !Number.isFinite(city[key])) ||
        city.marketSizeEur < 0 || city.wellnessDensity < 0 || city.wellnessDensity > 1) {
      throw new Error("Incomplete or invalid city ranking data.");
    }
  });
  const bounds = CRITERIA.map((key) => {
    const values = candidates.map((city) => city[key]);
    return [Math.min(...values), Math.max(...values)];
  });
  const ranked = candidates.map((city) => {
    const normalised = CRITERIA.map((key, index) => {
      const [min, max] = bounds[index];
      return max === min ? 50 : 100 * (city[key] - min) / (max - min);
    });
    const contributions = normalised.map((value, index) => value * shares[index]);
    return { ...city, normalised, contributions, score: contributions.reduce((a, b) => a + b, 0) };
  }).sort((a, b) => b.score - a.score || a.city.localeCompare(b.city));
  ranked.forEach((city, index) => {
    city.rank = index && Math.abs(city.score - ranked[index - 1].score) < 1e-9
      ? ranked[index - 1].rank : index + 1;
  });
  return ranked;
}
