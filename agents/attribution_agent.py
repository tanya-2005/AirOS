"""
Attribution Agent
------------------
Input:  AQI station readings (data/aqi_stations_*.json)
        Registry of nearby sources (data/registry_<city>.json if the real
        OpenStreetMap-backed registry has been fetched — see
        ingestion/fetch_osm_registry.py — else data/registry_demo_delhi.json)
        Optionally, current weather at the station (wind_direction,
        wind_speed) — see ingestion/fetch_weather.py.
Output: For each AQI hotspot, a ranked list of candidate source categories
        with a confidence score, plus a short evidence narrative.

Design note: keep the SCORING numeric and auditable (judges will ask "how did
you compute this"), and use Claude only to turn the numeric evidence into a
readable justification — not to invent the number. This is important:
a hackathon demo that can show its math is far more convincing than one that
says "the AI decided."

Scoring model (v2, Milestone 3 — still deliberately simple and auditable,
now with wind and size on top of the v1 distance-only model):
  For each AQI station, find registry sources within RADIUS_KM.
  score(source_type) = sum over nearby sources of:
      weight[source_type] * proximity_decay(distance) * active_bonus
      * size_factor(source) * wind_factor(source, weather)

  weight[source_type]:  emission-intensity prior, unchanged from v1.
  proximity_decay(d):   unchanged from v1 — linear decay to 0 at RADIUS_KM.
  active_bonus:         unchanged from v1 — 1.2 if active, 0.6 if not.
  size_factor:           NEW. Larger sources (by OSM polygon area, when the
                         ingestion script captured it) get a modest boost —
                         sqrt-scaled so a 4x larger area gives ~2x weight,
                         not 4x, and capped at 1.8x so one huge industrial
                         polygon can't dwarf everything else. Sources with
                         no known area (most of them today — see
                         fetch_osm_registry.py's docstring on why) get
                         exactly 1.0, i.e. no effect — this is why calling
                         attribute_station() the old way, with registry
                         records that have no "area_sqm" field at all,
                         produces IDENTICAL numbers to before this change.
  wind_factor:           NEW, OPTIONAL. When `weather` (wind_direction,
                         wind_speed) is passed in, a source that's upwind
                         of the station right now — wind blowing FROM the
                         source's direction TOWARD the station — gets
                         boosted; a downwind-of-the-wind (i.e. the station
                         is upwind of the source) gets discounted. This is
                         a simplified cosine-falloff heuristic on compass
                         bearing alignment, not a real Gaussian plume
                         dispersion model — same "auditable math over
                         black-box precision" standard as everything else
                         in this file. When `weather` is omitted (the
                         function's original 2-argument call shape),
                         wind_factor is always exactly 1.0 — fully backward
                         compatible with every existing caller.

  Then confidence = score / (sum of all scores at that station), i.e. a
  normalized share — this gives you the "statistical confidence score" the
  problem statement explicitly asks for.
"""
import json
import math
import os
import glob

RADIUS_KM = 3.0

# Emission-intensity weights — rough priors, cite CPCB source-apportionment
# studies if you want to defend these numbers to judges. traffic_corridor is
# new in Milestone 3 (real OSM highway data — see fetch_osm_registry.py);
# weighted between construction and industrial, reflecting vehicle exhaust
# as a major but not dominant single-source PM contributor.
SOURCE_WEIGHTS = {
    "construction_site": 1.0,
    "industrial_stack": 1.6,
    "waste_burning_zone": 1.3,
    "diesel_generator_cluster": 0.9,
    "traffic_corridor": 1.4,
}


