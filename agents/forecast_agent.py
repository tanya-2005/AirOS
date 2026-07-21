"""
Forecast Agent
--------------
Predicts AQI 24-72h ahead per station/ward, using a weather-adjusted
heuristic on top of a persistence baseline.

Why not jump straight to XGBoost: you don't have a training dataset
assembled yet, and a broken ML pipeline demos worse than a working
heuristic. Ship this first. Upgrade to XGBoost on day 2 ONLY if:
  1. This is fully working end-to-end, AND
  2. You've pulled a historical AQI dataset (CPCB historical archives via
     data.gov.in, or a Kaggle "India Air Quality" dataset as a bootstrap)

Model v2 (heuristic, explainable, defensible to judges — Milestone 2 adds
rain and temperature on top of the original wind/humidity/trend model):

  forecast(t+h) = persistence(t) + trend_adjustment
                  + wind_adjustment + humidity_adjustment
                  + rain_adjustment + temp_adjustment

  All four weather terms read from `current_weather` — a snapshot of
  conditions AT the station right now (temperature, humidity, wind_speed,
  precipitation), fetched per-station by ingestion/fetch_weather.py. This
  heuristic treats "current weather" as the best available proxy for
  "weather over the forecast window," the same way `persistence(t)`
  treats "current AQI" as the baseline proxy for "AQI over the forecast
  window" — deliberately consistent with the model's own philosophy,
  not a second, different kind of assumption.

  wind_adjustment:     higher wind -> lower AQI (disperses pollutants);
                        calm air (<10 km/h) lets them accumulate instead.
  humidity_adjustment: higher humidity -> particulates stay suspended
                        longer -> +AQI.
  rain_adjustment:     NEW. Rain physically scrubs particulates out of the
                        air (wet deposition) -> -AQI. Capped at 10mm so one
                        freak downpour reading doesn't dominate the model;
                        the 3 AQI-points-per-mm coefficient is an assumed
                        constant, not fitted to data — same disclosure
                        standard as RAIN_AQI_REDUCTION_PCT in
                        simulation_agent.py.
  temp_adjustment:      NEW. Cold air near the ground favors a temperature
                        inversion — a real, well-documented driver of
                        Delhi's worst winter smog spikes, where a warm air
                        layer traps cold, pollutant-laden air below it
                        instead of letting it rise and disperse. Modeled as
                        a simple linear penalty below an 18°C threshold;
                        deliberately NOT modeling any warm-weather cooling
                        effect, since convective mixing's protective effect
                        is much less reliable to assume than the cold-
                        inversion one.
  trend_adjustment:     if AQI has been rising over the last few readings,
                        extrapolate a damped continuation (unchanged from v1).

Every forecast_station() call also returns `weather_effects`: a list of
short, human-readable sentences naming which of the above terms actually
moved the prediction and by roughly how much (Milestone 2 Task 7,
"explainability") — generated directly from the same numbers in
`components`, not a separate narrative, so it can never say something the
math doesn't back up.

This directly produces what the Evaluation Focus box asks for: "AQI forecast
accuracy at hyperlocal resolution (RMSE versus persistence baseline)" --
the evaluate_rmse() function below computes exactly that comparison, so you
have a real number to put on a slide instead of a claim.
"""
import json
import os
import glob
import math


def load_latest(pattern):
    files = sorted(glob.glob(pattern))
    if not files:
        return None
    with open(files[-1]) as f:
        return json.load(f)


