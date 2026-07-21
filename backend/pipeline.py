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
data (data/aqi_stations_<city>_*.json) first, and falls back to the last
computed result file in data/ where one exists, tagging the response with
data_source so the frontend can disclose honestly whether a number is
live-computed, a cached prior run, or genuinely empty for that city.

Multi-City: every function below takes an optional `city` argument,
defaulting to city_registry.DEFAULT_CITY ("delhi") and normalized through
city_registry.normalize() (falls back to Delhi for anything unrecognized —
never a 500 over a bad/missing city). This is a pure widening of the
original single-city functions: any existing caller that doesn't pass
`city` gets EXACTLY the old Delhi behavior, byte-for-byte, including the
Delhi-only legacy cached-run fallback files from before this milestone
(attribution_results.json etc. were never written per-city, so that
fallback tier only applies when city == "delhi" — other cities go straight
from live_pipeline to empty, which is the honest "graceful degradation"
this milestone asks for rather than inventing a fallback that doesn't
exist).
"""
import datetime
import glob
import json
import os
import sys

from . import city_registry

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
import incident_agent  # noqa: E402
import task_agent  # noqa: E402
import notification_agent  # noqa: E402
import health_advisory_agent  # noqa: E402
import validation_agent  # noqa: E402
import history_store  # noqa: E402 — same JSONL history module ingestion/*.py append to

from . import auth, incident_store, task_store, notification_store


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


def get_registry(city=None):
    """
    Returns (records, data_source). Prefers the real OpenStreetMap-backed
    registry (ingestion/fetch_osm_registry.py) if it's been fetched for
    this city — data_source "live_pipeline" — else falls back to that
    city's synthetic demo registry — data_source "synthetic". Same
    "backend automatically picks up newer real data" pattern as every
    other get_* function here.
    """
    city = city_registry.normalize(city)
    real_path = _cached_path(f"registry_{city}.json")
    if os.path.exists(real_path):
        return _load_json(real_path)["records"], "live_pipeline"
    demo_path = _cached_path(f"registry_demo_{city}.json")
    if os.path.exists(demo_path):
        return _load_json(demo_path)["records"], "synthetic"
    return [], "empty"


def get_roads(city=None):
    """Returns (geojson, data_source) — major roads for the Map page's roads layer."""
    city = city_registry.normalize(city)
    path = _cached_path(f"roads_{city}.json")
    if os.path.exists(path):
        return _load_json(path), "live_pipeline"
    return {"type": "FeatureCollection", "features": []}, "empty"


def _weather_by_station(city):
    weather_data = _load_latest(f"weather_{city}_*.json")
    if not weather_data:
        return {}
    return {w["station_name"]: w for w in weather_data.get("stations", [])}


def get_attribution(city=None):
    """Returns (results, data_source) — data_source is 'live_pipeline', 'cached_run', or 'empty'."""
    city = city_registry.normalize(city)
    aqi_data = _load_latest(f"aqi_stations_{city}_*.json")
    if aqi_data is not None:
        registry, _ = get_registry(city)
        weather_by_station = _weather_by_station(city)
        results = [
            attribution_agent.attribute_station(s, registry, weather=weather_by_station.get(s["station_name"]))
            for s in aqi_data["stations"]
        ]
        results.sort(key=lambda r: -r["aqi"])
        return results, "live_pipeline"

    # Legacy, Delhi-only cached fallback from before Multi-City existed —
    # no equivalent file was ever written for any other city, so this tier
    # simply doesn't exist for them (see module docstring).
    if city == "delhi":
        cached = _cached_path("attribution_results.json")
        if os.path.exists(cached):
            return _load_json(cached), "cached_run"
    return [], "empty"


def get_forecast(city=None):
    city = city_registry.normalize(city)
    aqi_data = _load_latest(f"aqi_stations_{city}_*.json")
    if aqi_data is not None:
        weather_by_station = _weather_by_station(city)

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

    if city == "delhi":
        cached = _cached_path("forecast_results.json")
        if os.path.exists(cached):
            return _load_json(cached), "cached_run"
    return [], "empty"


