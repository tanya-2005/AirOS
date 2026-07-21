"""
IMPORTANT: There is no public real-time API for construction-permit or
industrial-stack registries in India that's accessible within a hackathon
timeframe. Municipal building-permit data exists but is siloed per-city,
often PDF-only, and not standardized.

This script generates a STRUCTURALLY REALISTIC synthetic registry per city
so the Attribution and Enforcement agents have something to correlate
against wherever fetch_osm_registry.py's real OpenStreetMap data doesn't
cover a source type (diesel generators have no OSM tag at all; occasional
OSM categories fail for a given city). Label this honestly as "simulated
registry data" — judges will respect an honest "we simulated X because no
public API exists" far more than a claim you can't back up.

Ward centroids below are real, well-known localities in each city (the
same practice the original Delhi-only version of this script already used
— Wazirpur, Mundka, etc. are real neighborhoods, not official ward
boundaries either) — not official municipal ward polygons, which aren't
available as open data for any of these cities within a hackathon
timeframe.

Usage:
    python generate_registry_demo.py             # all 6 cities
    python generate_registry_demo.py --city pune  # just one
"""
import argparse
import json
import os
import random

SOURCE_TYPES = ["construction_site", "industrial_stack", "waste_burning_zone", "diesel_generator_cluster"]

# (ward_name, lat, lon) per city — real localities, representative samples.
CITY_WARD_CENTROIDS = {
    "delhi": [
        ("Wazirpur", 28.6996, 77.1636),
        ("Mundka", 28.6819, 77.0388),
        ("Anand Vihar", 28.6469, 77.3157),
        ("RK Puram", 28.5651, 77.1770),
        ("Okhla", 28.5355, 77.2853),
        ("Dwarka", 28.5921, 77.0460),
        ("Rohini", 28.7495, 77.0565),
        ("Najafgarh", 28.6092, 76.9797),
    ],
    "mumbai": [
        ("Andheri", 19.1197, 72.8468),
        ("Bandra", 19.0596, 72.8295),
        ("Worli", 19.0176, 72.8162),
        ("Dadar", 19.0178, 72.8478),
        ("Chembur", 19.0522, 72.9005),
        ("Powai", 19.1176, 72.9060),
        ("Borivali", 19.2307, 72.8567),
        ("Kurla", 19.0728, 72.8826),
    ],
    "bengaluru": [
        ("Whitefield", 12.9698, 77.7500),
        ("Peenya", 13.0284, 77.5205),
        ("Electronic City", 12.8452, 77.6602),
        ("Jayanagar", 12.9308, 77.5838),
        ("Yeshwanthpur", 13.0284, 77.5540),
        ("Hebbal", 13.0358, 77.5970),
        ("Marathahalli", 12.9591, 77.6974),
        ("Rajajinagar", 12.9910, 77.5550),
    ],
    "chennai": [
        ("Ambattur", 13.1143, 80.1548),
        ("Guindy", 13.0067, 80.2206),
        ("Perungudi", 12.9634, 80.2469),
        ("T Nagar", 13.0418, 80.2341),
        ("Manali", 13.1667, 80.2667),
        ("Tondiarpet", 13.1230, 80.2870),
        ("Velachery", 12.9791, 80.2211),
        ("Porur", 13.0374, 80.1575),
    ],
    "hyderabad": [
        ("Patancheru", 17.5308, 78.2670),
        ("Balanagar", 17.4667, 78.4500),
        ("Uppal", 17.4014, 78.5590),
        ("Jeedimetla", 17.5100, 78.4400),
        ("Kukatpally", 17.4849, 78.4108),
        ("LB Nagar", 17.3467, 78.5500),
        ("Cherlapally", 17.4747, 78.5550),
        ("Gachibowli", 17.4401, 78.3489),
    ],
    "pune": [
        ("Hadapsar", 18.5089, 73.9260),
        ("Pimpri", 18.6298, 73.7997),
        ("Bhosari", 18.6228, 73.8400),
        ("Chinchwad", 18.6298, 73.7997),
        ("Hinjewadi", 18.5912, 73.7389),
        ("Wagholi", 18.5793, 73.9819),
        ("Kothrud", 18.5074, 73.8077),
        ("Katraj", 18.4575, 73.8677),
    ],
}


def jitter(rng, val, spread=0.01):
    return val + rng.uniform(-spread, spread)


def generate(city, n=60):
    # A fixed per-city seed (NOT Python's built-in hash() -- that's salted
    # per-process by default, which would silently regenerate a different
    # "synthetic" registry every run) so every city gets an independent but
    # fully reproducible layout instead of all 6 cities sharing one stream.
    rng = random.Random(42 + sum(ord(c) for c in city))
    centroids = CITY_WARD_CENTROIDS[city]
    records = []
    for i in range(n):
        ward, lat, lon = rng.choice(centroids)
        source_type = rng.choice(SOURCE_TYPES)
        records.append({
            "id": f"REG-{i+1:04d}",
            "source_type": source_type,
            "ward": ward,
            "lat": round(jitter(rng, lat), 5),
            "lon": round(jitter(rng, lon), 5),
            "registered_name": f"{source_type.replace('_', ' ').title()} #{i+1}",
            "active": rng.random() > 0.15,
            "permit_status": rng.choice(["valid", "expired", "unregistered"]),
            "last_inspection_days_ago": rng.randint(1, 400),
        })
    return records


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--city", choices=list(CITY_WARD_CENTROIDS.keys()), default=None,
                     help="Omit to generate for all 6 cities at once.")
    args = ap.parse_args()

    cities = [args.city] if args.city else list(CITY_WARD_CENTROIDS.keys())
    out_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    os.makedirs(out_dir, exist_ok=True)

    for city in cities:
        data = generate(city, 60)
        out_path = os.path.join(out_dir, f"registry_demo_{city}.json")
        with open(out_path, "w") as f:
            json.dump({"note": "SIMULATED DATA - see script docstring", "records": data}, f, indent=2)
        print(f"Wrote {len(data)} synthetic registry records to {out_path}")


if __name__ == "__main__":
    main()
