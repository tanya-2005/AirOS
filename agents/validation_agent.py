"""
Validation Agent
----------------
Answers the question every other agent's output implicitly raises but never
proves: "how good actually IS this prediction?"

This does not run a second, separate model. It reuses forecast_agent's own
forecast_station() and evaluate_rmse() against the AQI history ingestion has
already logged (ingestion/history_store.py, data/history/aqi_<city>.jsonl) —
a genuine backtest, not a fabricated accuracy number:

  For every pair of consecutive logged AQI snapshots (t1, t2) for a station,
  pretend you're standing at t1 with only the data available at t1 (the AQI
  readings and weather logged up to that point), ask forecast_station() what
  it would have predicted for t2 (horizon = however many hours actually
  separate t1 and t2 — NOT hardcoded to 24h, since real ingestion cadence is
  irregular), then compare that prediction against what t2's snapshot
  actually recorded. Do this for every consecutive pair, across every
  station, and you have a real (predicted, actual) dataset to compute
  MAE/RMSE/bias/coverage over — exactly the "no fake AI, reuse existing
  forecast history" requirement.

With a new city (or a freshly-restarted scheduler), there may be 0 or 1
logged snapshots — not enough to form even one pair. Every function here
returns an explicit "insufficient_data" signal rather than silently
producing a metric from zero samples; see docstrings below. Every caller
(backend/pipeline.py) is expected to surface that honestly instead of
picking a default number.

Attribution has no equivalent ground truth to backtest against — nobody
ever confirms "the pollution at station X actually came from source Y" as
a labeled fact. attribution_reliability() below is deliberately NOT an
accuracy score; it's an evidence-completeness signal (how much real
evidence backed each attribution, not whether the attribution was
"correct") — see its docstring for why that distinction matters.
"""
import math
import statistics

import forecast_agent

MIN_PAIRS_FOR_TREND = 4  # need at least 2 pairs per half to compare "earlier" vs "later"
CONFIDENCE_BANDS = [("High", 0.6), ("Medium", 0.35), ("Low", 0.0)]

# Below this gap, a "prediction" is really just re-reading the same
# snapshot — the scheduler's real cadence is 15 minutes (ingestion/scheduler.py),
# so anything under ~12 minutes is almost always leftover manual test runs
# from development, not a meaningful forecast horizon. Excluding them stops
# a handful of near-instant repeats from diluting the accuracy metrics with
# trivially-perfect "predictions."
MIN_HORIZON_HOURS = 0.2


def _parse_iso(ts):
    import datetime
    return datetime.datetime.strptime(ts, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc)


def _hours_between(t1_iso, t2_iso):
    return (_parse_iso(t2_iso) - _parse_iso(t1_iso)).total_seconds() / 3600.0


def backtest_forecast(aqi_history, weather_history):
    """
    aqi_history / weather_history: history_store.read("aqi"|"weather", city, hours=...)
    output — a list of snapshot entries {"fetched_at", "records": [...]},
    oldest first.

    Returns a list of per-(station, consecutive-pair) backtest results:
      {station, at, target_at, horizon_hours, predicted_aqi, actual_aqi,
       persistence_baseline, absolute_error, pct_error, confidence}

    [] if fewer than 2 snapshots exist (nothing to pair) — this is the
    expected, honest state for a just-added city, not an error.
    """
    if len(aqi_history) < 2:
        return []

    # station -> list of (fetched_at, aqi), oldest first, to build recent_readings
    # the same way forecast_agent.main() does (oldest..newest list of floats)
    by_station = {}
    for entry in aqi_history:
        for rec in entry["records"]:
            by_station.setdefault(rec["station_name"], []).append((entry["fetched_at"], rec["aqi"]))

    # weather isn't necessarily logged at the exact same timestamps as AQI —
    # for each station+time, use the most recent weather reading at or
    # before that time (same "current weather is the best available proxy"
    # philosophy forecast_agent.py's own docstring already commits to).
    weather_by_station = {}
    for entry in weather_history:
        for rec in entry["records"]:
            weather_by_station.setdefault(rec["station_name"], []).append((entry["fetched_at"], rec))

    def weather_at_or_before(station, ts):
        candidates = [w for (t, w) in weather_by_station.get(station, []) if t <= ts]
        return candidates[-1] if candidates else None

    results = []
    for station, series in by_station.items():
        if len(series) < 2:
            continue
        for i in range(len(series) - 1):
            t1, aqi1 = series[i]
            t2, aqi2 = series[i + 1]
            horizon = round(_hours_between(t1, t2), 2)
            if horizon < MIN_HORIZON_HOURS:
                continue  # too close together to be a meaningful forecast horizon — see MIN_HORIZON_HOURS
            recent_readings = [a for (_, a) in series[: i + 1]]
            weather = weather_at_or_before(station, t1)
            forecast = forecast_agent.forecast_station(aqi1, recent_readings, weather, horizon_hours=horizon)
            predicted = forecast["predicted_aqi"]
            abs_error = round(abs(predicted - aqi2), 2)
            pct_error = round(abs_error / aqi2 * 100, 1) if aqi2 else None
            results.append({
                "station": station,
                "at": t1,
                "target_at": t2,
                "horizon_hours": horizon,
                "predicted_aqi": predicted,
                "actual_aqi": aqi2,
                "persistence_baseline": aqi1,
                "absolute_error": abs_error,
                "pct_error": pct_error,
                "confidence": forecast["confidence"],
            })
    results.sort(key=lambda r: r["at"])
    return results


