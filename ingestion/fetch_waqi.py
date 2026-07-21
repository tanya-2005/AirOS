"""
Fetches real-time AQI station data for a city from the WAQI (World Air Quality
Index) API — covers CPCB/CAAQMS stations across Indian cities.

Get a free token in ~10 seconds at: https://aqicn.org/data-platform/token/
Then set WAQI_TOKEN=your_token_here in the repo-root .env file (see
.env.example) — it's loaded automatically via python-dotenv below, no manual
`export` needed.

Usage:
    python fetch_waqi.py --city delhi
    python fetch_waqi.py --bounds 28.4,76.8,28.9,77.4   # lat1,lon1,lat2,lon2 bounding box

Output: data/aqi_stations_<city>_<timestamp>.json
Each station record includes: station name, lat/lon, current AQI, dominant
pollutant, and per-pollutant readings (pm25, pm10, no2, so2, co, o3) where
available — this is what feeds the Attribution and Forecasting agents.
"""
import os
import sys
import json
import argparse
import datetime
import urllib.request
import urllib.error

from dotenv import load_dotenv

import history_store

# Explicit path rather than a bare load_dotenv() — this script is documented
# to be run either from the repo root or from inside ingestion/ (see README),
# and an implicit search would only reliably find .env from the latter.
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

WAQI_BASE = "https://api.waqi.info"


def fetch_bounds(lat1, lon1, lat2, lon2, token):
    """Fetch all stations within a bounding box in one call (efficient — use this
    over per-station calls when covering a whole city)."""
    url = f"{WAQI_BASE}/map/bounds/?latlng={lat1},{lon1},{lat2},{lon2}&token={token}"
    with urllib.request.urlopen(url, timeout=15) as resp:
        payload = json.load(resp)
    if payload.get("status") != "ok":
        raise RuntimeError(f"WAQI error: {payload}")
    return payload["data"]


def fetch_station_detail(station_uid, token):
    """Get full pollutant breakdown for one station (call after fetch_bounds if
    you need per-pollutant data, not just the aggregate AQI)."""
    url = f"{WAQI_BASE}/feed/@{station_uid}/?token={token}"
    with urllib.request.urlopen(url, timeout=15) as resp:
        payload = json.load(resp)
    if payload.get("status") != "ok":
        return None
    return payload["data"]


def fetch_city_feed(city, token):
    """WAQI's single-city feed (/feed/<city>/) — confirmed, while building
    Multi-City support, to have coverage for every city this app supports
    even though /map/bounds/ (fetch_bounds above) only returns results for
    Delhi on a free-tier token. Real, live data, just ONE station (the
    city's primary/aggregate monitor) instead of the many fetch_bounds
    returns for Delhi — used as a fallback, not a replacement, so Delhi
    keeps its full multi-station coverage unchanged."""
    url = f"{WAQI_BASE}/feed/{city}/?token={token}"
    with urllib.request.urlopen(url, timeout=15) as resp:
        payload = json.load(resp)
    if payload.get("status") != "ok":
        return None
    return payload["data"]


# Rough bounding boxes for major Indian metros (lat1,lon1,lat2,lon2). The
# six SIH Multi-City target cities (see backend/city_registry.py, the single
# source of truth the backend/frontend read from) plus Kolkata, kept for
# anyone extending this further — adding a city is one line here.
CITY_BOUNDS = {
    "delhi": (28.40, 76.80, 28.90, 77.40),
    "mumbai": (18.90, 72.75, 19.30, 73.05),
    "bengaluru": (12.85, 77.45, 13.15, 77.75),
    "chennai": (12.90, 80.10, 13.20, 80.35),
    "hyderabad": (17.25, 78.30, 17.55, 78.60),
    "pune": (18.45, 73.75, 18.65, 73.95),
    "kolkata": (22.45, 88.25, 22.70, 88.45),
}