def get_weather_current(city=None):
    """Returns (stations, data_source) — the latest per-station weather snapshot."""
    city = city_registry.normalize(city)
    data = _load_latest(f"weather_{city}_*.json")
    if data is not None:
        return data.get("stations", []), "live_pipeline"
    return [], "empty"


def get_weather_history(city=None, hours=24):
    """Returns (entries, data_source) — weather history entries in the requested window."""
    city = city_registry.normalize(city)
    entries = history_store.read("weather", city, hours=hours)
    return entries, ("live_pipeline" if entries else "empty")


def get_station_history(station_name, city=None, hours=24):
    """
    Returns (series, data_source) — one {"fetched_at", "aqi"} point per
    ingestion run that included this station, oldest first, from the AQI
    history log. [] (data_source "empty") if the station has never
    appeared in a logged ingestion run yet — this accumulates over time as
    fetch_waqi.py (or the scheduler) keeps running, it isn't backfilled.
    """
    city = city_registry.normalize(city)
    entries = history_store.read("aqi", city, hours=hours)
    series = []
    for entry in entries:
        for rec in entry["records"]:
            if rec["station_name"] == station_name:
                series.append({"fetched_at": entry["fetched_at"], "aqi": rec["aqi"]})
                break
    return series, ("live_pipeline" if series else "empty")


def get_city_history(city=None, hours=24):
    """
    Returns (series, data_source) — one {"fetched_at", "avg_aqi", "station_count"}
    point per ingestion run in the window, averaging across whatever
    stations that run reported.
    """
    city = city_registry.normalize(city)
    entries = history_store.read("aqi", city, hours=hours)
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


def get_enforcement(city=None):
    city = city_registry.normalize(city)
    attribution, attr_source = get_attribution(city)
    if attribution and attr_source == "live_pipeline":
        registry, _ = get_registry(city)
        recs = enforcement_agent.build_recommendations(attribution, registry)
        return recs, "live_pipeline"

    if city == "delhi":
        cached = _cached_path("enforcement_queue.json")
        if os.path.exists(cached):
            return _load_json(cached), "cached_run"
    return [], "empty"


def find_station_attribution(station_name, city=None):
    results, source = get_attribution(city)
    for r in results:
        if r["station"] == station_name:
            shares = {a["source_type"]: a["confidence"] for a in r["attribution"]}
            return r["aqi"], shares, source
    return None, None, source


def run_simulation(current_aqi, attribution_shares, reductions, rain):
    return simulation_agent.simulate(current_aqi, attribution_shares, reductions=reductions, rain=rain)


def get_incidents(city=None):
    """
    Returns (incidents, data_source) for ONE city. Same shape as every
    other get_*: reads that city's latest station data, and if it's there,
    runs the real pipeline (incident_agent.sync_incidents) to refresh open
    incidents and open any newly-qualifying ones, persists the result, and
    returns it — data_source "live_pipeline". If there's no fresh station
    data to sync against, still returns whatever is already persisted for
    this city tagged "cached_run", or "empty" if nothing has ever been
    persisted.

    incidents.json holds every city's incidents in one flat list (each
    record carries its own "city" field) — sync only ever touches this
    city's slice and always merges back with every other city's records
    before saving, so syncing Mumbai can never drop Delhi's incidents.
    """
    city = city_registry.normalize(city)
    all_existing = incident_store.load()
    existing_for_city = [i for i in all_existing if i.get("city") == city]
    other_cities = [i for i in all_existing if i.get("city") != city]

    attribution, attr_source = get_attribution(city)

    if attr_source == "live_pipeline" and attribution:
        forecast, _ = get_forecast(city)
        enforcement, _ = get_enforcement(city)
        updated_for_city = incident_agent.sync_incidents(attribution, forecast, enforcement, existing_for_city, city=city)
        if updated_for_city != existing_for_city:
            incident_store.save(other_cities + updated_for_city)
            _on_new_incidents(existing_for_city, updated_for_city, attribution, forecast)
        _check_forecast_severe(forecast, city)
        return updated_for_city, "live_pipeline"

    if existing_for_city:
        return existing_for_city, "cached_run"
    return [], "empty"