def compute_metrics(pairs, total_station_count=None):
    """
    MAE, RMSE (model vs. persistence-baseline, via forecast_agent.evaluate_rmse
    — not reimplemented here), mean bias, average confidence, and station
    coverage over a set of backtest pairs (see backtest_forecast above).

    Returns None if `pairs` is empty — the caller must treat that as
    "insufficient data to compute metrics," never as "0% error."
    """
    if not pairs:
        return None

    predictions = [p["predicted_aqi"] for p in pairs]
    actuals = [p["actual_aqi"] for p in pairs]
    persistence = [p["persistence_baseline"] for p in pairs]

    rmse_comparison = forecast_agent.evaluate_rmse(predictions, actuals, persistence)

    mae = round(statistics.mean(p["absolute_error"] for p in pairs), 2)
    mean_bias = round(statistics.mean(p["predicted_aqi"] - p["actual_aqi"] for p in pairs), 2)
    avg_confidence = round(statistics.mean(p["confidence"] for p in pairs), 2)

    stations_validated = len({p["station"] for p in pairs})
    coverage_pct = (
        round(stations_validated / total_station_count * 100, 1) if total_station_count else None
    )

    return {
        "sample_size": len(pairs),
        "stations_validated": stations_validated,
        "coverage_pct": coverage_pct,
        "mae": mae,
        "rmse": rmse_comparison["model_rmse"],
        "persistence_rmse": rmse_comparison["persistence_rmse"],
        "improvement_over_persistence_pct": rmse_comparison["improvement_over_baseline_pct"],
        "mean_bias": mean_bias,
        "bias_direction": "over-predicts" if mean_bias > 1 else ("under-predicts" if mean_bias < -1 else "roughly unbiased"),
        "avg_confidence": avg_confidence,
    }


def rolling_accuracy_trend(pairs):
    """
    Splits backtest pairs chronologically in half and compares MAE between
    the earlier and later half — the simplest honest way to say "is this
    model getting better or worse at THIS station/city over time" without
    fitting a second trend model on top of the first.

    Needs >= MIN_PAIRS_FOR_TREND pairs (2 per half minimum) — otherwise
    returns an explicit insufficient_data trend rather than a trend
    computed from a single pair on each side, which would be noise
    dressed up as a signal.
    """
    if len(pairs) < MIN_PAIRS_FOR_TREND:
        return {
            "trend": "insufficient_data",
            "sample_size": len(pairs),
            "note": f"Need at least {MIN_PAIRS_FOR_TREND} validated predictions to compare earlier vs. later accuracy; have {len(pairs)}.",
        }

    ordered = sorted(pairs, key=lambda p: p["at"])
    mid = len(ordered) // 2
    earlier, later = ordered[:mid], ordered[mid:]
    earlier_mae = round(statistics.mean(p["absolute_error"] for p in earlier), 2)
    later_mae = round(statistics.mean(p["absolute_error"] for p in later), 2)

    if earlier_mae == 0:
        relative_change_pct = 0.0
    else:
        relative_change_pct = round((later_mae - earlier_mae) / earlier_mae * 100, 1)

    if relative_change_pct <= -10:
        trend = "improving"
    elif relative_change_pct >= 10:
        trend = "degrading"
    else:
        trend = "stable"

    return {
        "trend": trend,
        "sample_size": len(pairs),
        "earlier_mae": earlier_mae,
        "later_mae": later_mae,
        "relative_change_pct": relative_change_pct,
    }


