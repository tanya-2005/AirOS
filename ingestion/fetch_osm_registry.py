"""
Replaces the synthetic pollution-source registry with real geospatial data
from OpenStreetMap (Overpass API) wherever a source type has a reliable OSM
tag — and falls back to the existing synthetic registry, per source type,
wherever it doesn't. Free, no API key.

What's real vs. what stays synthetic (Milestone 3 Task 1):
  construction_site         OSM landuse=construction              REAL (when available)
  industrial_stack          OSM landuse=industrial                REAL (when available)
  waste_burning_zone        OSM landuse=landfill / amenity=landfill/
                             waste_disposal (closest public proxy  REAL (when available)
                             for burning-risk waste sites)
  traffic_corridor          OSM highway=motorway/trunk             REAL (when available) —
                             NEW source type, addresses this project's own
                             long-documented gap ("traffic isn't its own
                             attribution source, proxied via diesel
                             generators" — see README "Known limitations").
                             No synthetic precedent exists for this one, so
                             if OSM is unreachable it's just omitted, not
                             faked.
  diesel_generator_cluster  NOT reliably taggable in OSM (no standard tag
                             for "has a diesel backup generator") — this
                             one stays synthetic-only, always, clearly
                             labeled `"source": "synthetic_fallback"`.

Government open datasets (data.gov.in / DPCC consent-to-operate lists etc.)
were evaluated but NOT integrated: they require manual portal registration
and dataset-specific parsing that can't be done generically or verified to
keep working unattended — see README "Known limitations" for the honest
version of this rather than a fake integration.

Each Overpass query is isolated with its own retry (the free public
instance rate-limits and occasionally 504s under load — confirmed while
building this) and its own fallback, so one category failing doesn't take
the others down with it.

Usage:
    python fetch_osm_registry.py --city delhi
Output:
    data/registry_delhi.json   — merged real+synthetic-fallback registry,
                                  same record shape the app already expects
                                  (see attribution_agent.py), plus new
                                  "source" and "area_sqm" fields.
    data/roads_delhi.json      — GeoJSON FeatureCollection of major roads,
                                  for the Map page's roads layer only (not
                                  part of the attribution registry — roads
                                  aren't point/area pollution sources).
"""
import json
import math
import os
import time
import urllib.request
import urllib.error
import urllib.parse
import argparse

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
USER_AGENT = "AirOS-Ingestion/1.0 (hackathon project, contact via GitHub repo)"

CITY_BOUNDS = {
    "delhi": (28.40, 76.80, 28.90, 77.40),
}

# (source_type, overpass query body, output element cap). Kept small and
# split by tag rather than one giant query — the free Overpass instance
# reliably times out on broad city-wide queries for busy tags like highways.
OSM_QUERIES = {
    "waste_burning_zone": (
        'nwr["landuse"="landfill"]({bbox});'
        'nwr["amenity"="landfill"]({bbox});'
        'nwr["amenity"="waste_disposal"]({bbox});',
        40,
    ),
    "industrial_stack": (
        'way["landuse"="industrial"]({bbox});',
        60,
    ),
    "construction_site": (
        'way["landuse"="construction"]({bbox});',
        30,
    ),
    "traffic_corridor": (
        'way["highway"="motorway"]({bbox});'
        'way["highway"="trunk"]({bbox});',
        50,
    ),
}

RETRY_ATTEMPTS = 2
RETRY_BACKOFF_SECONDS = 6
BETWEEN_QUERY_DELAY_SECONDS = 4  # be a good citizen of a free shared API


