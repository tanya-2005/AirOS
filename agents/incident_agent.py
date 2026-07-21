"""
Incident Agent
--------------
Turns live attribution + forecast + enforcement output into operational
Incidents — the government-workflow object a Pollution Control Board
actually works off of (assign, investigate, resolve), on top of the
read-only intelligence the rest of the pipeline already produces.

An incident is opened for a station when EITHER:
  - its AQI crosses aqi_threshold (default: entering the CPCB "Poor" band), OR
  - the enforcement agent flagged a high-priority, evidence-backed action for
    it (priority_score >= HIGH_PRIORITY_SCORE)
and the station doesn't already have an unresolved incident open — incidents
are not regenerated every poll, only created once per active pollution event
per station. This mirrors the same "compute fresh from latest data" pattern
every other agent uses (see attribution_agent.py, enforcement_agent.py), the
only difference is the result here is a persisted, mutable record instead of
a fully-recomputed one — see backend/incident_store.py for the file I/O side
of that (this module does no I/O itself).

Severity/priority reuse the exact vocabulary already used elsewhere in this
project (CPCB bands -> Low/Medium/High/Critical risk, the same mapping
dashboard-react/src/lib/decision.js's riskLevel() uses) and
enforcement_agent.severity_score()/ACTION_TEMPLATES for the priority score
and recommended action, rather than inventing a second scale or duplicating
that logic.
"""
import datetime
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from enforcement_agent import ACTION_TEMPLATES, severity_score  # reuse, don't duplicate

DEFAULT_AQI_THRESHOLD = 150  # upper CPCB "Moderate" band — CPCB's own bulletin language at
# this level already reads "may cause breathing discomfort to people with lung disease,
# asthma and heart disease," which is a defensible real-world trigger for a PCB to open an
# operational case rather than waiting for "Poor" — configurable via the aqi_threshold param below
HIGH_PRIORITY_SCORE = 0.5  # enforcement priority_score cutoff that alone justifies opening an incident

ACTIVE_STATUSES = {"Open", "Assigned", "In Progress"}
STATUSES = {"Open", "Assigned", "In Progress", "Resolved"}

CPCB_BANDS = [
    (0, 50, "Good"), (51, 100, "Satisfactory"), (101, 200, "Moderate"),
    (201, 300, "Poor"), (301, 400, "Very Poor"), (401, 10_000, "Severe"),
]
RISK_BY_CATEGORY = {
    "Good": "Low", "Satisfactory": "Low", "Moderate": "Medium",
    "Poor": "High", "Very Poor": "High", "Severe": "Critical",
}
PRIORITY_BANDS = [(0.8, "Critical"), (0.5, "High"), (0.25, "Medium"), (0.0, "Low")]


def category_for(aqi):
    for lo, hi, label in CPCB_BANDS:
        if lo <= aqi <= hi:
            return label
    return "Severe"


def severity_for(aqi):
    return RISK_BY_CATEGORY[category_for(aqi)]


def priority_label(score):
    for cutoff, label in PRIORITY_BANDS:
        if score >= cutoff:
            return label
    return "Low"


def _slugify(station_name):
    slug = re.sub(r"[^a-z0-9]+", "-", station_name.lower()).strip("-")
    return slug[:24] or "station"


def _now_iso():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _add_hours(iso, hours):
    dt = datetime.datetime.strptime(iso, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc)
    return (dt + datetime.timedelta(hours=hours)).strftime("%Y-%m-%dT%H:%M:%SZ")


# Expected-completion SLA windows by priority — same disclosed-heuristic
# standard as SLA_STEP_HOURS in task_agent.py; a Critical case is expected
# to close out in hours, a Low one within a few days.
PRIORITY_SLA_HOURS = {"Critical": 4, "High": 12, "Medium": 24, "Low": 72}


def _dominant_source(station_result):
    attribution = station_result.get("attribution") or []
    return attribution[0] if attribution else None


def _best_enforcement_for(station_name, enforcement_results):
    matches = [e for e in enforcement_results if e["station"] == station_name]
    if not matches:
        return None
    return max(matches, key=lambda e: e["priority_score"])