def _confidence_band(confidence):
    for label, threshold in CONFIDENCE_BANDS:
        if confidence >= threshold:
            return label
    return "Low"


def attribution_reliability(attribution_results):
    """
    Evidence-COMPLETENESS signal, not accuracy — there is no ground-truth
    "the pollution really did come from source X" label anywhere in this
    system (or, realistically, in most real-world deployments either,
    short of an isotope/chemical source-apportionment study), so scoring
    attribution "correctness" would mean inventing a number with nothing
    behind it. What CAN be measured honestly, from real fields
    attribute_station() already returns: how many stations had any nearby
    evidence at all, how strong the winning source's confidence share was,
    how often wind-aware scoring (vs. distance-only) was active, and how
    much evidence typically backed each call.

    Returns None if attribution_results is empty.
    """
    if not attribution_results:
        return None

    with_evidence = [r for r in attribution_results if r.get("evidence")]
    with_attribution = [r for r in attribution_results if r.get("attribution")]
    wind_aware = [r for r in attribution_results if r.get("wind_aware")]

    top_confidences = [r["attribution"][0]["confidence"] for r in with_attribution]
    band_counts = {"High": 0, "Medium": 0, "Low": 0}
    for c in top_confidences:
        band_counts[_confidence_band(c)] += 1

    return {
        "station_count": len(attribution_results),
        "stations_with_evidence": len(with_evidence),
        "stations_with_evidence_pct": round(len(with_evidence) / len(attribution_results) * 100, 1),
        "wind_aware_pct": round(len(wind_aware) / len(attribution_results) * 100, 1),
        "avg_evidence_count": round(statistics.mean(len(r.get("evidence") or []) for r in attribution_results), 1),
        "avg_top_confidence": round(statistics.mean(top_confidences), 2) if top_confidences else None,
        "confidence_band_counts": band_counts,
        "methodology_note": (
            "This measures how much evidence backed each attribution call (nearby registry sources, "
            "wind-aware scoring, confidence share) — not whether the attributed source was verified "
            "correct, since no ground-truth source-confirmation data exists for this system to check against."
        ),
    }


def model_reliability_label(forecast_metrics, attribution_summary, trend):
    """
    Rule-based, deterministic combination of the signals above into one
    plain-language reliability label + the reasoning behind it — never a
    single opaque score. Officers get the label AND the "why" in the same
    payload.
    """
    reasons = []

    if forecast_metrics is None:
        return {
            "label": "Insufficient Data",
            "reasons": ["No consecutive AQI history snapshots logged yet for this city — validation needs at least 2 ingestion runs."],
        }

    sample_size = forecast_metrics["sample_size"]
    mae = forecast_metrics["mae"]
    avg_confidence = forecast_metrics["avg_confidence"]

    if sample_size < MIN_PAIRS_FOR_TREND:
        reasons.append(f"Only {sample_size} validated prediction(s) so far — reliability will sharpen as ingestion accumulates more history.")
        label = "Building History"
    else:
        score = 0
        if mae <= 15:
            score += 1
            reasons.append(f"Mean absolute error of {mae} AQI points is low relative to CPCB's ~50-point category bands.")
        elif mae <= 35:
            reasons.append(f"Mean absolute error of {mae} AQI points is moderate — within a category band but not tight.")
        else:
            reasons.append(f"Mean absolute error of {mae} AQI points is high — treat predictions as directional, not precise.")

        if avg_confidence >= 0.6:
            score += 1
            reasons.append(f"Average model-reported confidence ({avg_confidence}) is high across validated predictions.")
        else:
            reasons.append(f"Average model-reported confidence ({avg_confidence}) is modest — mostly short-history or long-horizon predictions.")

        if trend.get("trend") == "improving":
            score += 1
            reasons.append("Rolling accuracy is improving over the validated window.")
        elif trend.get("trend") == "degrading":
            reasons.append("Rolling accuracy is degrading over the validated window — worth a closer look.")

        label = "High" if score >= 2 else ("Medium" if score == 1 else "Low")

    if attribution_summary:
        reasons.append(f"{attribution_summary['stations_with_evidence_pct']}% of stations have nearby registry evidence backing their attribution.")

    return {"label": label, "reasons": reasons}
