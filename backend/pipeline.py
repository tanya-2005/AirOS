"""
Bridges the FastAPI app to the existing agents/ package WITHOUT modifying a
single line of agent code. The agent scripts already assume they're run as
`python attribution_agent.py` from inside agents/ (they glob `../data/*.json`
relative to their own file, and enforcement_agent.py does
`sys.path.insert(0, os.path.dirname(__file__))` to import simulation_agent
as a top-level module). We replicate exactly that sys.path setup here once,
then import the same modules the same way, so their internal relative
imports and relative data paths keep working unchanged.

Each get_*() function tries to run the real pipeline against fresh station
data (data/aqi_stations_*.json) first. Today that file doesn't exist yet in
this repo (ingestion hasn't been run against a live WAQI token — see the
README), so every function falls back to the last computed result file in
data/ and tags the response with data_source so the frontend can disclose
honestly whether a number is live-computed or a cached prior run, instead of
silently presenting stale demo numbers as real-time.
"""
import glob
import json
import os
import sys

AGENTS_DIR = os.path.join(os.path.dirname(__file__), "..", "agents")
INGESTION_DIR = os.path.join(os.path.dirname(__file__), "..", "ingestion")
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

if AGENTS_DIR not in sys.path:
    sys.path.insert(0, os.path.abspath(AGENTS_DIR))
if INGESTION_DIR not in sys.path:
    sys.path.insert(0, os.path.abspath(INGESTION_DIR))

import attribution_agent  # noqa: E402
import forecast_agent  # noqa: E402
import enforcement_agent  # noqa: E402
import simulation_agent  # noqa: E402
import history_store  # noqa: E402 — same JSONL history module ingestion/*.py append to

# Every get_* function below is Delhi-specific today, same as get_registry()
# already was before this milestone (registry_demo_delhi.json). Add a --city
# argument here and thread it through if/when a second city is ingested.
CITY = "delhi"


def _load_json(path):
    with open(path) as f:
        return json.load(f)


def _load_latest(pattern):
    """Picks the most recently *written* matching file, not just the one that
    sorts last alphabetically — filename sort silently breaks the moment two
    different cities' files coexist (e.g. "aqi_stations_delhi_..." always
    sorts before "aqi_stations_mumbai_..." regardless of fetch order)."""
    files = glob.glob(os.path.join(DATA_DIR, pattern))
    if not files:
        return None
    newest = max(files, key=os.path.getmtime)
    return _load_json(newest)


def _cached_path(name):
    return os.path.join(DATA_DIR, name)


def get_registry():
    """
    Returns (records, data_source). Milestone 3: prefers the real
    OpenStreetMap-backed registry (ingestion/fetch_osm_registry.py) if it's
    been fetched — data_source "live_pipeline" — else falls back to the
    original all-synthetic demo registry — data_source "synthetic",
    unchanged from before this milestone. Same "backend automatically picks
    up newer real data" pattern as every other get_* function here.
    """
    real_path = _cached_path("registry_delhi.json")
    if os.path.exists(real_path):
        return _load_json(real_path)["records"], "live_pipeline"
    return _load_json(_cached_path("registry_demo_delhi.json"))["records"], "synthetic"


def get_roads():
    """Returns (geojson, data_source) — major roads for the Map page's roads layer (Milestone 3)."""
    path = _cached_path("roads_delhi.json")
    if os.path.exists(path):
        return _load_json(path), "live_pipeline"
    return {"type": "FeatureCollection", "features": []}, "empty"


def _weather_by_station():
    weather_data = _load_latest("weather_*.json")
    if not weather_data:
        return {}
    return {w["station_name"]: w for w in weather_data.get("stations", [])}


def get_attribution():
    """Returns (results, data_source) — data_source is 'live_pipeline' or 'cached_run'."""
    aqi_data = _load_latest("aqi_stations_*.json")
    if aqi_data is not None:
        registry, _ = get_registry()
        weather_by_station = _weather_by_station()
        results = [
            attribution_agent.attribute_station(s, registry, weather=weather_by_station.get(s["station_name"]))
            for s in aqi_data["stations"]
        ]
        results.sort(key=lambda r: -r["aqi"])
        return results, "live_pipeline"

    cached = _cached_path("attribution_results.json")
    if os.path.exists(cached):
        return _load_json(cached), "cached_run"
    return [], "empty"


