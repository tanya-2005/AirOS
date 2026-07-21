"""
Single source of truth for which cities AirOS supports — everything else
(pipeline.py's default city, every router's ?city= validation, the
frontend's city selector) reads from this one list instead of each
maintaining its own. Adding a future city is one entry here plus running
the ingestion scripts for it — no other file needs to change (see the
closing report's "scalability" section).

id must match the city slug ingestion/fetch_waqi.py, fetch_weather.py, and
fetch_osm_registry.py already use in their own CITY_BOUNDS dicts and output
filenames (aqi_stations_<id>_*.json etc.) — this IS that same vocabulary,
not a parallel one.
"""

CITIES = [
    {"id": "delhi", "label": "Delhi", "state": "Delhi", "lat": 28.6139, "lon": 77.2090},
    {"id": "mumbai", "label": "Mumbai", "state": "Maharashtra", "lat": 19.0760, "lon": 72.8777},
    {"id": "bengaluru", "label": "Bengaluru", "state": "Karnataka", "lat": 12.9716, "lon": 77.5946},
    {"id": "chennai", "label": "Chennai", "state": "Tamil Nadu", "lat": 13.0827, "lon": 80.2707},
    {"id": "hyderabad", "label": "Hyderabad", "state": "Telangana", "lat": 17.3850, "lon": 78.4867},
    {"id": "pune", "label": "Pune", "state": "Maharashtra", "lat": 18.5204, "lon": 73.8567},
]

CITY_IDS = [c["id"] for c in CITIES]
DEFAULT_CITY = "delhi"

_BY_ID = {c["id"]: c for c in CITIES}


def is_valid(city_id):
    return city_id in _BY_ID


def normalize(city_id):
    """Falls back to the default city for anything unrecognized, the same
    'never 500 on a bad/missing city, just serve Delhi' policy every
    pipeline function follows — see backend/pipeline.py."""
    return city_id if is_valid(city_id) else DEFAULT_CITY


def meta(city_id):
    return _BY_ID.get(city_id)