def _on_new_incidents(old_incidents, new_incidents, attribution, forecast):
    """Side effects that only fire for incidents that didn't exist before
    this sync pass: auto-generate their task checklist (task_agent.py) and
    notify every Administrator (notification_agent.py) — same "real trigger,
    not a fabricated event" standard the rest of this pipeline holds to.
    Takes the already-computed attribution/forecast from the caller instead
    of re-fetching per incident."""
    old_ids = {i["id"] for i in old_incidents}
    freshly_created = [i for i in new_incidents if i["id"] not in old_ids]
    if not freshly_created:
        return

    existing_tasks = task_store.load()
    next_seq = len(existing_tasks) + 1
    new_tasks = []
    for incident in freshly_created:
        generated = task_agent.generate_tasks_for_incident(incident, next_seq)
        new_tasks.extend(generated)
        next_seq += len(generated)
    task_store.save(existing_tasks + new_tasks)

    attribution_by_station = {a["station"]: a for a in attribution}
    forecast_by_station = {f["station"]: f for f in forecast}

    admin_ids = [u["id"] for u in auth.load_users() if u["role"] == "Administrator"]
    new_notifications = []
    for incident in freshly_created:
        station_result = attribution_by_station.get(incident["station"])
        most_affected = None
        if station_result:
            summary = health_advisory_agent.station_health_summary(station_result, forecast_by_station.get(incident["station"]))
            most_affected = summary["most_affected_group"]
        new_notifications.extend(
            notification_agent.new_incident_notifications(incident, admin_ids, most_affected_group=most_affected)
        )
    if new_notifications:
        notification_store.append(new_notifications)


def _station_result_for(station_name, city):
    attribution, attr_source = get_attribution(city)
    if attr_source not in ("live_pipeline", "cached_run"):
        return None
    return next((a for a in attribution if a["station"] == station_name), None)


def _check_forecast_severe(forecast, city):
    """Runs on every live incidents sync — a station's forecast can cross
    into Severe/Emergency independently of whether a new incident opened
    this pass. Deduped against the last 6h so this doesn't refire on every
    ~20s poll while the forecast stays elevated."""
    alerts = health_advisory_agent.forecast_severe_stations(forecast)
    if not alerts:
        return
    admin_ids = [u["id"] for u in auth.load_users() if u["role"] == "Administrator"]
    existing = notification_store.load()
    new_notifications = []
    for alert in alerts:
        link = f"/forecast?station={alert['station']}&city={city}"
        if notification_store.recent_exists(existing, "forecast_severe", link, within_hours=6):
            continue
        new_notifications.extend(notification_agent.forecast_severe_notifications(alert, admin_ids))
    if new_notifications:
        notification_store.append(new_notifications)


def get_incident(incident_id):
    """Looks the incident up by id regardless of city (ids are unique
    across cities — station names never collide between them), then uses
    the incident's OWN stored city to refresh/enrich it, so the caller
    never needs to already know which city an incident belongs to."""
    all_incidents = incident_store.load()
    incident = incident_store.find(all_incidents, incident_id)
    if incident is None:
        return None, "empty"

    city = incident.get("city") or city_registry.DEFAULT_CITY
    incidents_for_city, source = get_incidents(city)
    incident = incident_store.find(incidents_for_city, incident_id) or incident

    station_result = _station_result_for(incident["station"], city)
    forecast, _ = get_forecast(city)
    forecast_entry = next((f for f in forecast if f["station"] == incident["station"]), None)
    incident = dict(incident, health=health_advisory_agent.incident_health_summary(incident, station_result, forecast_entry))
    return incident, source