def build_incident_content(station_result, forecast_entry, enforcement_item, city="delhi"):
    """
    Builds the descriptive fields of a new incident (everything except
    id/status/timeline/created_at, which the caller assigns on insert).
    Pure function of already-computed pipeline output — no fabrication:
    every sentence in ai_summary names a real field it's quoting.

    `city` is the lowercase city id (e.g. "mumbai") matching every other
    city-scoped filename/field in this project — NOT a display label; the
    frontend formats it via its own city registry, same as everywhere else
    a station/source name gets title-cased for display.
    """
    aqi = station_result["aqi"]
    dominant = _dominant_source(station_result)
    dominant_type = dominant["source_type"] if dominant else None
    forecast_aqi = forecast_entry["forecast_24h"]["predicted_aqi"] if forecast_entry else None

    if enforcement_item:
        priority_score = enforcement_item["priority_score"]
        recommended_action = enforcement_item["action"]
    else:
        priority_score = severity_score(aqi)
        template = ACTION_TEMPLATES.get(dominant_type)
        recommended_action = (
            template["action"] if template else "Dispatch a field inspection team to confirm source and assess"
        )

    summary_parts = [f"AQI at {station_result['station']} reached {round(aqi)} ({category_for(aqi)})."]
    if dominant:
        summary_parts.append(
            f"Attribution scoring assigns {round(dominant['confidence'] * 100)}% of the explained signal to "
            f"{dominant_type.replace('_', ' ')}."
        )
    else:
        summary_parts.append("No registry source falls within the 3km attribution radius for this station.")
    if forecast_aqi is not None:
        trend = "worsen toward" if forecast_aqi > aqi + 2 else "ease toward" if forecast_aqi < aqi - 2 else "hold near"
        summary_parts.append(f"Absent intervention, the 24h forecast has it {trend} {round(forecast_aqi)}.")

    return {
        "title": f"{category_for(aqi)} air quality at {station_result['station']}",
        "city": city,
        "station": station_result["station"],
        "lat": forecast_entry.get("lat") if forecast_entry else None,
        "lon": forecast_entry.get("lon") if forecast_entry else None,
        "aqi": aqi,
        "forecast_aqi": forecast_aqi,
        "severity": severity_for(aqi),
        "priority": priority_label(priority_score),
        "priority_score": priority_score,
        "dominant_source": dominant_type,
        "ai_summary": " ".join(summary_parts),
        "recommended_action": recommended_action,
    }


def sync_incidents(attribution_results, forecast_results, enforcement_results,
                    existing_incidents, city="delhi", aqi_threshold=DEFAULT_AQI_THRESHOLD, now=None):
    """
    Given fresh pipeline output and the currently-persisted incident list,
    returns a new list: still-open incidents refreshed with the latest
    aqi/forecast_aqi (logging a "Forecast Updated" timeline event when the
    forecast actually moved), plus a newly-opened incident appended for any
    station that now qualifies and doesn't already have one active. Pure
    function — no file I/O, no randomness; incident_store.py persists the
    result. Deleting/losing incidents never happens here, so `id` sequencing
    is a simple monotonic counter seeded from how many already exist.

    Multi-City: `existing_incidents` is expected to already be filtered to
    just this city (backend/pipeline.py::get_incidents does that filtering)
    — this function has no notion of "every city," it just tags new
    incidents with the given `city` id.
    """
    now = now or _now_iso()
    forecast_by_station = {f["station"]: f for f in forecast_results}
    attribution_by_station = {a["station"]: a for a in attribution_results}
    incidents = [dict(i, timeline=list(i["timeline"])) for i in existing_incidents]

    active_by_station = {i["station"]: i for i in incidents if i["status"] in ACTIVE_STATUSES}

    for inc in incidents:
        if inc["status"] not in ACTIVE_STATUSES:
            continue
        station_result = attribution_by_station.get(inc["station"])
        forecast_entry = forecast_by_station.get(inc["station"])
        if not station_result:
            continue
        inc["aqi"] = station_result["aqi"]
        new_forecast_aqi = forecast_entry["forecast_24h"]["predicted_aqi"] if forecast_entry else None
        if new_forecast_aqi is not None:
            moved = inc.get("forecast_aqi") is None or abs(new_forecast_aqi - inc["forecast_aqi"]) >= 1
            inc["forecast_aqi"] = new_forecast_aqi
            if moved:
                inc["timeline"].append({
                    "event": "Forecast Updated", "at": now,
                    "detail": f"24h forecast now {round(new_forecast_aqi)} AQI",
                })

    next_seq = len(incidents) + 1
    for station_result in attribution_results:
        station = station_result["station"]
        if station in active_by_station:
            continue
        aqi = station_result["aqi"]
        enforcement_item = _best_enforcement_for(station, enforcement_results)
        qualifies_aqi = aqi >= aqi_threshold
        qualifies_enforcement = enforcement_item is not None and enforcement_item["priority_score"] >= HIGH_PRIORITY_SCORE
        if not (qualifies_aqi or qualifies_enforcement):
            continue

        content = build_incident_content(station_result, forecast_by_station.get(station), enforcement_item, city=city)
        incident = {
            "id": f"INC-{_slugify(station)}-{next_seq:04d}",
            "status": "Open",
            "created_at": now,
            "resolution_notes": None,
            "assignment": None,
            "internal_notes": [],
            "timeline": [
                {"event": "Incident Created", "at": now, "detail": content["ai_summary"]},
                {"event": "AI Investigation Generated", "at": now,
                 "detail": "Deterministic investigation compiled from live attribution, forecast, and weather data."},
                {"event": "Inspection Pending", "at": now,
                 "detail": f"Recommended action: {content['recommended_action']}"},
            ],
            **content,
        }
        next_seq += 1
        incidents.append(incident)

    return incidents