def forecast_station(current_aqi, recent_readings, current_weather, horizon_hours=24):
    """
    current_aqi: float
    recent_readings: list of last N AQI values, oldest first (for trend)
    current_weather: dict with temperature (°C), humidity (%), wind_speed
                      (km/h), precipitation (mm) — as written by
                      ingestion/fetch_weather.py — or None if unavailable.
    horizon_hours: how far ahead to forecast
    """
    persistence = current_aqi

    # trend: average delta over recent readings, damped so it doesn't run away
    if len(recent_readings) >= 2:
        deltas = [recent_readings[i + 1] - recent_readings[i] for i in range(len(recent_readings) - 1)]
        avg_delta = sum(deltas) / len(deltas)
    else:
        avg_delta = 0.0
    damping = 0.5  # trend weakens the further out you forecast
    trend_adjustment = avg_delta * damping * min(horizon_hours / 6, 4)

    wind_adj = 0.0
    humidity_adj = 0.0
    rain_adj = 0.0
    temp_adj = 0.0
    wind = humidity = rain = temp = None

    if current_weather:
        wind = current_weather.get("wind_speed")
        humidity = current_weather.get("humidity")
        rain = current_weather.get("precipitation")
        temp = current_weather.get("temperature")

        if wind is not None:
            # calm wind (<10 km/h) -> pollution accumulates; brisk wind -> disperses
            wind_adj = (10 - wind) * 1.5 if wind < 10 else -(wind - 10) * 0.8
        if humidity is not None:
            # high humidity keeps particulates suspended longer
            humidity_adj = (humidity - 50) * 0.3 if humidity > 50 else 0
        if rain is not None and rain > 0:
            # wet deposition scrubs particulates out of the air; capped so one
            # extreme reading can't dominate the forecast
            rain_adj = -min(rain, 10) * 3.0
        if temp is not None and temp < 18:
            # cold air favors a ground-level temperature inversion that traps
            # pollutants instead of letting them disperse upward
            temp_adj = (18 - temp) * 1.2

    predicted = persistence + trend_adjustment + wind_adj + humidity_adj + rain_adj + temp_adj
    predicted = max(0, predicted)

    # confidence: lower with longer horizon and thinner data
    data_completeness = 1.0 if (recent_readings and current_weather) else 0.5
    horizon_penalty = max(0.3, 1 - horizon_hours / 100)
    confidence = round(data_completeness * horizon_penalty, 2)

    # confidence_factors: the same explainability treatment as weather_effects
    # below, but for WHY the confidence number is what it is — generated
    # directly from data_completeness/horizon_penalty/trend sample size, the
    # exact numbers the confidence formula above just used, so this can never
    # say something the math doesn't back up (AI Validation & Performance
    # milestone's "Factors Increasing/Reducing Confidence").
    confidence_factors = []
    if recent_readings and len(recent_readings) >= 3:
        confidence_factors.append({
            "direction": "increases",
            "text": f"{len(recent_readings)} recent readings available for trend estimation",
        })
    elif len(recent_readings) <= 1:
        confidence_factors.append({
            "direction": "reduces",
            "text": "Only a single AQI reading available — trend adjustment falls back to zero until more ingestion runs accumulate",
        })
    if current_weather:
        confidence_factors.append({
            "direction": "increases",
            "text": "Live weather data (wind/humidity/rain/temperature) available for this station",
        })
    else:
        confidence_factors.append({
            "direction": "reduces",
            "text": "No live weather data for this station — forecast relies on persistence + trend only",
        })
    if horizon_hours > 24:
        confidence_factors.append({
            "direction": "reduces",
            "text": f"{horizon_hours}h horizon — longer-range forecasts compound uncertainty",
        })
    else:
        confidence_factors.append({
            "direction": "increases",
            "text": f"{horizon_hours}h horizon is short-range, where persistence + trend are most reliable",
        })

    weather_effects = []
    if wind_adj > 2:
        weather_effects.append(f"Low wind ({wind:.1f} km/h) traps pollutants, adding {wind_adj:+.0f} AQI")
    elif wind_adj < -2:
        weather_effects.append(f"Strong wind ({wind:.1f} km/h) disperses pollutants, removing {abs(wind_adj):.0f} AQI")
    if humidity_adj > 2:
        weather_effects.append(f"Humidity contributes {humidity_adj:+.0f} AQI (keeps particulates suspended)")
    if rain_adj < -0.5:
        weather_effects.append(f"Rain ({rain:.1f}mm) reduces PM, removing {abs(rain_adj):.0f} AQI")
    if temp_adj > 2:
        weather_effects.append(f"Cool temperature ({temp:.0f}°C) favors a ground inversion, adding {temp_adj:+.0f} AQI")
    if not weather_effects:
        weather_effects.append(
            "No current weather data for this station" if not current_weather
            else "No significant weather effect at current conditions"
        )

    return {
        "horizon_hours": horizon_hours,
        "predicted_aqi": round(predicted, 1),
        "persistence_baseline": round(persistence, 1),
        "components": {
            "trend_adjustment": round(trend_adjustment, 2),
            "wind_adjustment": round(wind_adj, 2),
            "humidity_adjustment": round(humidity_adj, 2),
            "rain_adjustment": round(rain_adj, 2),
            "temp_adjustment": round(temp_adj, 2),
        },
        "confidence": confidence,
        "confidence_factors": confidence_factors,
        "weather_effects": weather_effects,
        "data_completeness": data_completeness,
        "horizon_penalty": round(horizon_penalty, 2),
    }


def evaluate_rmse(predictions, actuals, persistence_baseline):
    """
    Compare model RMSE vs persistence-baseline RMSE on a set of
    (predicted, actual) pairs collected after the fact. Run this once you
    have >24h of logged forecasts vs what AQI actually turned out to be --
    this is the number the Evaluation Focus box wants to see.
    """
    def rmse(preds, acts):
        return math.sqrt(sum((p - a) ** 2 for p, a in zip(preds, acts)) / len(preds))

    model_rmse = rmse(predictions, actuals)
    baseline_rmse = rmse(persistence_baseline, actuals)
    improvement_pct = round((1 - model_rmse / baseline_rmse) * 100, 1) if baseline_rmse else 0
    return {"model_rmse": round(model_rmse, 2), "persistence_rmse": round(baseline_rmse, 2),
            "improvement_over_baseline_pct": improvement_pct}


def main():
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    aqi_data = load_latest(os.path.join(data_dir, "aqi_stations_*.json"))
    weather_data = load_latest(os.path.join(data_dir, "weather_*.json"))

    if not aqi_data:
        print("No AQI data found — run ingestion/fetch_waqi.py first.")
        return

    # Milestone 2: weather is now one record per station (matched by
    # station_name), not one city-wide hourly forecast array.
    weather_by_station = {}
    if weather_data:
        weather_by_station = {w["station_name"]: w for w in weather_data.get("stations", [])}

    results = []
    for s in aqi_data["stations"]:
        # NOTE: recent_readings needs real history; for now seed with just
        # the current reading until you've logged a few ingestion runs
        # (data/history/aqi_delhi.jsonl accumulates this over time — see
        # backend/pipeline.py:get_station_history for reading it back).
        recent = [s["aqi"]]
        current_weather = weather_by_station.get(s["station_name"])
        f24 = forecast_station(s["aqi"], recent, current_weather, horizon_hours=24)
        f72 = forecast_station(s["aqi"], recent, current_weather, horizon_hours=72)
        results.append({"station": s["station_name"], "lat": s["lat"], "lon": s["lon"],
                         "current_aqi": s["aqi"], "forecast_24h": f24, "forecast_72h": f72})

    out_path = os.path.join(data_dir, "forecast_results.json")
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"Wrote forecasts for {len(results)} stations to {out_path}")


if __name__ == "__main__":
    main()
