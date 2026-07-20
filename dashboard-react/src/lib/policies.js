// Milestone 5 — named policy cards, replacing Scenario Lab's continuous
// lever sliders. Each policy maps directly onto the real registry
// source_type keys simulation_agent.py already understands (see
// backend/routers/simulation.py) — no lever-indirection layer needed
// anymore now that Milestone 3 gave the registry real source types
// (construction_site, industrial_stack, waste_burning_zone,
// traffic_corridor, diesel_generator_cluster).
//
// What's real vs. authored, per field:
//   reductions / rain     -> sent straight to POST /api/simulate; the
//                            resulting AQI number is always a live
//                            backend computation (simulation_agent.py),
//                            never estimated here.
//   difficulty             -> derived from the REAL registry: the share of
//                            a policy's affected sites that hold a valid
//                            permit (mirrors enforcement_agent.py's own
//                            actionability signal — unregistered/expired
//                            sites are easier wins than compliant ones).
//   executionTime, tradeoffs -> hand-authored policy metadata. This is not
//                            computable from AQI/attribution data (nothing
//                            in this dataset encodes "how many hours to
//                            mobilize a patrol") — same role as
//                            enforcement_agent.py's own ACTION_TEMPLATES
//                            dict, which is also hand-authored, not fitted.
//                            Disclosed here, not hidden.

import { HardHat, Truck, Factory, Fuel, Flame, CloudRain } from "lucide-react";

export const POLICIES = [
  {
    id: "ban_construction",
    label: "Ban Construction",
    description: "Halt all active construction sites citywide.",
    Icon: HardHat,
    reductions: { construction_site: 100 },
    rain: false,
    costWeight: 42,
    executionTime: "24–48h to notify & enforce citywide",
    tradeoffs: "Halts active project timelines; enforcement needed to prevent violations at unregistered sites.",
  },
  {
    id: "restrict_heavy_vehicles",
    label: "Restrict Heavy Vehicles",
    description: "Ban heavy diesel trucks on major traffic corridors.",
    Icon: Truck,
    reductions: { traffic_corridor: 70 },
    rain: false,
    costWeight: 30,
    executionTime: "12–24h with traffic police coordination",
    tradeoffs: "Freight and delivery delays; needs alternate routing and checkpoint staffing.",
  },
  {
    id: "close_industrial",
    label: "Close Industrial Units",
    description: "Temporarily shut down industrial stacks near hotspots.",
    Icon: Factory,
    reductions: { industrial_stack: 100 },
    rain: false,
    costWeight: 55,
    executionTime: "48–72h — needs a regulatory shutdown order",
    tradeoffs: "Significant economic impact; risk of worker layoffs; needs pollution control board authorization.",
  },
  {
    id: "ban_diesel_generators",
    label: "Ban Diesel Generators",
    description: "Prohibit diesel backup generators during high-AQI periods.",
    Icon: Fuel,
    reductions: { diesel_generator_cluster: 100 },
    rain: false,
    costWeight: 24,
    executionTime: "24h with grid-backup coordination",
    tradeoffs: "Power-outage risk during grid instability; hospitals and critical infrastructure need exemptions.",
  },
  {
    id: "stop_waste_burning",
    label: "Stop Waste Burning",
    description: "Deploy patrols to stop open burning at registry sites.",
    Icon: Flame,
    reductions: { waste_burning_zone: 100 },
    rain: false,
    costWeight: 16,
    executionTime: "6–12h — direct patrol deployment",
    tradeoffs: "Needs a waste-disposal alternative or backlog accumulates; recurring enforcement required.",
  },
  {
    id: "artificial_rain",
    label: "Artificial Rain",
    description: "Cloud seeding to induce rainfall and scrub particulates.",
    Icon: CloudRain,
    reductions: {},
    rain: true,
    costWeight: 60,
    executionTime: "3–5 days — needs suitable cloud cover and aircraft",
    tradeoffs: "Weather-dependent feasibility; high cost; effect is temporary (hours to ~2 days).",
  },
];

export function findPolicy(id) {
  return POLICIES.find((p) => p.id === id);
}

/** Merges reductions from every enabled policy — same source_type hit by two policies takes the max, not a sum (can't be "200% banned"). */
export function combinePolicies(enabledIds) {
  const reductions = {};
  let rain = false;
  for (const id of enabledIds) {
    const policy = findPolicy(id);
    if (!policy) continue;
    if (policy.rain) rain = true;
    for (const [sourceType, pct] of Object.entries(policy.reductions)) {
      reductions[sourceType] = Math.max(reductions[sourceType] || 0, pct);
    }
  }
  return { reductions, rain };
}

/**
 * Real registry-derived difficulty: the share of sites this policy would
 * affect that hold a currently-valid permit. A validly-permitted site
 * needs a heavier legal/compliance process to act against than an
 * unregistered or expired one — same signal enforcement_agent.py's own
 * actionability multiplier uses, aggregated across every site a
 * city-wide policy would touch instead of just one.
 */
export function policyDifficulty(policy, registry) {
  if (policy.id === "artificial_rain") return "High"; // no registry mapping exists for this one — weather-dependent feasibility is inherently hard, not computed
  const affectedTypes = Object.keys(policy.reductions);
  if (!affectedTypes.length || !registry?.length) return "Medium";
  const matching = registry.filter((r) => affectedTypes.includes(r.source_type));
  if (matching.length === 0) return "Medium";
  const validShare = matching.filter((r) => r.permit_status === "valid").length / matching.length;
  if (validShare > 0.6) return "High";
  if (validShare > 0.3) return "Medium";
  return "Low";
}

/** Confidence discount for stacking multiple simultaneous policies — same shape as the pre-Milestone-5 lever version (lib/scenario.js's estimateConfidence), just keyed on policy count instead of lever aggressiveness. */
export function policyConfidence(enabledCount, reductionPct) {
  return Math.max(55, Math.min(94, Math.round(92 - enabledCount * 3 - Math.max(0, reductionPct - 40) * 0.3)));
}

/** Aggregate cost/resources/difficulty for the current policy selection — same output shape TradeoffsPanel already renders, computed from policies instead of levers. */
export function combinedTradeoffs(enabledIds, registry) {
  const enabled = enabledIds.map(findPolicy).filter(Boolean);
  const cost = enabled.reduce((sum, p) => sum + p.costWeight, 0);
  const difficulties = enabled.map((p) => policyDifficulty(p, registry));
  const rank = { Low: 1, Medium: 2, High: 3 };
  const worst = difficulties.reduce((acc, d) => (rank[d] > rank[acc] ? d : acc), "Low");
  const difficultyNote =
    worst === "High" ? "politically hard" : worst === "Medium" ? "coordination needed" : enabled.length ? "easy to enact" : "no action";
  return {
    costCr: cost,
    difficulty: enabled.length ? worst : "None",
    difficultyNote,
    resources: Math.round(enabled.length * 4 + cost / 12),
  };
}

export function estimateTimeToImprove(aqiReduced) {
  return Math.max(12, Math.round(48 - aqiReduced * 0.5));
}

// Illustrative AQI -> PM conversion, same disclosed assumption
// PredictionPanel already used pre-Milestone-5 — there's no real PM2.5/PM10
// sensor feed anywhere in this pipeline, only AQI. Kept as named,
// documented functions instead of inline magic numbers so Impact
// Assessment's PM reduction figures use the exact same conversion.
export function estimatePM25(aqi) {
  return aqi == null ? null : Math.round(aqi * 0.58);
}
export function estimatePM10(aqi) {
  return aqi == null ? null : Math.round(aqi * 1.12);
}