def update_incident(incident_id, status=None, resolution_notes=None):
    """Returns the updated incident, or None if incident_id doesn't exist."""
    incidents = incident_store.load()
    incident = incident_store.find(incidents, incident_id)
    if incident is None:
        return None
    was_resolved_now = status == "Resolved" and incident["status"] != "Resolved"

    updated = incident_agent.apply_status_update(incident, status=status, resolution_notes=resolution_notes)
    incidents = [updated if i["id"] == incident_id else i for i in incidents]
    incident_store.save(incidents)

    if was_resolved_now:
        recipients = {u["id"] for u in auth.load_users() if u["role"] == "Administrator"}
        if updated.get("assignment"):
            recipients.add(updated["assignment"]["officer_id"])
        notification_store.append(notification_agent.resolved_notifications(updated, list(recipients)))

    return updated


def assign_incident_to_officer(incident_id, officer_id, expected_completion_hours=None):
    """Returns the updated incident, or None if incident_id doesn't exist.
    Raises ValueError if officer_id isn't a real Pollution Control Officer —
    the router turns that into a 400, not a fabricated silent success."""
    incidents = incident_store.load()
    incident = incident_store.find(incidents, incident_id)
    if incident is None:
        return None

    officer = auth.find_user_by_id(officer_id)
    if officer is None or officer["role"] != "Pollution Control Officer":
        raise ValueError(f"'{officer_id}' is not a Pollution Control Officer on file.")

    updated = incident_agent.assign_incident(
        incident, officer_id, officer["name"], expected_completion_hours=expected_completion_hours
    )
    incidents = [updated if i["id"] == incident_id else i for i in incidents]
    incident_store.save(incidents)

    # An assignment/reassignment carries over to this incident's still-open
    # tasks, so the officer's workspace immediately shows their full workload.
    tasks = task_store.load()
    changed = False
    for t in tasks:
        if t["incident_id"] == incident_id and t["status"] != "Completed" and t["assigned_officer_id"] != officer_id:
            t["assigned_officer_id"] = officer_id
            changed = True
    if changed:
        task_store.save(tasks)

    notification_store.append([notification_agent.assignment_notification(updated, officer_id)])
    return updated


def add_incident_note(incident_id, author_id, author_name, text):
    incidents = incident_store.load()
    incident = incident_store.find(incidents, incident_id)
    if incident is None:
        return None
    updated = incident_agent.add_note(incident, author_id, author_name, text)
    incidents = [updated if i["id"] == incident_id else i for i in incidents]
    incident_store.save(incidents)
    return updated


def get_tasks(incident_id=None):
    tasks = task_store.load()
    if incident_id:
        tasks = task_store.for_incident(tasks, incident_id)
    return tasks, "live_pipeline"


def update_task(task_id, status=None, assigned_officer_id=None):
    """Returns the updated task, or None if task_id doesn't exist. Marking a
    task Completed also logs a "Task Completed" event on its parent
    incident's activity timeline (incident_agent.log_task_completed)."""
    tasks = task_store.load()
    task = task_store.find(tasks, task_id)
    if task is None:
        return None

    just_completed = status == "Completed" and task["status"] != "Completed"
    updated = task_agent.apply_task_update(task, status=status, assigned_officer_id=assigned_officer_id)
    tasks = [updated if t["id"] == task_id else t for t in tasks]
    task_store.save(tasks)

    if just_completed:
        incidents = incident_store.load()
        incident = incident_store.find(incidents, task["incident_id"])
        if incident:
            incident_updated = incident_agent.log_task_completed(incident, task["title"])
            incidents = [incident_updated if i["id"] == incident["id"] else i for i in incidents]
            incident_store.save(incidents)

    return updated


def get_notifications(user_id):
    """Returns (notifications, data_source) — persisted event-triggered
    notifications for this user, merged with live-computed "task due soon"
    ones (never persisted, see notification_agent.due_soon_notifications),
    newest first."""
    persisted = notification_store.for_user(notification_store.load(), user_id)
    my_tasks = [t for t in task_store.load() if t.get("assigned_officer_id") == user_id]
    due_soon = [
        {**n, "id": f"due-soon-{user_id}-{i}"}
        for i, n in enumerate(notification_agent.due_soon_notifications(my_tasks))
    ]
    combined = sorted(persisted + due_soon, key=lambda n: n["created_at"], reverse=True)
    return combined, "live_pipeline"


