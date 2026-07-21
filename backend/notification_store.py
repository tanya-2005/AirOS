"""Persistence for event-triggered Notification records (data/notifications.json). "Task due soon" notifications are computed live and never land here — see agents/notification_agent.py."""
import datetime
import json
import os

_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "notifications.json")


def load():
    if not os.path.exists(_PATH):
        return []
    with open(_PATH) as f:
        return json.load(f)


def save(notifications):
    with open(_PATH, "w") as f:
        json.dump(notifications, f, indent=2)


def append(notifications_without_ids):
    """Assigns sequential ids to freshly-built notification dicts and persists them. Returns the full updated store."""
    store = load()
    next_seq = len(store) + 1
    for i, n in enumerate(notifications_without_ids):
        store.append({"id": f"NOTIF-{next_seq + i:05d}", **n})
    save(store)
    return store


def for_user(notifications, user_id):
    return [n for n in notifications if n["user_id"] == user_id]


def recent_exists(notifications, type_, link, within_hours):
    """True if a notification of this type+link was already sent within
    the window — dedup for triggers that re-evaluate every poll (e.g.
    forecast_severe), so a still-true condition doesn't refire every ~20s."""
    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=within_hours)
    for n in notifications:
        if n["type"] != type_ or n["link"] != link:
            continue
        created = datetime.datetime.strptime(n["created_at"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc)
        if created >= cutoff:
            return True
    return False
