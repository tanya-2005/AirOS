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

Model v1 (heuristic, explainable, defensible to judges):
  forecast(t+h) = persistence(t) + wind_adjustment + humidity_adjustment
                  + trend_adjustment

  wind_adjustment: higher forecast wind speed -> lower AQI (dispersion)
  humidity_adjustment: higher humidity -> particulates stay suspended -> +AQI
  trend_adjustment: if AQI has been rising over the last few readings,
                     extrapolate a damped continuation

This directly produces what the Evaluation Focus box asks for: "AQI forecast
accuracy at hyperlocal resolution (RMSE versus persistence baseline)" --
the evaluate() function below computes exactly that comparison, so you have
a real number to put on a slide instead of a claim.
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


def forecast_station(current_aqi, recent_readings, weather_hourly, horizon_hours=24):
    """
    current_aqi: float
    recent_readings: list of last N AQI values, oldest first (for trend)
    weather_hourly: dict from Open-Meteo response ["hourly"] with windspeed_10m,
                     relative_humidity_2m arrays
    horizon_hours: how far ahead to forecast
    """
    persistence = current_aqi

    # trend: average delta over recent readings, damped so it doesn't run away
    if len(recent_readings) >= 2:
        deltas = [recent_readings[i+1] - recent_readings[i] for i in range(len(recent_readings)-1)]
        avg_delta = sum(deltas) / len(deltas)
    else:
        avg_delta = 0.0
    damping = 0.5  # trend weakens the further out you forecast
    trend_adjustment = avg_delta * damping * min(horizon_hours / 6, 4)

    # weather adjustment at the target hour
    wind_adj, humidity_adj = 0.0, 0.0
    if weather_hourly:
        idx = min(horizon_hours, len(weather_hourly.get("windspeed_10m", [])) - 1)
        if idx >= 0:
            wind = weather_hourly["windspeed_10m"][idx]
            humidity = weather_hourly["relative_humidity_2m"][idx]
            # calm wind (<5 km/h) -> pollution accumulates; strong wind (>20) -> disperses
            wind_adj = (10 - wind) * 1.5 if wind < 10 else -(wind - 10) * 0.8
            # high humidity keeps particulates suspended longer
            humidity_adj = (humidity - 50) * 0.3 if humidity > 50 else 0

    predicted = persistence + trend_adjustment + wind_adj + humidity_adj
    predicted = max(0, predicted)

    # confidence: lower with longer horizon and thinner data
    data_completeness = 1.0 if (recent_readings and weather_hourly) else 0.5
    horizon_penalty = max(0.3, 1 - horizon_hours / 100)
    confidence = round(data_completeness * horizon_penalty, 2)

    return {
        "horizon_hours": horizon_hours,
        "predicted_aqi": round(predicted, 1),
        "persistence_baseline": round(persistence, 1),
        "components": {
            "trend_adjustment": round(trend_adjustment, 2),
            "wind_adjustment": round(wind_adj, 2),
            "humidity_adjustment": round(humidity_adj, 2),
        },
        "confidence": confidence,
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
    aqi_data = load_latest(os.path.join(os.path.dirname(__file__), "..", "data", "aqi_stations_*.json"))
    weather_data = load_latest(os.path.join(os.path.dirname(__file__), "..", "data", "weather_*.json"))

    if not aqi_data:
        print("No AQI data found — run ingestion/fetch_waqi.py first.")
        return

    hourly = weather_data.get("hourly") if weather_data else None
    results = []
    for s in aqi_data["stations"]:
        # NOTE: recent_readings needs real history; for now seed with just
        # the current reading until you've logged a few ingestion runs
        recent = [s["aqi"]]
        f24 = forecast_station(s["aqi"], recent, hourly, horizon_hours=24)
        f72 = forecast_station(s["aqi"], recent, hourly, horizon_hours=72)
        results.append({"station": s["station_name"], "lat": s["lat"], "lon": s["lon"],
                         "current_aqi": s["aqi"], "forecast_24h": f24, "forecast_72h": f72})

    out_path = os.path.join(os.path.dirname(__file__), "..", "data", "forecast_results.json")
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"Wrote forecasts for {len(results)} stations to {out_path}")


if __name__ == "__main__":
    main()