def mark_notification_read(notification_id, user_id):
    """Returns the updated notification, or None if it doesn't exist for
    this user. Synthetic "due-soon-*" ids aren't persisted records — there's
    nothing to mark, so this is a no-op returning None for those."""
    if notification_id.startswith("due-soon-"):
        return None
    notifications = notification_store.load()
    notif = next((n for n in notifications if n["id"] == notification_id and n["user_id"] == user_id), None)
    if notif is None:
        return None
    notif["read"] = True
    notification_store.save(notifications)
    return notif


def get_station_health(station_name, city=None):
    """Returns (summary, data_source) for one station — all 10 group
    advisories plus the current_risk/most_affected_group/top_recommendation/
    emergency_level rollup (health_advisory_agent.station_health_summary).
    None if the station has no live attribution result."""
    city = city_registry.normalize(city)
    attribution, attr_source = get_attribution(city)
    if attr_source != "live_pipeline":
        return None, attr_source
    station_result = next((a for a in attribution if a["station"] == station_name), None)
    if station_result is None:
        return None, attr_source
    forecast, _ = get_forecast(city)
    forecast_entry = next((f for f in forecast if f["station"] == station_name), None)
    return health_advisory_agent.station_health_summary(station_result, forecast_entry), "live_pipeline"


def get_city_health(city=None):
    """Returns (summary, data_source) — city-wide rollup for Command Center
    and the Report page: the worst station's summary stands in for
    "current risk"/"most affected group" city-wide (the same "worst station
    drives the headline" pattern citySummary() already uses on the
    frontend, see lib/report.js), plus counts of stations at each
    emergency level."""
    city = city_registry.normalize(city)
    attribution, attr_source = get_attribution(city)
    if attr_source != "live_pipeline" or not attribution:
        return None, attr_source

    forecast, _ = get_forecast(city)
    forecast_by_station = {f["station"]: f for f in forecast}

    station_summaries = [
        health_advisory_agent.station_health_summary(s, forecast_by_station.get(s["station"]))
        for s in attribution
    ]
    levels = health_advisory_agent.EMERGENCY_LEVELS
    worst = max(station_summaries, key=lambda s: levels.index(s["emergency_level"]))

    level_counts = {lvl: 0 for lvl in levels}
    for s in station_summaries:
        level_counts[s["emergency_level"]] += 1

    return {
        "current_risk": worst["current_risk"],
        "emergency_level": worst["emergency_level"],
        "most_affected_group": worst["most_affected_group"],
        "top_recommendation": worst["top_recommendation"],
        "worst_station": worst["station"],
        "worst_station_aqi": worst["aqi"],
        "station_count": len(station_summaries),
        "level_counts": level_counts,
    }, "live_pipeline"


def get_city_comparison():
    """Returns (rows, data_source) — one row per supported city (see
    city_registry.CITIES), each with current AQI, forecast AQI, incident
    count, health emergency level, dominant pollution source, most
    vulnerable population group, and a government-priority ranking —
    exactly the City Comparison page's field list, computed by calling the
    SAME get_attribution/get_forecast/get_incidents/get_city_health
    functions above once per city, not a separate aggregation pipeline.
    A city with no live data yet still gets a row (data_source "empty" for
    that city, AQI/forecast/etc. all None) — graceful degradation, not an
    omitted row, so the comparison table always shows all 6 cities."""
    rows = []
    for meta in city_registry.CITIES:
        city = meta["id"]
        attribution, attr_source = get_attribution(city)
        forecast, _ = get_forecast(city)
        incidents, _ = get_incidents(city)
        health, _ = get_city_health(city)

        if attr_source == "live_pipeline" and attribution:
            worst = attribution[0]
            forecast_entry = next((f for f in forecast if f["station"] == worst["station"]), None)
            dominant = worst["attribution"][0]["source_type"] if worst.get("attribution") else None
            rows.append({
                "city": city,
                "label": meta["label"],
                "state": meta["state"],
                "data_source": "live_pipeline",
                "current_aqi": worst["aqi"],
                "forecast_aqi": forecast_entry["forecast_24h"]["predicted_aqi"] if forecast_entry else None,
                "worst_station": worst["station"],
                "incident_count": len(incidents),
                "active_incident_count": len([i for i in incidents if i["status"] != "Resolved"]),
                "emergency_level": health["emergency_level"] if health else None,
                "dominant_source": dominant,
                "most_vulnerable_group": health["most_affected_group"] if health else None,
            })
        else:
            rows.append({
                "city": city,
                "label": meta["label"],
                "state": meta["state"],
                "data_source": attr_source,
                "current_aqi": None,
                "forecast_aqi": None,
                "worst_station": None,
                "incident_count": len(incidents),
                "active_incident_count": len([i for i in incidents if i["status"] != "Resolved"]),
                "emergency_level": None,
                "dominant_source": None,
                "most_vulnerable_group": None,
            })

    return rows, "live_pipeline"


