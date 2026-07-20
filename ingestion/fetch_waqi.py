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


# Rough bounding boxes for major Indian metros (lat1,lon1,lat2,lon2)
CITY_BOUNDS = {
    "delhi": (28.40, 76.80, 28.90, 77.40),
    "mumbai": (18.90, 72.75, 19.30, 73.05),
    "bengaluru": (12.85, 77.45, 13.15, 77.75),
    "kolkata": (22.45, 88.25, 22.70, 88.45),
    "chennai": (12.90, 80.10, 13.20, 80.35),
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--city", choices=CITY_BOUNDS.keys(), default="delhi")
    ap.add_argument("--bounds", help="lat1,lon1,lat2,lon2 override")
    ap.add_argument("--detail", action="store_true",
                     help="also fetch per-pollutant breakdown for each station (slower, more API calls)")
    args = ap.parse_args()

    token = os.environ.get("WAQI_TOKEN")
    if not token:
        print("ERROR: WAQI_TOKEN not set. Add it to the repo-root .env file "
              "(see .env.example) — get a free token at "
              "https://aqicn.org/data-platform/token/", file=sys.stderr)
        sys.exit(1)

    if args.bounds:
        lat1, lon1, lat2, lon2 = map(float, args.bounds.split(","))
    else:
        lat1, lon1, lat2, lon2 = CITY_BOUNDS[args.city]

    stations = fetch_bounds(lat1, lon1, lat2, lon2, token)
    print(f"Found {len(stations)} stations in bounding box.")

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
        if args.detail:
            detail = fetch_station_detail(s["uid"], token)
            if detail:
                iaqi = detail.get("iaqi", {})
                rec["pollutants"] = {k: v.get("v") for k, v in iaqi.items()}
                rec["dominant_pollutant"] = detail.get("dominentpol")
                rec["time"] = detail.get("time", {}).get("iso")
        records.append(rec)

    if skipped:
        print(f"Skipped {skipped} station(s) with no usable reading (aqi='-' or unparseable).")

    if not records:
        print("ERROR: no stations with a usable reading — nothing written to data/.", file=sys.stderr)
        sys.exit(1)

    ts = datetime.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    out_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"aqi_stations_{args.city}_{ts}.json")
    with open(out_path, "w") as f:
        json.dump({"city": args.city, "fetched_at": ts, "stations": records}, f, indent=2)

    print(f"Wrote {len(records)} station records to {out_path}")
    print("The backend picks this up automatically on the next request — "
          "no restart needed (see backend/pipeline.py:_load_latest).")


if __name__ == "__main__":
    main()
