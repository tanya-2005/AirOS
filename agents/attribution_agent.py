"""
Attribution Agent
------------------
Input:  AQI station readings (data/aqi_stations_*.json)
        Registry of nearby sources (data/registry_demo_delhi.json)
Output: For each AQI hotspot, a ranked list of candidate source categories
        with a confidence score, plus a short evidence narrative.

Design note: keep the SCORING numeric and auditable (judges will ask "how did
you compute this"), and use Claude only to turn the numeric evidence into a
readable justification — not to invent the number. This is important:
a hackathon demo that can show its math is far more convincing than one that
says "the AI decided."

Scoring model (v1, deliberately simple — improve if time allows):
  For each AQI station, find registry sources within RADIUS_KM.
  score(source_type) = sum over nearby sources of:
      weight[source_type] * proximity_decay(distance) * active_bonus

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
# studies if you want to defend these numbers to judges
SOURCE_WEIGHTS = {
    "construction_site": 1.0,
    "industrial_stack": 1.6,
    "waste_burning_zone": 1.3,
    "diesel_generator_cluster": 0.9,
}


def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def proximity_decay(distance_km, radius_km=RADIUS_KM):
    """Linear decay to 0 at radius_km; closer sources matter more."""
    return max(0.0, 1 - distance_km / radius_km)


def load_latest(pattern):
    files = sorted(glob.glob(pattern))
    if not files:
        return None
    with open(files[-1]) as f:
        return json.load(f)


def attribute_station(station, registry_records):
    scores = {}
    evidence = []
    for r in registry_records:
        d = haversine_km(station["lat"], station["lon"], r["lat"], r["lon"])
        if d > RADIUS_KM:
            continue
        weight = SOURCE_WEIGHTS.get(r["source_type"], 1.0)
        active_bonus = 1.2 if r.get("active") else 0.6
        contribution = weight * proximity_decay(d) * active_bonus
        scores[r["source_type"]] = scores.get(r["source_type"], 0) + contribution
        if contribution > 0.15:  # only keep meaningful evidence
            evidence.append({
                "source_id": r["id"], "source_type": r["source_type"],
                "distance_km": round(d, 2), "contribution": round(contribution, 3)
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
    }


def main():
    aqi_data = load_latest(os.path.join(os.path.dirname(__file__), "..", "data", "aqi_stations_*.json"))
    registry_path = os.path.join(os.path.dirname(__file__), "..", "data", "registry_demo_delhi.json")

    if aqi_data is None:
        print("No AQI data found yet — run ingestion/fetch_waqi.py first.")
        return
    with open(registry_path) as f:
        registry = json.load(f)["records"]

    results = [attribute_station(s, registry) for s in aqi_data["stations"]]
    results.sort(key=lambda r: -r["aqi"])

    out_path = os.path.join(os.path.dirname(__file__), "..", "data", "attribution_results.json")
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