# ---------------------------------------------------------------------------
# AI Validation & Performance — reuses forecast_agent/attribution_agent's own
# output plus the AQI/weather history ingestion already logs (history_store)
# via agents/validation_agent.py. Nothing here recomputes a forecast or an
# attribution score a second time; it backtests the SAME forecast_station()
# call against real logged history and summarizes the SAME attribution
# results every other page already reads. See validation_agent.py's module
# docstring for why this is a genuine backtest, not a fabricated metric, and
# why attribution gets a reliability signal instead of an "accuracy" one.
# ---------------------------------------------------------------------------

VALIDATION_WINDOW_HOURS = 24 * 7  # matches history_store.RETENTION_DAYS — validate over everything retained


def get_forecast_validation(city=None, station=None):
    """
    Returns (payload, data_source). payload always has the shape:
      {"pairs": [...], "metrics": {...} | None, "trend": {...}, "note": str | None}
    metrics/trend are None/"insufficient_data" (not zeroed-out numbers) when
    fewer than 2 logged snapshots exist for this city — see
    validation_agent.backtest_forecast's docstring. `station`, if given,
    filters to just that station's backtest pairs.
    """
    city = city_registry.normalize(city)
    aqi_history = history_store.read("aqi", city, hours=VALIDATION_WINDOW_HOURS)
    weather_history = history_store.read("weather", city, hours=VALIDATION_WINDOW_HOURS)

    pairs = validation_agent.backtest_forecast(aqi_history, weather_history)
    total_stations = len({rec["station_name"] for entry in aqi_history for rec in entry["records"]})

    if station:
        pairs = [p for p in pairs if p["station"] == station]

    if not pairs:
        note = (
            "Fewer than 2 AQI ingestion snapshots logged for this city yet — forecast validation needs "
            "at least 2 to backtest one prediction. This will fill in automatically as ingestion keeps running."
            if len(aqi_history) < 2
            else "No backtestable predictions for this station in the current history window."
        )
        return {"pairs": [], "metrics": None, "trend": {"trend": "insufficient_data", "sample_size": 0, "note": note}, "note": note}, "empty"

    metrics = validation_agent.compute_metrics(pairs, total_station_count=total_stations)
    trend = validation_agent.rolling_accuracy_trend(pairs)
    return {"pairs": pairs, "metrics": metrics, "trend": trend, "note": None}, "live_pipeline"


def get_attribution_reliability(city=None):
    """Returns (summary, data_source) — evidence-completeness signal over
    this city's current attribution results, see
    validation_agent.attribution_reliability's docstring for why this is
    not framed as "accuracy"."""
    city = city_registry.normalize(city)
    attribution, attr_source = get_attribution(city)
    if attr_source != "live_pipeline" or not attribution:
        return None, attr_source
    return validation_agent.attribution_reliability(attribution), "live_pipeline"


