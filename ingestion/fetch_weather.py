"""
Fetches CURRENT weather conditions for every AQI monitoring station, using
Open-Meteo's `current=` parameter — temperature, humidity, wind speed,
wind direction, and precipitation. Free, no API key, no signup.

Milestone 2 change from the original version of this script: it used to
fetch one city-wide hourly *forecast* array from a single lat/lon you
passed on the command line. It now fetches CURRENT conditions at every
individual AQI station's own coordinates instead, matched one-to-one
against the station list from the most recent aqi_stations_*.json (by
station_name) — so the Forecast Agent can reason about "this station's
weather," not one city-wide average. Wind and humidity matter most:
pollution disperses fast in high wind and stagnates in low wind; rain
scrubs particulates out of the air; cold nights favor the ground-level
temperature inversions behind Delhi's worst winter smog.

Usage:
    python fetch_weather.py --city delhi

Output: data/weather_<city>_<timestamp>.json, plus one entry appended to
data/history/weather_<city>.jsonl (see history_store.py).
"""
import os
import sys
import json
import argparse
import datetime
import urllib.request
import urllib.error

import history_store

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
CURRENT_FIELDS = "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation"


def fetch_current(lat, lon):
    """Current conditions for one point. Raises on network/HTTP/malformed-response
    failure — callers catch this per-station so one bad station doesn't abort
    the whole run (see run_ingestion below)."""
    url = f"{OPEN_METEO_URL}?latitude={lat}&longitude={lon}&current={CURRENT_FIELDS}&timezone=auto"
    with urllib.request.urlopen(url, timeout=15) as resp:
        payload = json.load(resp)
    current = payload.get("current")
    if not current:
        raise RuntimeError(f"Open-Meteo response missing 'current': {payload}")
    return current


def _load_latest_stations(city):
    """Reuses the exact station list the most recent AQI ingestion wrote, so
    weather is fetched at the same coordinates and lines up by station_name
    downstream — not a separate, potentially-mismatched station list."""
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    if not os.path.isdir(data_dir):
        return None
    prefix, suffix = f"aqi_stations_{city}_", ".json"
    candidates = [
        os.path.join(data_dir, f) for f in os.listdir(data_dir)
        if f.startswith(prefix) and f.endswith(suffix)
    ]
    if not candidates:
        return None
    newest = max(candidates, key=os.path.getmtime)
    with open(newest) as f:
        return json.load(f)


def run_ingestion(city="delhi", stations=None):
    """
    Core ingestion logic, separated from argparse — used by main() below and
    by ingestion/scheduler.py.

    stations: optional explicit list of {"station_name","lat","lon"} dicts;
    if omitted, reads the latest aqi_stations_<city>_*.json.

    Returns (out_path, records, failed). out_path is None if there was no
    station list to work from, or every station's fetch failed — in which
    case failed[] explains why, and nothing is written (never overwrite a
    good prior snapshot with an empty one).
    """
    if stations is None:
        aqi_data = _load_latest_stations(city)
        if aqi_data is None:
            print(f"No aqi_stations_{city}_*.json found — run fetch_waqi.py first.", file=sys.stderr)
            return None, [], []
        stations = aqi_data["stations"]

    records = []
    failed = []
    for s in stations:
        name = s.get("station_name", "unknown")
        try:
            current = fetch_current(s["lat"], s["lon"])
        except (urllib.error.URLError, TimeoutError, RuntimeError, ValueError, KeyError, OSError) as exc:
            # Network hiccup, timeout, or a malformed response for this one
            # station only — log it and keep going. A single flaky station
            # shouldn't abort weather for the whole city.
            failed.append({"station_name": name, "error": str(exc)})
            continue

        records.append({
            "station_name": name,
            "lat": s["lat"],
            "lon": s["lon"],
            "temperature": current.get("temperature_2m"),
            "humidity": current.get("relative_humidity_2m"),
            "wind_speed": current.get("wind_speed_10m"),
            "wind_direction": current.get("wind_direction_10m"),
            "precipitation": current.get("precipitation"),
            "observed_at": current.get("time"),
        })

    if not records:
        print(f"ERROR: weather fetch failed for all {len(stations)} station(s) — nothing written.",
              file=sys.stderr)
        return None, [], failed

    now = datetime.datetime.now(datetime.timezone.utc)
    ts = now.strftime("%Y%m%dT%H%M%SZ")
    out_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"weather_{city}_{ts}.json")
    with open(out_path, "w") as f:
        json.dump({"city": city, "fetched_at": ts, "stations": records}, f, indent=2)

    history_store.append("weather", city, history_store.now_iso(), records)

    print(f"Wrote weather for {len(records)} station(s) to {out_path}")
    if failed:
        print(f"{len(failed)} station(s) failed and were skipped:")
        for item in failed:
            print(f"  - {item['station_name']}: {item['error']}")
    print("The backend picks this up automatically on the next request — "
          "no restart needed (see backend/pipeline.py:_load_latest).")

    return out_path, records, failed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--city", default="delhi",
                     help="Must match a city already ingested via fetch_waqi.py")
    args = ap.parse_args()

    out_path, records, failed = run_ingestion(city=args.city)
    if out_path is None:
        sys.exit(1)


if __name__ == "__main__":
    main()
