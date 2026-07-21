// AI Validation & Performance — shared frontend formatting/explanation
// helpers. Every number rendered by these components comes straight from
// backend/pipeline.py's get_forecast_validation/get_attribution_reliability/
// get_model_reliability/get_system_health/get_validation_report (which in
// turn reuse agents/validation_agent.py's backtest over real logged
// history — see that module's docstring). Nothing here recomputes a
// metric; this file only decides how to label/color/word what the backend
// already computed.

export const TREND_TONE = {
  improving: "success",
  stable: "accent",
  degrading: "danger",
  insufficient_data: "muted",
};

export const TREND_LABEL = {
  improving: "Improving",
  stable: "Stable",
  degrading: "Degrading",
  insufficient_data: "Building history",
};

export const RELIABILITY_TONE = {
  High: "success",
  Medium: "warning",
  Low: "danger",
  "Building History": "muted",
  "Insufficient Data": "muted",
};

export const CONFIDENCE_BAND_TONE = {
  High: "success",
  Medium: "warning",
  Low: "danger",
};

// Plain-English formula explanations for non-technical officers — shown
// alongside the metric tiles on the AI Validation page. These describe the
// SAME formulas agents/validation_agent.py actually computes (compute_metrics,
// forecast_agent.evaluate_rmse); if those functions ever change, update this
// alongside them, the same "documentation of the real model, not a separate
// guess" standard components/attribution/MethodologyPanel.jsx already holds.
export const METRIC_EXPLANATIONS = {
  mae: {
    label: "Mean Absolute Error (MAE)",
    formula: "average of |predicted AQI − actual AQI| across every validated prediction",
    plain: "On average, how many AQI points off each prediction was — in either direction.",
  },
  rmse: {
    label: "Root Mean Square Error (RMSE)",
    formula: "square root of the average squared error",
    plain: "Like MAE, but penalizes big misses more than small ones — a high RMSE relative to MAE means a few predictions were way off.",
  },
  mean_bias: {
    label: "Mean Bias",
    formula: "average of (predicted AQI − actual AQI)",
    plain: "Whether the model tends to over-predict (positive) or under-predict (negative) on average, not just how far off it is.",
  },
  avg_confidence: {
    label: "Average Confidence",
    formula: "average of the model's own self-reported confidence score across validated predictions",
    plain: "How confident the forecast model said it was, on average, for the predictions that were actually checked against real outcomes.",
  },
  coverage_pct: {
    label: "Prediction Coverage",
    formula: "stations with at least one validated prediction ÷ total stations reporting",
    plain: "What share of monitored stations have enough logged history to be validated at all.",
  },
};

/** Formats an ISO timestamp as "X minutes/hours/days ago", or a fallback if null. */
export function timeAgo(minutes) {
  if (minutes == null) return "No data yet";
  if (minutes < 60) return `${Math.round(minutes)} min ago`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 60 / 24)}d ago`;
}

/** Freshness tone: recent (green) vs. stale (amber) vs. very stale (red) vs. never (muted). */
export function freshnessTone(minutes) {
  if (minutes == null) return "muted";
  if (minutes <= 30) return "success";
  if (minutes <= 24 * 60) return "warning";
  return "danger";
}

/**
 * The one-line answer to "is the system healthy right now" for a single
 * city's row from get_system_health() — computed from the same fields
 * SystemHealthTable already renders per-row, so the landing summary and the
 * detailed table beneath it can never disagree. Returned before the table
 * so an officer gets the verdict first and the evidence (per-source sync
 * status) only if they need to check why.
 */
export function systemHealthVerdict(row, cityLabel) {
  if (!row) return { label: "No data", tone: "muted", sentence: `No system health data for ${cityLabel} yet.` };
  const allSynced = row.last_weather_sync && row.last_forecast_update && row.last_incident_sync;
  const tone = freshnessTone(row.data_freshness_minutes);
  const healthy = tone === "success" && allSynced;
  const label = healthy ? "Healthy" : tone === "danger" ? "Stale" : "Degraded";
  const missing = [
    !row.last_weather_sync && "weather",
    !row.last_forecast_update && "forecast",
    !row.last_incident_sync && "incidents",
  ].filter(Boolean);
  const sentence = healthy
    ? `${cityLabel}'s AQI data synced ${timeAgo(row.data_freshness_minutes)}, and weather, forecast, and incident feeds are all current.`
    : `${cityLabel}'s AQI data synced ${timeAgo(row.data_freshness_minutes)}${
        missing.length ? `, but ${missing.join(", ")} feed${missing.length === 1 ? " hasn't" : "s haven't"} synced yet` : ""
      }.`;
  return { label, tone: healthy ? "success" : tone === "danger" ? "danger" : "warning", sentence };
}

/**
 * Buckets a set of already-fetched backtest pairs by their own
 * model-reported confidence (High/Medium/Low, same thresholds
 * agents/validation_agent.py::_confidence_band uses) — a client-side
 * reduce over data the page already has, not a second backend calculation.
 */
export function confidenceBandDistribution(pairs) {
  const counts = { High: 0, Medium: 0, Low: 0 };
  for (const p of pairs ?? []) {
    if (p.confidence >= 0.6) counts.High += 1;
    else if (p.confidence >= 0.35) counts.Medium += 1;
    else counts.Low += 1;
  }
  return counts;
}
