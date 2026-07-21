"""
Notification Agent
-------------------
Builds Notification records for real workflow events — a new incident
opening, a high-severity incident, an assignment, a resolution — plus
computes "task due soon" notifications live from the current task list.
Pure functions; no file I/O, no ids (backend/notification_store.py assigns
those on persist, same split as every other agent/store pair here).

"Task Due Soon" is deliberately NOT persisted like the others: whether a
task is "due soon" is a function of the current time, not a one-time
event, so it's recomputed on every GET /api/notifications instead of going
stale in a stored record.
"""
import datetime

DUE_SOON_HOURS = 4  # a task due within this window surfaces as "due soon"


def _now_iso():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _mk(user_id, type_, title, message, link, now):
    return {
        "user_id": user_id, "type": type_, "title": title, "message": message,
        "link": link, "created_at": now, "read": False,
    }


def new_incident_notifications(incident, admin_user_ids, most_affected_group=None, now=None):
    """most_affected_group (optional) is the Health Advisory Engine's
    highest-risk group for this station (health_advisory_agent.py) — when
    given, it's folded into the high-severity message so "a new critical
    incident affects public health" is answered by this same existing
    notification instead of a second, duplicate one."""
    now = now or _now_iso()
    notes = [
        _mk(uid, "new_incident", "New Incident", f"{incident['title']} ({incident['id']})",
            f"/incidents/{incident['id']}", now)
        for uid in admin_user_ids
    ]
    if incident["severity"] in ("Critical", "High"):
        message = f"{incident['title']} — {incident['severity']} severity"
        if most_affected_group:
            message += f". Most affected group: {most_affected_group}."
        notes += [
            _mk(uid, "high_severity", "High Severity Incident", message, f"/incidents/{incident['id']}", now)
            for uid in admin_user_ids
        ]
    return notes


def forecast_severe_notifications(alert, admin_user_ids, now=None):
    """AQI forecast crossing into Severe/Emergency (health_advisory_agent.py's
    forecast_severe_stations) — a forward-looking alert distinct from the
    current-state one above, deduped by the caller (see
    notification_store.recent_exists) so it doesn't refire every poll."""
    now = now or _now_iso()
    message = (
        f"{alert['station']}: 24h forecast projects {round(alert['predicted_aqi'])} AQI "
        f"({alert['level']}), up from {round(alert['current_aqi'])} now."
    )
    return [
        _mk(uid, "forecast_severe", "Severe Pollution Forecast", message, f"/forecast?station={alert['station']}", now)
        for uid in admin_user_ids
    ]


def assignment_notification(incident, officer_id, now=None):
    now = now or _now_iso()
    return _mk(
        officer_id, "incident_assigned", "New Incident Assigned",
        f"You've been assigned {incident['id']}: {incident['title']}", f"/incidents/{incident['id']}", now,
    )


def resolved_notifications(incident, recipient_ids, now=None):
    now = now or _now_iso()
    return [
        _mk(uid, "incident_resolved", "Incident Resolved",
            f"{incident['id']} at {incident['station']} has been resolved", f"/incidents/{incident['id']}", now)
        for uid in recipient_ids
    ]


def due_soon_notifications(tasks, now=None):
    now = now or _now_iso()
    now_dt = datetime.datetime.strptime(now, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc)
    notes = []
    for t in tasks:
        if t["status"] == "Completed" or not t.get("assigned_officer_id") or not t.get("due_at"):
            continue
        due_dt = datetime.datetime.strptime(t["due_at"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc)
        hours_left = (due_dt - now_dt).total_seconds() / 3600
        if 0 <= hours_left <= DUE_SOON_HOURS:
            notes.append(_mk(
                t["assigned_officer_id"], "task_due_soon", "Task Due Soon",
                f'"{t["title"]}" is due in {round(hours_left)}h', f"/incidents/{t['incident_id']}", now,
            ))
    return notes