def get_model_reliability(city=None):
    """Returns (summary, data_source) — the single combined "how much
    should an officer trust this city's AI output right now" verdict:
    {"label": ..., "reasons": [...]}, reusing get_forecast_validation and
    get_attribution_reliability rather than recomputing either."""
    city = city_registry.normalize(city)
    validation, _ = get_forecast_validation(city)
    attribution_summary, _ = get_attribution_reliability(city)
    reliability = validation_agent.model_reliability_label(validation["metrics"], attribution_summary, validation["trend"])
    return reliability, "live_pipeline"


def get_system_health():
    """Returns (rows, data_source) — one row per supported city: last AQI
    sync, last weather sync, last forecast update (forecast is computed
    live from the latest AQI snapshot on every request, so this IS the same
    timestamp as last AQI sync — disclosed as such, not a separately
    tracked value), last incident sync (latest timeline event among that
    city's incidents), and data freshness in minutes. api_available is
    always true here: this function successfully running IS the
    availability check — there's nothing else to fake it with."""
    now = datetime.datetime.now(datetime.timezone.utc)
    all_incidents = incident_store.load()

    rows = []
    for meta in city_registry.CITIES:
        city = meta["id"]
        aqi_history = history_store.read("aqi", city, hours=VALIDATION_WINDOW_HOURS)
        weather_history = history_store.read("weather", city, hours=VALIDATION_WINDOW_HOURS)
        last_aqi_sync = aqi_history[-1]["fetched_at"] if aqi_history else None
        last_weather_sync = weather_history[-1]["fetched_at"] if weather_history else None

        city_incidents = [i for i in all_incidents if i.get("city") == city]
        timeline_times = [t["at"] for i in city_incidents for t in i.get("timeline", [])]
        last_incident_sync = max(timeline_times) if timeline_times else None

        freshness_minutes = None
        if last_aqi_sync:
            fetched = datetime.datetime.strptime(last_aqi_sync, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc)
            freshness_minutes = round((now - fetched).total_seconds() / 60, 1)

        rows.append({
            "city": city,
            "label": meta["label"],
            "last_aqi_sync": last_aqi_sync,
            "last_weather_sync": last_weather_sync,
            "last_forecast_update": last_aqi_sync,
            "last_incident_sync": last_incident_sync,
            "data_freshness_minutes": freshness_minutes,
            "api_available": True,
        })

    return rows, "live_pipeline"