def apply_status_update(incident, status=None, resolution_notes=None, now=None):
    """Returns a new incident dict with the status/notes applied and a
    matching timeline event appended — never mutates the input in place."""
    now = now or _now_iso()
    updated = dict(incident, timeline=list(incident["timeline"]))

    if status and status != incident["status"]:
        if status not in STATUSES:
            raise ValueError(f"Unknown status: {status}")
        updated["status"] = status
        updated["timeline"].append({
            "event": status, "at": now,
            "detail": resolution_notes if status == "Resolved" else None,
        })

    if resolution_notes is not None:
        updated["resolution_notes"] = resolution_notes

    return updated


def assign_incident(incident, officer_id, officer_name, expected_completion_hours=None, now=None):
    """Returns a new incident dict with `assignment` set and an "Assigned to
    Officer" timeline event appended — never mutates the input."""
    now = now or _now_iso()
    hours = (
        expected_completion_hours
        if expected_completion_hours is not None
        else PRIORITY_SLA_HOURS.get(incident["priority"], PRIORITY_SLA_HOURS["Medium"])
    )
    expected_completion = _add_hours(now, hours)
    updated = dict(incident, timeline=list(incident["timeline"]))
    updated["assignment"] = {
        "officer_id": officer_id,
        "officer_name": officer_name,
        "assigned_at": now,
        "priority": incident["priority"],
        "expected_completion": expected_completion,
    }
    updated["timeline"].append({
        "event": "Assigned to Officer", "at": now,
        "detail": f"Assigned to {officer_name} — expected completion by {expected_completion}",
    })
    return updated


def add_note(incident, author_id, author_name, text, now=None):
    """Internal notes are additive annotations, not part of the activity
    timeline (see module docstring) — they don't represent a workflow
    event, just an operator's running commentary on the case."""
    now = now or _now_iso()
    updated = dict(incident, internal_notes=list(incident.get("internal_notes", [])))
    updated["internal_notes"].append({
        "id": f"NOTE-{len(updated['internal_notes']) + 1:03d}",
        "author_id": author_id,
        "author_name": author_name,
        "text": text,
        "at": now,
    })
    return updated


def log_task_completed(incident, task_title, now=None):
    """Appends a "Task Completed" timeline event — called by
    pipeline.update_task() whenever a task attached to this incident is
    marked Completed, so the activity feed reflects real task progress."""
    now = now or _now_iso()
    updated = dict(incident, timeline=list(incident["timeline"]))
    updated["timeline"].append({"event": "Task Completed", "at": now, "detail": task_title})
    return updated