def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _bearing_deg(lat1, lon1, lat2, lon2):
    """Compass bearing FROM (lat1,lon1) TO (lat2,lon2). 0=North, 90=East."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dlambda = math.radians(lon2 - lon1)
    x = math.sin(dlambda) * math.cos(phi2)
    y = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(dlambda)
    return (math.degrees(math.atan2(x, y)) + 360) % 360


def proximity_decay(distance_km, radius_km=RADIUS_KM):
    """Linear decay to 0 at radius_km; closer sources matter more."""
    return max(0.0, 1 - distance_km / radius_km)


def size_factor(area_sqm):
    """Modest size-based nudge — see module docstring. 1.0 (no effect) when
    area is unknown, which is the common case today."""
    if not area_sqm:
        return 1.0
    return min(1.0 + math.sqrt(area_sqm) / 500, 1.8)


def wind_factor(station_lat, station_lon, source_lat, source_lon, wind_direction, wind_speed):
    """
    A station is downwind of a source when the wind is blowing FROM the
    source's direction toward the station — i.e. when the compass bearing
    from the STATION to the SOURCE roughly matches wind_direction
    (meteorological convention: wind_direction is where wind comes FROM).
    Downwind sources are boosted, upwind sources discounted; the effect
    scales with wind speed (calm air disperses pollution less
    directionally, so a light breeze shouldn't swing the score much).
    Never goes below 0.5 — a source doesn't stop contributing just because
    it's upwind at this exact moment; wind shifts. See module docstring
    for why this is a simplified heuristic, not a dispersion model.
    """
    bearing_station_to_source = _bearing_deg(station_lat, station_lon, source_lat, source_lon)
    angle_diff = abs((bearing_station_to_source - wind_direction + 180) % 360 - 180)  # 0=downwind, 180=upwind
    alignment = math.cos(math.radians(angle_diff))  # +1 downwind ... -1 upwind
    speed_term = min(max(wind_speed or 0, 0) / 15, 1.0)  # stronger wind -> more directional effect
    return max(0.5, 1.0 + 0.5 * speed_term * alignment)


def load_latest(pattern):
    files = sorted(glob.glob(pattern))
    if not files:
        return None
    with open(files[-1]) as f:
        return json.load(f)


def attribute_station(station, registry_records, weather=None):
    """
    weather: optional dict with "wind_direction" (degrees, direction wind
    blows FROM) and "wind_speed" (km/h) for THIS station right now — see
    ingestion/fetch_weather.py. Omit it (or pass None) to get the original
    distance-only v1 behavior back exactly.
    """
    scores = {}
    evidence = []
    has_wind = bool(weather and weather.get("wind_direction") is not None)

    for r in registry_records:
        d = haversine_km(station["lat"], station["lon"], r["lat"], r["lon"])
        if d > RADIUS_KM:
            continue
        weight = SOURCE_WEIGHTS.get(r["source_type"], 1.0)
        active_bonus = 1.2 if r.get("active") else 0.6
        sf = size_factor(r.get("area_sqm"))
        wf = 1.0
        if has_wind:
            wf = wind_factor(
                station["lat"], station["lon"], r["lat"], r["lon"],
                weather["wind_direction"], weather.get("wind_speed", 0),
            )
        contribution = weight * proximity_decay(d) * active_bonus * sf * wf
        scores[r["source_type"]] = scores.get(r["source_type"], 0) + contribution
        if contribution > 0.15:  # only keep meaningful evidence
            evidence.append({
                "source_id": r["id"], "source_type": r["source_type"],
                "distance_km": round(d, 2), "contribution": round(contribution, 3),
                "downwind": (wf > 1.05) if has_wind else None,
            })

    total = sum(scores.values()) or 1e-9
    ranked = sorted(
        [{"source_type": k, "confidence": round(v / total, 3), "raw_score": round(v, 3)}
         for k, v in scores.items()],
        key=lambda x: -x["confidence"]
    )
    evidence.sort(key=lambda e: -e["contribution"])
    return {
        "station": station["station_name"],
        "aqi": station["aqi"],
        "attribution": ranked,
        "evidence": evidence[:5],
        "wind_aware": has_wind,
    }


def _load_registry(data_dir):
    """Prefers the real OpenStreetMap-backed registry (Milestone 3) if it's
    been fetched; falls back to the original all-synthetic demo registry
    otherwise — same "backend picks up newer real data automatically"
    pattern used everywhere else in this project."""
    real_path = os.path.join(data_dir, "registry_delhi.json")
    if os.path.exists(real_path):
        with open(real_path) as f:
            return json.load(f)["records"], real_path
    demo_path = os.path.join(data_dir, "registry_demo_delhi.json")
    with open(demo_path) as f:
        return json.load(f)["records"], demo_path


def main():
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    aqi_data = load_latest(os.path.join(data_dir, "aqi_stations_*.json"))
    weather_data = load_latest(os.path.join(data_dir, "weather_*.json"))

    if aqi_data is None:
        print("No AQI data found yet — run ingestion/fetch_waqi.py first.")
        return

    registry, registry_path = _load_registry(data_dir)
    print(f"Using registry: {registry_path}")

    weather_by_station = {}
    if weather_data:
        weather_by_station = {w["station_name"]: w for w in weather_data.get("stations", [])}

    results = [
        attribute_station(s, registry, weather=weather_by_station.get(s["station_name"]))
        for s in aqi_data["stations"]
    ]
    results.sort(key=lambda r: -r["aqi"])

    out_path = os.path.join(data_dir, "attribution_results.json")
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2)

    print(f"Wrote attribution results for {len(results)} stations to {out_path}")
    for r in results[:5]:
        top = r["attribution"][0] if r["attribution"] else None
        print(f'  {r["station"]}: AQI {r["aqi"]}, top source = '
              f'{top["source_type"] if top else "none nearby"} '
              f'({top["confidence"]*100:.0f}% confidence)' if top else f'  {r["station"]}: no nearby sources')


if __name__ == "__main__":
    main()
