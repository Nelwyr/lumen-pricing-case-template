const REQUIRED_CHANNELS = ["DTC Online", "Retail/Grocery", "Gym & Office"];
const MIX_TOLERANCE = 1e-9;

function requirePositiveNumber(value, name) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive number.`);
  }
}

function validateMix(channelMix) {
  const suppliedChannels = Object.keys(channelMix).sort();
  const expectedChannels = [...REQUIRED_CHANNELS].sort();
  if (
    suppliedChannels.length !== expectedChannels.length ||
    suppliedChannels.some((channel, index) => channel !== expectedChannels[index])
  ) {
    throw new TypeError("channelMix must contain exactly DTC Online, Retail/Grocery, and Gym & Office.");
  }

  const mixTotal = Object.values(channelMix).reduce((total, share) => {
    if (!Number.isFinite(share) || share < 0) {
      throw new TypeError("Each channel mix share must be a non-negative number.");
    }
    return total + share;
  }, 0);
  if (Math.abs(mixTotal - 1) > MIX_TOLERANCE) {
    throw new RangeError("Channel mix shares must sum to 1.");
  }
}

function interpolateAcceptance(priceEur, curve) {
  const observedPoint = curve.find((point) => point.price_eur === priceEur);
  if (observedPoint) {
    return { acceptancePct: observedPoint.acceptance_pct, rangeStatus: "observed" };
  }
  if (priceEur < curve[0].price_eur) {
    return { acceptancePct: curve[0].acceptance_pct, rangeStatus: "clamped_low" };
  }
  const lastPoint = curve[curve.length - 1];
  if (priceEur > lastPoint.price_eur) {
    return { acceptancePct: lastPoint.acceptance_pct, rangeStatus: "clamped_high" };
  }

  const upperIndex = curve.findIndex((point) => point.price_eur >= priceEur);
  const lower = curve[upperIndex - 1];
  const upper = curve[upperIndex];
  const fraction = (priceEur - lower.price_eur) / (upper.price_eur - lower.price_eur);
  return {
    acceptancePct: lower.acceptance_pct + fraction * (upper.acceptance_pct - lower.acceptance_pct),
    rangeStatus: "interpolated",
  };
}

/**
 * Creates a pure calculator from privacy-safe data/app_data assumptions.
 * Returned monetary values retain full floating-point precision; presentation code rounds them.
 */
export function createSimulatorEngine(assumptions) {
  const { cogs_per_unit_eur: cogsPerUnitEur, channel_economics: channelEconomics } = assumptions;
  const curve = [...assumptions.acceptance_curve].sort((a, b) => a.price_eur - b.price_eur);
  if (curve.length < 2) {
    throw new TypeError("Acceptance curve must contain at least two price points.");
  }

  return function calculateScenario({ priceEur, channelMix, marketingBudgetEur, cacEur }) {
    requirePositiveNumber(priceEur, "priceEur");
    requirePositiveNumber(marketingBudgetEur, "marketingBudgetEur");
    requirePositiveNumber(cacEur, "cacEur");
    validateMix(channelMix);

    const economicsByChannel = Object.fromEntries(
      REQUIRED_CHANNELS.map((channel) => {
        const economics = channelEconomics[channel];
        if (!economics) {
          throw new TypeError(`Missing economics for ${channel}.`);
        }
        const netPriceEur =
          priceEur *
            (1 -
              economics.retailer_margin_pct -
              economics.distributor_cut_pct -
              economics.payment_processing_pct) -
          economics.fulfillment_cost_eur;
        return [channel, { netPriceEur, contributionEur: netPriceEur - cogsPerUnitEur }];
      })
    );

    const contributionPerUnitEur = REQUIRED_CHANNELS.reduce(
      (total, channel) => total + channelMix[channel] * economicsByChannel[channel].contributionEur,
      0
    );
    const acceptance = interpolateAcceptance(priceEur, curve);
    const customersAcquired = marketingBudgetEur / cacEur;
    const ltvCacRatio = assumptions.estimated_ltv_eur / cacEur;
    const monthlyContributionPerCustomerEur =
      contributionPerUnitEur * assumptions.average_monthly_frequency;

    return {
      priceEur,
      channelMix: { ...channelMix },
      economicsByChannel,
      contributionPerUnitEur,
      acceptancePct: acceptance.acceptancePct,
      acceptanceRangeStatus: acceptance.rangeStatus,
      customersAcquired,
      ltvCacRatio,
      targetLtvCacRatio: assumptions.target_ltv_cac_ratio,
      ltvCacTargetMet: ltvCacRatio >= assumptions.target_ltv_cac_ratio,
      paybackMonths: cacEur / monthlyContributionPerCustomerEur,
    };
  };
}

/** Loads only the prepared, non-raw application assumptions. */
export async function loadSimulatorEngine(
  assumptionsUrl = "data/app_data/simulator_assumptions.json"
) {
  const response = await fetch(assumptionsUrl);
  if (!response.ok) {
    throw new Error(`Unable to load simulator assumptions: ${response.status}`);
  }
  return createSimulatorEngine(await response.json());
}
