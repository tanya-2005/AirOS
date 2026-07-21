// Decision-intelligence helpers for the Command Center's AI Decision Panel
// and Explainability Timeline (Milestone 4). Every value here is derived
// from real backend fields (attribution_agent.py / enforcement_agent.py
// output) — nothing is invented or LLM-generated, the same "auditable
// math, no black box" standard as lib/report.js and every agent in this
// project. Sentences are templated around real numbers; the numbers
// themselves always come from the pipeline.

import { categoryFor } from "./aqi";
import { sourceMeta } from "./sources";

const RISK_BY_CATEGORY = {
  Good: "Low",
  Satisfactory: "Low",
  Moderate: "Medium",
  Poor: "High",
  "Very Poor": "High",
  Severe: "Critical",
};

export const RISK_TONE = { Low: "success", Medium: "warning", High: "danger", Critical: "hazard" };

export function riskLevel(aqi) {
  return RISK_BY_CATEGORY[categoryFor(aqi).label] || "Medium";
}

/**
 * Mirrors enforcement_agent.py's own actionability logic
 * (`actionability = 1.2 if source["permit_status"] != "valid" else 0.8`) —
 * a validly-permitted site needs a heavier legal/compliance process to act
 * against than an unregistered or expired one. This inverts that same real
 * backend signal into a difficulty label instead of inventing a separate
 * scale from nothing.
 */
export function difficultyFromPermit(permitStatus) {
  if (permitStatus === "valid") return "High";
  if (permitStatus === "expired") return "Medium";
  return "Low"; // unregistered
}

export function difficultyNote(permitStatus) {
  if (permitStatus === "valid") return "a compliant site — needs a legal/regulatory process, not just a patrol";
  if (permitStatus === "expired") return "a lapsed permit — faster to act on than a valid one";
  return "no valid permit on file — the most immediately actionable case";
}

export const DIFFICULTY_TONE = { Low: "success", Medium: "warning", High: "danger" };

/** "Why this recommendation exists" — templated from the exact fields PriorityActions/AIDecisionPanel already render, nothing added. */
export function recommendationRationale(item) {
  const meta = sourceMeta(item.source_type);
  const confidencePct = Math.round((item.attribution_confidence ?? 0) * 100);
  return (
    `${item.source_name} sits ${item.distance_km}km from ${item.station}, where attribution scoring ` +
    `assigns ${meta.label.toLowerCase()} ${confidencePct}% of the explained AQI signal at that station. ` +
    `Its ${item.permit_status} permit status makes this ${difficultyNote(item.permit_status)}. The model ` +
    `projects a ${item.expected_aqi_improvement_pct}% AQI improvement if actioned, bringing the station to ` +
    `roughly ${Math.round(item.projected_aqi_if_actioned)}.`
  );
}

/**
 * AQI delta between the two most recent entries of a station history
 * series (oldest..newest) — real data from history_store.py via
 * /api/history/station/{name} (Milestone 2), not fabricated. Returns null
 * if there isn't at least two snapshots yet to diff.
 */
export function deltaFromHistory(series) {
  if (!series || series.length < 2) return null;
  const prev = series[series.length - 2].aqi;
  const curr = series[series.length - 1].aqi;
  return Math.round((curr - prev) * 10) / 10;
}

/**
 * "How the attribution decision was reached" — templated from the exact
 * fields attribute_station() returns (station.attribution, station.evidence,
 * station.wind_aware), same "narrative over real numbers, nothing invented"
 * standard as recommendationRationale above. AI Validation & Performance
 * milestone's "Attribution Explainability: Reasoning Summary" requirement.
 */
export function attributionReasoningSummary(station) {
  if (!station?.attribution?.length) {
    return "No registry source fell within the 3km attribution radius for this station, so no dominant source could be attributed.";
  }
  const top = station.attribution[0];
  const meta = sourceMeta(top.source_type);
  const evidenceCount = station.evidence?.length ?? 0;
  const confidencePct = Math.round(top.confidence * 100);
  const windPart =
    station.wind_aware == null
      ? ""
      : station.wind_aware
        ? " Wind-aware scoring was active, so sources currently downwind of this station were weighted higher."
        : " No live wind data was available, so this used distance-only scoring rather than wind-aware weighting.";
  return (
    `${meta.label} was ranked the dominant source at ${confidencePct}% of the explained AQI signal, based on ` +
    `${evidenceCount} nearby registry source${evidenceCount === 1 ? "" : "s"} within the 3km radius, weighted by ` +
    `distance, activity status, and emission-intensity priors.${windPart}`
  );
}

/**
 * Data Inputs Used — a checklist of what was actually available when this
 * station's attribution was computed, so an officer can see at a glance
 * whether a call was made on thin data. Every value here reads an existing
 * field; nothing is inferred beyond presence/absence.
 */
export function attributionDataInputs(station, hasWeather, registryLoaded) {
  return [
    { label: "Live AQI reading", available: station?.aqi != null },
    { label: "Source registry loaded", available: !!registryLoaded },
    { label: "Wind direction & speed", available: !!station?.wind_aware },
    { label: "Current weather at station", available: !!hasWeather },
  ];
}

const LOW_CONFIDENCE_THRESHOLD = 0.5;

/**
 * Officer Trust Panel — "alternative interpretation if confidence is low."
 * Only fires below LOW_CONFIDENCE_THRESHOLD; null otherwise so the UI can
 * skip rendering it entirely for high-confidence recommendations rather
 * than show an empty disclaimer. Doesn't name a specific alternate source
 * with an invented percentage — this component only has this one source's
 * confidence, not the full ranked list at that station — so it honestly
 * points to where the real ranked breakdown lives instead.
 */
export function alternativeInterpretation(item) {
  const confidence = item.attribution_confidence ?? 0;
  if (confidence >= LOW_CONFIDENCE_THRESHOLD) return null;
  const confidencePct = Math.round(confidence * 100);
  return (
    `This source was assigned only ${confidencePct}% of the explained AQI signal at ${item.station} — other nearby ` +
    `sources may contribute meaningfully too. See the Attribution page for this station's full ranked breakdown ` +
    `before treating this as the sole cause.`
  );
}

/**
 * Officer Trust Panel — "known limitations," shown on every recommendation
 * regardless of confidence. Static, not item-derived — these are structural
 * limitations of the priority/simulation formulas themselves (see
 * enforcement_agent.py / simulation_agent.py docstrings), not something
 * that varies per recommendation.
 */
export const KNOWN_LIMITATIONS = [
  "Priority score is a simplified formula (severity × attribution confidence × actionability), not validated against real enforcement outcomes.",
  "Expected AQI improvement is a projected simulation result assuming the typical reduction % for this action type, not a guaranteed outcome.",
  "Attribution confidence reflects proximity- and evidence-based scoring, not a certified or legally confirmed pollution source determination.",
];

/** Real city-wide top pollution driver — confidence-weighted sum across all stations' attribution, same computation lib/report.js's citySummary() already does, exposed standalone for the Command Center's dedicated tile. */
export function topPollutionDriver(stations) {
  const totals = {};
  for (const s of stations) {
    for (const a of s.attribution ?? []) {
      totals[a.source_type] = (totals[a.source_type] || 0) + a.confidence;
    }
  }
  const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  return top ? sourceMeta(top[0]) : null;
}
