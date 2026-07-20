"""
Lightweight append-only history for AQI + weather snapshots.

Uses JSON Lines (one JSON object per line) instead of a single growing JSON
array — appending never requires reading the whole file back in just to
tack one entry on. No database, per this project's hackathon-friendly
constraint; at one snapshot every 15 minutes this is ~96 lines/day, ~672/
week, trivially small as plain text.

File layout: data/history/<kind>_<city>.jsonl
  kind: "aqi" | "weather"
  each line: {"fetched_at": "<ISO 8601 UTC>", "records": [...]}
    aqi records:     {"station_name", "lat", "lon", "aqi"}
    weather records: {"station_name", "lat", "lon", "temperature", "humidity",
                       "wind_speed", "wind_direction", "precipitation"}

Retention: entries older than RETENTION_DAYS are dropped on every append, so
the file never grows unbounded. Both ingestion scripts (fetch_waqi.py,
fetch_weather.py) call append() right after writing their normal "latest
snapshot" file; the backend calls read() to serve /api/history/*.

Imported the same way agents/*.py already is elsewhere in this project:
plain sibling-module import when run as a script from ingestion/, or via an
explicit sys.path entry when imported cross-package (see backend/pipeline.py).
"""
import datetime
import json
import os

RETENTION_DAYS = 7
ISO_FORMAT = "%Y-%m-%dT%H:%M:%SZ"  # explicit, unambiguous UTC — avoids
                                     # isoformat()'s microseconds/offset quirks


def now_iso():
    """Single source of truth for 'what time is it, as history/API timestamps expect'."""
    return datetime.datetime.now(datetime.timezone.utc).strftime(ISO_FORMAT)


def _parse_ts(ts_str):
    return datetime.datetime.strptime(ts_str, ISO_FORMAT).replace(tzinfo=datetime.timezone.utc)


def _history_dir():
    d = os.path.join(os.path.dirname(__file__), "..", "data", "history")
    os.makedirs(d, exist_ok=True)
    return d


def _history_path(kind, city):
    return os.path.join(_history_dir(), f"{kind}_{city}.jsonl")


def append(kind, city, fetched_at_iso, records):
    """
    Appends one snapshot entry and prunes anything older than
    RETENTION_DAYS in the same pass. Returns the number of entries kept.
    """
    path = _history_path(kind, city)

    entries = []
    if os.path.exists(path):
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line:
                    entries.append(json.loads(line))

    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=RETENTION_DAYS)
    entries = [e for e in entries if _parse_ts(e["fetched_at"]) >= cutoff]
    entries.append({"fetched_at": fetched_at_iso, "records": records})

    with open(path, "w") as f:
        for e in entries:
            f.write(json.dumps(e) + "\n")

    return len(entries)


def read(kind, city, hours=24):
    """Returns snapshot entries from the last `hours`, oldest first. [] if no history yet."""
    path = _history_path(kind, city)
    if not os.path.exists(path):
        return []

    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=hours)
    entries = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            entry = json.loads(line)
            if _parse_ts(entry["fetched_at"]) >= cutoff:
                entries.append(entry)

    entries.sort(key=lambda e: e["fetched_at"])
    return entries
