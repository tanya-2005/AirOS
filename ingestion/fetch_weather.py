"""
Fetches meteorological forecast data (wind speed/direction, temperature,
humidity, boundary layer height) needed as inputs to the Forecasting Agent's
dispersion model. Uses Open-Meteo — free, no API key, no signup.

Wind speed/direction matter most: pollution disperses fast in high wind and
stagnates in low wind, and direction tells you which wards downwind of a
source will see AQI rise next.

Usage:
    python fetch_weather.py --lat 28.65 --lon 77.20 --hours 72
"""
import os
import json
import argparse
import datetime
import urllib.request

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


def fetch_forecast(lat, lon, hours=72):
    params = (
        f"latitude={lat}&longitude={lon}"
        "&hourly=temperature_2m,relative_humidity_2m,windspeed_10m,"
        "winddirection_10m,surface_pressure,boundary_layer_height"
        f"&forecast_hours={hours}&timezone=auto"
    )
    url = f"{OPEN_METEO_URL}?{params}"
    with urllib.request.urlopen(url, timeout=15) as resp:
        return json.load(resp)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lat", type=float, required=True)
    ap.add_argument("--lon", type=float, required=True)
    ap.add_argument("--hours", type=int, default=72)
    ap.add_argument("--label", default="location")
    args = ap.parse_args()

    data = fetch_forecast(args.lat, args.lon, args.hours)

    ts = datetime.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    out_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"weather_{args.label}_{ts}.json")
    with open(out_path, "w") as f:
        json.dump(data, f, indent=2)

    print(f"Wrote forecast to {out_path}")
    if "hourly" in data:
        n = len(data["hourly"].get("time", []))
        print(f"{n} hourly timesteps retrieved.")


if __name__ == "__main__":
    main()