def run_ingestion(city="delhi", bounds=None, detail=False, token=None):
    """
    Core ingestion logic, separated from argparse so it's directly callable
    with plain Python arguments — used by main() below and by
    ingestion/scheduler.py, which needs to trigger a fetch every 15 minutes
    without shelling out to a subprocess.

    Returns (out_path, records, skipped) — out_path is None if nothing
    usable was fetched (bad/missing token, every station unreadable, etc.),
    in which case the caller decides how to handle that (main() exits
    non-zero; the scheduler logs it and waits for the next cycle).
    """
    token = token or os.environ.get("WAQI_TOKEN")
    if not token:
        print("ERROR: WAQI_TOKEN not set. Add it to the repo-root .env file "
              "(see .env.example) — get a free token at "
              "https://aqicn.org/data-platform/token/", file=sys.stderr)
        return None, [], 0

    if bounds:
        lat1, lon1, lat2, lon2 = bounds
    else:
        lat1, lon1, lat2, lon2 = CITY_BOUNDS[city]

    stations = fetch_bounds(lat1, lon1, lat2, lon2, token)
    print(f"Found {len(stations)} stations in bounding box.")

    if not stations:
        # /map/bounds/ has real, confirmed coverage for Delhi on this
        # token's tier, but returns zero for the other 5 cities even with
        # a correct, verified bounding box — an actual token-tier
        # limitation, not a bug in the bounds. /feed/<city>/ is a
        # different WAQI endpoint that IS available for every city, so
        # fall back to it rather than writing nothing (or something fake)
        # for these cities. Real, live data either way — just one
        # authoritative station instead of Delhi's many.
        print(f"No stations from /map/bounds/ for '{city}' — falling back to /feed/{city}/ (single-station).")
        feed = fetch_city_feed(city, token)
        if feed is None:
            print(f"ERROR: /feed/{city}/ also failed — nothing written to data/.", file=sys.stderr)
            return None, [], 0
        stations = [{
            "uid": feed.get("idx"),
            "aqi": feed.get("aqi"),
            "station": {"name": feed.get("city", {}).get("name", city.title())},
            "lat": feed.get("city", {}).get("geo", [None, None])[0],
            "lon": feed.get("city", {}).get("geo", [None, None])[1],
        }]

    records = []
    skipped = 0
    for s in stations:
        # WAQI's /map/bounds/ always returns aqi as a STRING, even for
        # stations with a perfectly good reading (e.g. "146") — it is never
        # a native JSON number. The only case that's genuinely unusable is
        # the literal placeholder "-" for an offline/stale sensor, or (rare)
        # a value that doesn't parse as a number at all. Everything else
        # needs converting to int before attribution_agent/forecast_agent
        # can do arithmetic on it — they'd crash on a raw string.
        raw_aqi = s.get("aqi")
        if raw_aqi == "-":
            skipped += 1
            continue
        try:
            aqi_value = int(raw_aqi)
        except (TypeError, ValueError):
            try:
                aqi_value = int(float(raw_aqi))
            except (TypeError, ValueError):
                skipped += 1
                continue
        rec = {
            "uid": s["uid"],
            "station_name": s["station"]["name"],
            "lat": s["lat"],
            "lon": s["lon"],
            "aqi": aqi_value,
        }
        if detail:
            station_detail = fetch_station_detail(s["uid"], token)
            if station_detail:
                iaqi = station_detail.get("iaqi", {})
                rec["pollutants"] = {k: v.get("v") for k, v in iaqi.items()}
                rec["dominant_pollutant"] = station_detail.get("dominentpol")
                rec["time"] = station_detail.get("time", {}).get("iso")
        records.append(rec)

    if skipped:
        print(f"Skipped {skipped} station(s) with no usable reading (aqi='-' or unparseable).")

    if not records:
        print("ERROR: no stations with a usable reading — nothing written to data/.", file=sys.stderr)
        return None, [], skipped

    now = datetime.datetime.now(datetime.timezone.utc)
    ts = now.strftime("%Y%m%dT%H%M%SZ")
    out_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"aqi_stations_{city}_{ts}.json")
    with open(out_path, "w") as f:
        json.dump({"city": city, "fetched_at": ts, "stations": records}, f, indent=2)

    history_store.append("aqi", city, history_store.now_iso(), records)

    print(f"Wrote {len(records)} station records to {out_path}")
    print("The backend picks this up automatically on the next request — "
          "no restart needed (see backend/pipeline.py:_load_latest).")

    return out_path, records, skipped


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--city", choices=CITY_BOUNDS.keys(), default="delhi")
    ap.add_argument("--bounds", help="lat1,lon1,lat2,lon2 override")
    ap.add_argument("--detail", action="store_true",
                     help="also fetch per-pollutant breakdown for each station (slower, more API calls)")
    args = ap.parse_args()

    bounds = tuple(map(float, args.bounds.split(","))) if args.bounds else None
    out_path, records, skipped = run_ingestion(city=args.city, bounds=bounds, detail=args.detail)

    if out_path is None:
        sys.exit(1)


if __name__ == "__main__":
    main()