def _overpass_post(data_str, timeout=35):
    """Overpass's /api/interpreter takes the query as a form field named
    `data` (application/x-www-form-urlencoded) — confirmed against the live
    API while building this; a raw unencoded POST body is NOT reliably
    accepted (got 406 Not Acceptable without a User-Agent, and inconsistent
    behavior without proper form encoding)."""
    body = urllib.parse.urlencode({"data": data_str}).encode("utf-8")
    req = urllib.request.Request(
        OVERPASS_URL,
        data=body,
        headers={"User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.load(resp)


def fetch_osm_category(source_type, bbox_str):
    """Returns (elements, error) — elements is [] on total failure, error is None on success."""
    query_body, cap = OSM_QUERIES[source_type]
    data_str = f"[out:json][timeout:30];({query_body.format(bbox=bbox_str)});out center {cap};"

    last_error = None
    for attempt in range(1, RETRY_ATTEMPTS + 1):
        try:
            payload = _overpass_post(data_str, timeout=35)
            return payload.get("elements", []), None
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError, json.JSONDecodeError) as exc:
            last_error = str(exc)
            if attempt < RETRY_ATTEMPTS:
                time.sleep(RETRY_BACKOFF_SECONDS)
    return [], last_error


def _element_centroid(el):
    if "center" in el:
        return el["center"]["lat"], el["center"]["lon"]
    if "lat" in el:
        return el["lat"], el["lon"]
    return None, None


def _way_area_sqm(el):
    """Rough planar shoelace-formula area for a way with full geometry — only
    available when the Overpass response includes node coords (it doesn't
    for `out center`, only `out geom`), so this returns None for most
    categories here by design (we use `out center` to keep responses small
    and fast, trading exact area for reliability against a rate-limited
    free API). Kept as a real, working function for when geometry IS
    present, rather than omitting size entirely."""
    geom = el.get("geometry")
    if not geom or len(geom) < 3:
        return None
    # Equirectangular approximation, fine at city scale — not a proper
    # geodesic area calculation, disclosed as such.
    lat0 = geom[0]["lat"]
    coords = [
        (
            (pt["lon"] - geom[0]["lon"]) * 111320 * math.cos(math.radians(lat0)),
            (pt["lat"] - lat0) * 110540,
        )
        for pt in geom
    ]
    area = 0.0
    for i in range(len(coords)):
        x1, y1 = coords[i]
        x2, y2 = coords[(i + 1) % len(coords)]
        area += x1 * y2 - x2 * y1
    return round(abs(area) / 2, 1)


def _nearest_ward(lat, lon, ward_centroids):
    """Assigns a real OSM record to the nearest of the synthetic registry's
    existing ward centroids — a spatial-join approximation, not real ward
    boundary data (Delhi's actual ward polygons aren't in this dataset).
    Disclosed as an assumption in the README."""
    if not ward_centroids:
        return "Delhi"
    best_ward, best_dist = None, float("inf")
    for ward, (wlat, wlon) in ward_centroids.items():
        d = (wlat - lat) ** 2 + (wlon - lon) ** 2
        if d < best_dist:
            best_dist, best_ward = d, ward
    return best_ward


def _ward_centroids(synthetic_records):
    by_ward = {}
    for r in synthetic_records:
        by_ward.setdefault(r["ward"], []).append((r["lat"], r["lon"]))
    return {
        ward: (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))
        for ward, pts in by_ward.items()
    }


def build_registry(city="delhi"):
    bbox_str = ",".join(str(v) for v in CITY_BOUNDS[city])

    synthetic_path = os.path.join(os.path.dirname(__file__), "..", "data", "registry_demo_delhi.json")
    with open(synthetic_path) as f:
        synthetic = json.load(f)["records"]
    ward_centroids = _ward_centroids(synthetic)

    records = []
    summary = {}
    next_id = 1

    for source_type in OSM_QUERIES:
        elements, error = fetch_osm_category(source_type, bbox_str)
        if error or not elements:
            if source_type == "traffic_corridor":
                # No synthetic precedent for this brand-new source type —
                # omit rather than fabricate. See module docstring.
                summary[source_type] = {"source": "unavailable", "count": 0, "error": error}
                print(f"  {source_type}: OSM fetch failed ({error or 'no results'}), "
                      f"no synthetic fallback exists for this new source type — omitted.")
            else:
                fallback = [r for r in synthetic if r["source_type"] == source_type]
                for r in fallback:
                    records.append({**r, "id": f"REG-{next_id:04d}", "source": "synthetic_fallback",
                                    "area_sqm": None})
                    next_id += 1
                summary[source_type] = {"source": "synthetic_fallback", "count": len(fallback), "error": error}
                print(f"  {source_type}: OSM fetch failed ({error or 'no results'}), "
                      f"fell back to {len(fallback)} synthetic record(s).")
        else:
            count = 0
            for el in elements:
                lat, lon = _element_centroid(el)
                if lat is None:
                    continue
                ward = _nearest_ward(lat, lon, ward_centroids)
                name = el.get("tags", {}).get("name") or f"{source_type.replace('_', ' ').title()} (OSM {el['id']})"
                records.append({
                    "id": f"REG-{next_id:04d}",
                    "source_type": source_type,
                    "ward": ward,
                    "lat": round(lat, 6),
                    "lon": round(lon, 6),
                    "registered_name": name,
                    "active": True,
                    "permit_status": "unknown",  # honest: we have no real permit data for OSM features
                    "last_inspection_days_ago": None,
                    "source": "openstreetmap",
                    "area_sqm": _way_area_sqm(el),
                })
                next_id += 1
                count += 1
            summary[source_type] = {"source": "openstreetmap", "count": count, "error": None}
            print(f"  {source_type}: {count} real record(s) from OpenStreetMap.")

        time.sleep(BETWEEN_QUERY_DELAY_SECONDS)

    # diesel_generator_cluster: always synthetic, no OSM tag exists for this.
    fallback = [r for r in synthetic if r["source_type"] == "diesel_generator_cluster"]
    for r in fallback:
        records.append({**r, "id": f"REG-{next_id:04d}", "source": "synthetic_fallback", "area_sqm": None})
        next_id += 1
    summary["diesel_generator_cluster"] = {"source": "synthetic_fallback", "count": len(fallback), "error": None}
    print(f"  diesel_generator_cluster: {len(fallback)} synthetic record(s) — no public dataset exists for this source type.")

    return records, summary


