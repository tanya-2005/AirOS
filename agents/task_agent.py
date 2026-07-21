"""
Task Agent
----------
Turns a new Incident into the standard operational checklist a Pollution
Control Officer actually works through in the field: inspect the flagged
source, collect samples, document it, verify the source, file the report.
Same "auditable, not invented" standard as every other agent here — the
first, most important task is parameterized by the incident's real
dominant_source/station (not a generic placeholder), and the SLA due-times
are a disclosed heuristic keyed off the incident's real priority, not a
fixed arbitrary schedule.

Pure functions, no file I/O (see backend/task_store.py for persistence) —
same split as incident_agent.py/incident_store.py.
"""
import datetime

# Hours between consecutive checklist steps, by incident priority — a
# Critical case's officer is expected to move through the checklist much
# faster than a Low one. Disclosed assumption, not measured; tune freely.
SLA_STEP_HOURS = {"Critical": 2, "High": 4, "Medium": 8, "Low": 16}

TASK_STATUSES = {"Pending", "In Progress", "Completed"}


def _now_iso():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _add_hours(iso, hours):
    dt = datetime.datetime.strptime(iso, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc)
    return (dt + datetime.timedelta(hours=hours)).strftime("%Y-%m-%dT%H:%M:%SZ")


def checklist_titles(incident):
    source_label = (incident.get("dominant_source") or "the flagged source").replace("_", " ")
    station = incident["station"]
    return [
        f"Inspect {source_label} near {station}",
        f"Collect AQI samples at {station}",
        f"Photograph violation at {station}",
        f"Verify emission source near {station}",
        f"Submit inspection report for {incident['id']}",
    ]


def generate_tasks_for_incident(incident, next_id_seq, now=None):
    """Returns a list of new task dicts for a just-opened incident. Task
    priority mirrors the incident's own priority; due times stagger from
    created_at using SLA_STEP_HOURS so the checklist's pacing matches how
    urgent the case actually is."""
    now = now or _now_iso()
    step = SLA_STEP_HOURS.get(incident["priority"], SLA_STEP_HOURS["Medium"])
    titles = checklist_titles(incident)
    tasks = []
    for i, title in enumerate(titles):
        tasks.append({
            "id": f"TASK-{next_id_seq + i:05d}",
            "incident_id": incident["id"],
            "sequence": i,
            "title": title,
            "status": "Pending",
            "priority": incident["priority"],
            "assigned_officer_id": incident.get("assignment", {}).get("officer_id") if incident.get("assignment") else None,
            "due_at": _add_hours(incident["created_at"], step * (i + 1)),
            "completed_at": None,
            "created_at": now,
        })
    return tasks


def apply_task_update(task, status=None, assigned_officer_id=None, now=None):
    now = now or _now_iso()
    updated = dict(task)
    if status and status != task["status"]:
        if status not in TASK_STATUSES:
            raise ValueError(f"Unknown task status: {status}")
        updated["status"] = status
        updated["completed_at"] = now if status == "Completed" else None
    if assigned_officer_id is not None:
        updated["assigned_officer_id"] = assigned_officer_id
    return updated
