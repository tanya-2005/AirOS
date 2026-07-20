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
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

if AGENTS_DIR not in sys.path:
    sys.path.insert(0, os.path.abspath(AGENTS_DIR))

import attribution_agent  # noqa: E402
import forecast_agent  # noqa: E402
import enforcement_agent  # noqa: E402
import simulation_agent  # noqa: E402


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
    return _load_json(_cached_path("registry_demo_delhi.json"))["records"]


def get_attribution():
    """Returns (results, data_source) — data_source is 'live_pipeline' or 'cached_run'."""
    aqi_data = _load_latest("aqi_stations_*.json")
    if aqi_data is not None:
        registry = get_registry()
        results = [attribution_agent.attribute_station(s, registry) for s in aqi_data["stations"]]
        results.sort(key=lambda r: -r["aqi"])
        return results, "live_pipeline"

    cached = _cached_path("attribution_results.json")
    if os.path.exists(cached):
        return _load_json(cached), "cached_run"
    return [], "empty"


def get_forecast():
    aqi_data = _load_latest("aqi_stations_*.json")
    weather_data = _load_latest("weather_*.json")
    if aqi_data is not None:
        hourly = weather_data.get("hourly") if weather_data else None
        results = []
        for s in aqi_data["stations"]:
            recent = [s["aqi"]]
            f24 = forecast_agent.forecast_station(s["aqi"], recent, hourly, horizon_hours=24)
            f72 = forecast_agent.forecast_station(s["aqi"], recent, hourly, horizon_hours=72)
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


def get_enforcement():
    attribution, attr_source = get_attribution()
    if attribution and attr_source == "live_pipeline":
        registry = get_registry()
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