def get_incident_prediction_review(incident_id):
    """Returns (review, data_source) for one incident:
      prediction_at_creation: {aqi, forecast_24h_aqi, created_at} — read
        straight off the incident record itself (captured at creation time
        by incident_agent.build_incident_content, never recomputed here).
      actual_conditions: the logged AQI reading closest to created_at+24h,
        or None if that much time/history hasn't accumulated yet.
      prediction_error: absolute/pct error + direction, only when actual
        is available.
      lessons_learned: a templated sentence bucketed by error magnitude —
        never invented, always traceable to prediction_error.
    None if the incident doesn't exist.
    """
    incident, source = get_incident(incident_id)
    if incident is None:
        return None, "empty"

    city = incident.get("city") or city_registry.DEFAULT_CITY
    prediction_at_creation = {
        "aqi": incident["aqi"],
        "forecast_24h_aqi": incident.get("forecast_aqi"),
        "created_at": incident["created_at"],
    }

    created = datetime.datetime.strptime(incident["created_at"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc)
    target = created + datetime.timedelta(hours=24)

    history, _ = get_station_history(incident["station"], city, hours=24 * 7)
    # closest logged reading at/after the 24h mark, preferring the nearest one
    candidates = [h for h in history if datetime.datetime.strptime(h["fetched_at"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc) >= target]

    actual_conditions = None
    prediction_error = None
    if candidates:
        actual_conditions = candidates[0]
        if incident.get("forecast_aqi") is not None:
            predicted = incident["forecast_aqi"]
            actual = actual_conditions["aqi"]
            abs_error = round(abs(predicted - actual), 1)
            pct_error = round(abs_error / actual * 100, 1) if actual else None
            direction = "over-predicted" if predicted > actual else ("under-predicted" if predicted < actual else "exact match")
            prediction_error = {"absolute_error": abs_error, "pct_error": pct_error, "direction": direction}

    if prediction_error is None:
        lessons_learned = (
            "The forecast's 24h horizon hasn't elapsed yet, or no ingestion run has logged this station's "
            "AQI since then — prediction accuracy for this incident can't be validated yet."
        )
    elif prediction_error["absolute_error"] <= 15:
        lessons_learned = f"The 24h forecast tracked closely ({prediction_error['absolute_error']} AQI points off) — this station's conditions were predictable from persistence + trend + weather."
    elif prediction_error["absolute_error"] <= 40:
        lessons_learned = f"The 24h forecast deviated moderately ({prediction_error['absolute_error']} AQI points, {prediction_error['direction']}) — likely an unmodeled weather shift or a fast-moving local source."
    else:
        lessons_learned = f"The 24h forecast deviated substantially ({prediction_error['absolute_error']} AQI points, {prediction_error['direction']}) — worth reviewing this station's inputs; the model may be missing a factor specific to this location."

    return {
        "prediction_at_creation": prediction_at_creation,
        "actual_conditions": actual_conditions,
        "prediction_error": prediction_error,
        "lessons_learned": lessons_learned,
    }, source


def get_validation_report():
    """Returns (report, data_source) for the Report page's AI Validation
    section — cross-city forecast accuracy summary, built by calling
    get_forecast_validation once per city (same function the AI Validation
    page uses), not a separate aggregation. Cities with fewer than
    validation_agent.MIN_PAIRS_FOR_TREND validated predictions are excluded
    from the most/least-accurate ranking (too little data to rank fairly)
    but still counted toward key_learnings so that's disclosed, not hidden."""
    per_city = []
    for meta in city_registry.CITIES:
        city = meta["id"]
        validation, _ = get_forecast_validation(city)
        if validation["metrics"]:
            per_city.append({"city": city, "label": meta["label"], "metrics": validation["metrics"], "trend": validation["trend"]})

    rankable = [c for c in per_city if c["metrics"]["sample_size"] >= validation_agent.MIN_PAIRS_FOR_TREND]
    most_accurate = min(rankable, key=lambda c: c["metrics"]["mae"]) if rankable else None
    least_accurate = max(rankable, key=lambda c: c["metrics"]["mae"]) if rankable else None

    confidence_distribution = [
        {"city": c["city"], "label": c["label"], "avg_confidence": c["metrics"]["avg_confidence"]} for c in per_city
    ]

    key_learnings = [
        f"{len(per_city)} of {len(city_registry.CITIES)} cities have at least one validated forecast prediction.",
    ]
    if len(rankable) >= 2:
        key_learnings.append(
            f"{most_accurate['label']} has the lowest mean absolute error ({most_accurate['metrics']['mae']} AQI points) "
            f"among cities with enough history to rank; {least_accurate['label']} has the highest ({least_accurate['metrics']['mae']})."
        )
    elif len(rankable) == 1:
        key_learnings.append(
            f"Only {rankable[0]['label']} has enough validated predictions to rank so far "
            f"(MAE {rankable[0]['metrics']['mae']} AQI points) — other cities will join the ranking as their history accumulates."
        )
    else:
        key_learnings.append(
            f"No city yet has {validation_agent.MIN_PAIRS_FOR_TREND}+ validated predictions — accuracy ranking will "
            "become meaningful as ingestion keeps accumulating history across cities."
        )
    improving = [c["label"] for c in per_city if c["trend"].get("trend") == "improving"]
    degrading = [c["label"] for c in per_city if c["trend"].get("trend") == "degrading"]
    if improving:
        key_learnings.append(f"Improving accuracy trend: {', '.join(improving)}.")
    if degrading:
        key_learnings.append(f"Degrading accuracy trend, worth review: {', '.join(degrading)}.")

    return {
        "per_city": per_city,
        "most_accurate_city": most_accurate,
        "least_accurate_city": least_accurate,
        "confidence_distribution": confidence_distribution,
        "key_learnings": key_learnings,
    }, ("live_pipeline" if per_city else "empty")