def get_forecast():
    aqi_data = _load_latest("aqi_stations_*.json")
    if aqi_data is not None:
        # Milestone 2: weather is one record per station (matched by
        # station_name), not a single city-wide hourly forecast array.
        weather_by_station = _weather_by_station()

        results = []
        for s in aqi_data["stations"]:
            recent = [s["aqi"]]
            current_weather = weather_by_station.get(s["station_name"])
            f24 = forecast_agent.forecast_station(s["aqi"], recent, current_weather, horizon_hours=24)
            f72 = forecast_agent.forecast_station(s["aqi"], recent, current_weather, horizon_hours=72)
            results.append(
                {
                    "station": s["station_name"],
                    "lat": s["lat"],
                    "lon": s["lon"],
                    "current_aqi": s["aqi"],
                    "forecast_24h": f24,
                    "forecast_72h": f72,
                }
            )
        return results, "live_pipeline"

    cached = _cached_path("forecast_results.json")
    if os.path.exists(cached):
        return _load_json(cached), "cached_run"
    return [], "empty"


def get_weather_current():
    """Returns (stations, data_source) — the latest per-station weather snapshot."""
    data = _load_latest("weather_*.json")
    if data is not None:
        return data.get("stations", []), "live_pipeline"
    return [], "empty"


def get_weather_history(hours=24):
    """Returns (entries, data_source) — weather history entries in the requested window."""
    entries = history_store.read("weather", CITY, hours=hours)
    return entries, ("live_pipeline" if entries else "empty")


def get_station_history(station_name, hours=24):
    """
    Returns (series, data_source) — one {"fetched_at", "aqi"} point per
    ingestion run that included this station, oldest first, from the AQI
    history log. [] (data_source "empty") if the station has never
    appeared in a logged ingestion run yet — this accumulates over time as
    fetch_waqi.py (or the scheduler) keeps running, it isn't backfilled.
    """
    entries = history_store.read("aqi", CITY, hours=hours)
    series = []
    for entry in entries:
        for rec in entry["records"]:
            if rec["station_name"] == station_name:
                series.append({"fetched_at": entry["fetched_at"], "aqi": rec["aqi"]})
                break
    return series, ("live_pipeline" if series else "empty")


def get_city_history(hours=24):
    """
    Returns (series, data_source) — one {"fetched_at", "avg_aqi", "station_count"}
    point per ingestion run in the window, averaging across whatever
    stations that run reported.
    """
    entries = history_store.read("aqi", CITY, hours=hours)
    series = []
    for entry in entries:
        readings = [rec["aqi"] for rec in entry["records"]]
        if not readings:
            continue
        series.append({
            "fetched_at": entry["fetched_at"],
            "avg_aqi": round(sum(readings) / len(readings), 1),
            "station_count": len(readings),
        })
    return series, ("live_pipeline" if series else "empty")


def get_enforcement():
    attribution, attr_source = get_attribution()
    if attribution and attr_source == "live_pipeline":
        registry, _ = get_registry()
        recs = enforcement_agent.build_recommendations(attribution, registry)
        return recs, "live_pipeline"

    cached = _cached_path("enforcement_queue.json")
    if os.path.exists(cached):
        return _load_json(cached), "cached_run"
    return [], "empty"


def find_station_attribution(station_name):
    results, source = get_attribution()
    for r in results:
        if r["station"] == station_name:
            shares = {a["source_type"]: a["confidence"] for a in r["attribution"]}
            return r["aqi"], shares, source
    return None, None, source


def run_simulation(current_aqi, attribution_shares, reductions, rain):
    return simulation_agent.simulate(current_aqi, attribution_shares, reductions=reductions, rain=rain)
