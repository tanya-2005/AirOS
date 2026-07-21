"""
Persistence for Incident records (data/incidents.json).

Unlike attribution/forecast/enforcement — which are fully recomputed from
the latest station data on every request — an Incident has a real lifecycle
(status changes, a growing timeline, resolution notes) that has to survive
across requests and ingestion runs. A single JSON file holding the full list
is the same "no database" approach the rest of this project uses (see
ingestion/history_store.py's docstring for why); it's small enough
(dozens to low hundreds of incidents for a hackathon-scale demo) that a
read-modify-write on every mutation is simple and fast enough, no need for
history_store.py's append-only-JSONL trick here.
"""
import json
import os

from . import city_registry

_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "incidents.json")


def load():
    """Returns the persisted incident list, [] if the store doesn't exist
    yet. Backfills `assignment`/`internal_notes` on any record written
    before those fields existed, so every caller (Python and the frontend)
    can rely on both always being present.

    `city` is run through city_registry.normalize() rather than a bare
    setdefault: records from before Multi-City existed were written with
    the old hardcoded `"city": "Delhi"` (capitalized) — present, not
    missing, so setdefault alone would leave the case mismatch in place and
    every city-scoped filter downstream (pipeline.get_incidents) would
    silently treat them as belonging to no known city at all. normalize()
    folds that legacy capitalization onto "delhi" (its only real target,
    since Delhi was the only city ever ingested at the time) while leaving
    every valid lowercase id — including every other city's — untouched."""
    if not os.path.exists(_PATH):
        return []
    with open(_PATH) as f:
        incidents = json.load(f)
    for i in incidents:
        i.setdefault("assignment", None)
        i.setdefault("internal_notes", [])
        i["city"] = city_registry.normalize(str(i.get("city", "delhi")).lower())
    return incidents


def save(incidents):
    with open(_PATH, "w") as f:
        json.dump(incidents, f, indent=2)


def find(incidents, incident_id):
    return next((i for i in incidents if i["id"] == incident_id), None)