def build_roads_geojson(city="delhi"):
    bbox_str = ",".join(str(v) for v in CITY_BOUNDS[city])
    query_body = 'way["highway"~"motorway|trunk|primary"]({bbox});'
    data_str = f"[out:json][timeout:30];({query_body.format(bbox=bbox_str)});out geom 150;"

    last_error = None
    for attempt in range(1, RETRY_ATTEMPTS + 1):
        try:
            payload = _overpass_post(data_str, timeout=35)
            elements = payload.get("elements", [])
            features = []
            for el in elements:
                geom = el.get("geometry")
                if not geom:
                    continue
                features.append({
                    "type": "Feature",
                    "properties": {
                        "name": el.get("tags", {}).get("name", ""),
                        "highway_type": el.get("tags", {}).get("highway", "unknown"),
                    },
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [[pt["lon"], pt["lat"]] for pt in geom],
                    },
                })
            return {"type": "FeatureCollection", "features": features}, None
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError, json.JSONDecodeError) as exc:
            last_error = str(exc)
            if attempt < RETRY_ATTEMPTS:
                time.sleep(RETRY_BACKOFF_SECONDS)
    return {"type": "FeatureCollection", "features": []}, last_error


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--city", choices=CITY_BOUNDS.keys(), default="delhi")
    args = ap.parse_args()

    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    os.makedirs(data_dir, exist_ok=True)

    print(f"Fetching real pollution-source registry for {args.city} from OpenStreetMap...")
    records, summary = build_registry(args.city)
    registry_out = os.path.join(data_dir, f"registry_{args.city}.json")
    with open(registry_out, "w") as f:
        json.dump({
            "note": "Real sources from OpenStreetMap where available; synthetic fallback per source type otherwise — see \"source\" field on each record.",
            "summary": summary,
            "records": records,
        }, f, indent=2)
    real_count = sum(1 for r in records if r["source"] == "openstreetmap")
    print(f"Wrote {len(records)} records ({real_count} real, {len(records) - real_count} synthetic fallback) to {registry_out}")

    print(f"\nFetching major roads for the Map page...")
    roads_geojson, roads_error = build_roads_geojson(args.city)
    roads_out = os.path.join(data_dir, f"roads_{args.city}.json")
    with open(roads_out, "w") as f:
        json.dump(roads_geojson, f, indent=2)
    if roads_error:
        print(f"Roads fetch failed ({roads_error}) — wrote an empty FeatureCollection; the map's roads "
              f"layer will just show nothing until this succeeds on a retry.")
    else:
        print(f"Wrote {len(roads_geojson['features'])} road segments to {roads_out}")

    print("\nThe backend picks up registry_<city>.json and roads_<city>.json automatically "
          "on the next request — no restart needed.")


if __name__ == "__main__":
    main()
