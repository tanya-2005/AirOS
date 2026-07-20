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
