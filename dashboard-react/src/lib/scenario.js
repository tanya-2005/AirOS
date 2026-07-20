// Scenario Lab configuration: lever metadata, the lever→registry-source
// mapping fed to the live /api/simulate endpoint, and the UI-layer estimate
// formulas (cost, confidence, benefits) that illustrate a scenario's
// trade-offs. The AQI numbers themselves always come from the backend
// (agents/simulation_agent.py) — everything in this file is presentation
// logic layered on top of that real number, not a substitute for it.

export const LEVER_DEFAULTS = {
  construction: 100,
  heavy_vehicle: 0,
  industrial: 100,
  street_cleaning: 0,
  water_spray: 0,
  waste_enforce: 30,
  public_transport: 0,
};

// A concrete, defensible combination the app can propose — mirrors the
// "target the two highest-leverage sources" framing in the AI's Pick panel.
export const RECOMMENDED_LEVERS = {
  construction: 20,
  heavy_vehicle: 65,
  industrial: 80,
  street_cleaning: 55,
  water_spray: 80,
  waste_enforce: 80,
  public_transport: 35,
};

// Every lever pushed to its maximum intervention — used only as the
// "vs full shutdown" cost comparison baseline in the AI's Pick panel.
export const FULL_SHUTDOWN_LEVERS = {
  construction: 0,
  heavy_vehicle: 100,
  industrial: 0,
  street_cleaning: 100,
  water_spray: 100,
  waste_enforce: 100,
  public_transport: 100,
};

export const LEVER_META = {
  construction: {
    label: "Construction activity",
    iconTone: "danger",
    invert: true,
    def: 100,
    costWeight: 42,
    minLabel: "HALTED",
    maxLabel: "FULL",
    format: (v) => `${v}%`,
  },
  heavy_vehicle: {
    label: "Heavy vehicle restriction",
    iconTone: "warning",
    invert: false,
    def: 0,
    costWeight: 30,
    minLabel: "OFF",
    maxLabel: "FULL",
    format: (v) => (v === 0 ? "Off" : v === 100 ? "Full" : `${v}%`),
  },
  industrial: {
    label: "Industrial output",
    iconTone: "neutral",
    invert: true,
    def: 100,
    costWeight: 55,
    minLabel: "SHUTDOWN",
    maxLabel: "FULL",
    format: (v) => `${v}%`,
  },
  street_cleaning: {
    label: "Street cleaning",
    iconTone: "accent",
    invert: false,
    def: 0,
    costWeight: 16,
    minLabel: "NONE",
    maxLabel: "DAILY",
    format: (v) => (v === 0 ? "None" : v >= 80 ? "Daily" : v >= 40 ? "Regular" : "Occasional"),
  },
  water_spray: {
    label: "Water sprinkling",
    iconTone: "accent",
    invert: false,
    def: 0,
    costWeight: 16,
    minLabel: "NONE",
    maxLabel: "HIGH",
    format: (v) => (v === 0 ? "None" : v >= 70 ? "High" : v >= 35 ? "Medium" : "Low"),
  },
  waste_enforce: {
    label: "Waste burning enforcement",
    iconTone: "neutral",
    invert: false,
    def: 30,
    from: 30,
    costWeight: 16,
    minLabel: "LOW",
    maxLabel: "HIGH",
    format: (v) => (v >= 75 ? "High" : v >= 40 ? "Medium" : "Low"),
  },
  public_transport: {
    label: "Public transport increase",
    iconTone: "success",
    invert: false,
    def: 0,
    costWeight: 38,
    minLabel: "BASELINE",
    maxLabel: "+100%",
    format: (v) => `+${v}%`,
  },
};

export const LEVER_ORDER = Object.keys(LEVER_META);

function clamp(v, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Maps the 7 UI levers onto the 4 registry source_types simulation_agent.py
 * actually knows about. This is a disclosed modeling assumption, not a fact
 * from the agents — street cleaning / water spraying aren't their own
 * attribution source in the registry, so they're modeled as partial
 * dust-suppression credit against construction, and public transport as a
 * secondary credit against vehicle/generator emissions (mirroring
 * simulation_agent.simulate_citizen_scenario's own traffic proxy).
 */
export function mapLeversToReductions(levers) {
  return {
    construction_site: clamp(
      (100 - levers.construction) + 0.3 * levers.street_cleaning + 0.3 * levers.water_spray
    ),
    diesel_generator_cluster: clamp(levers.heavy_vehicle + 0.3 * levers.public_transport),
    industrial_stack: clamp(100 - levers.industrial),
    waste_burning_zone: clamp(levers.waste_enforce),
  };
}

/** 0..1 — how aggressively a lever is being pushed away from its baseline. */
function leverIntensity(key, value) {
  const meta = LEVER_META[key];
  if (meta.invert) return (meta.def - value) / meta.def;
  if (meta.from != null) return Math.max(0, value - meta.from) / (100 - meta.from);
  return value / 100;
}

/**
 * Illustrative trade-off estimates shown alongside the real AQI number —
 * daily operating cost, field resources, and a confidence discount for
 * stacking many aggressive levers at once. Not agent output; clearly
 * presentational, same role the original static export's inline script played.
 */
export function computeTradeoffs(levers) {
  let aggressiveCount = 0;
  let cost = 0;
  let totalIntensity = 0;

  for (const key of LEVER_ORDER) {
    const intensity = leverIntensity(key, levers[key]);
    totalIntensity += intensity;
    if (intensity > 0.15) aggressiveCount += 1;
    cost += intensity * LEVER_META[key].costWeight;
  }

  const difficulty =
    aggressiveCount >= 5 ? "High" : aggressiveCount >= 3 ? "Medium" : aggressiveCount >= 1 ? "Low" : "None";
  const difficultyNote =
    difficulty === "High"
      ? "politically hard"
      : difficulty === "Medium"
        ? "coordination needed"
        : difficulty === "Low"
          ? "easy to enact"
          : "no action";

  return {
    costCr: Math.round(cost),
    aggressiveCount,
    resources: Math.round(aggressiveCount * 4 + totalIntensity * 6),
    difficulty,
    difficultyNote,
  };
}

/** Confidence discount for stacking many simultaneous aggressive interventions. */
export function estimateConfidence(levers, reductionPct) {
  const { aggressiveCount } = computeTradeoffs(levers);
  return Math.max(58, Math.min(93, Math.round(91 - aggressiveCount * 2.4 - Math.max(0, reductionPct - 40) * 0.3)));
}

export function estimateTimeToImprove(aqiReduced) {
  return Math.max(12, Math.round(48 - aqiReduced * 0.5));
}

/** CO2 co-benefit estimate — separate from the AQI model, illustrative only. */
export function estimateCo2SavedTonnes(levers) {
  return Math.round(
    (levers.heavy_vehicle / 100) * 140 +
      (levers.public_transport / 100) * 95 +
      ((100 - levers.industrial) / 100) * 70 +
      ((100 - levers.construction) / 100) * 30
  );
}
