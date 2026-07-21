"""Persistence for Task records (data/tasks.json) — same read-modify-write JSON store pattern as incident_store.py."""
import json
import os

_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "tasks.json")


def load():
    if not os.path.exists(_PATH):
        return []
    with open(_PATH) as f:
        return json.load(f)


def save(tasks):
    with open(_PATH, "w") as f:
        json.dump(tasks, f, indent=2)


def find(tasks, task_id):
    return next((t for t in tasks if t["id"] == task_id), None)


def for_incident(tasks, incident_id):
    return [t for t in tasks if t["incident_id"] == incident_id]
