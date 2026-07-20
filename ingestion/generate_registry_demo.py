"""
IMPORTANT: There is no public real-time API for construction-permit or
industrial-stack registries in India that's accessible within a hackathon
timeframe. Municipal building-permit data exists but is siloed per-city,
often PDF-only, and not standardized.

This script generates a STRUCTURALLY REALISTIC synthetic registry so the
Attribution and Enforcement agents have something to correlate against.
Label this honestly as "simulated registry data" in your demo — judges will
respect an honest "we simulated X because no public API exists, here's how
it'd plug into the real one" far more than a claim you can't back up.

If you get extra time: Delhi's DPCC (Delhi Pollution Control Committee)
publishes some industrial consent-to-operate lists as static PDFs/pages —
worth a quick scrape for 10-20 real entries to seed realism.
"""
import json
import random
import os

random.seed(42)

SOURCE_TYPES = ["construction_site", "industrial_stack", "waste_burning_zone", "diesel_generator_cluster"]

DELHI_WARD_CENTROIDS = [
    # (ward_name, lat, lon) — a representative sample; extend with real ward
    # boundary data from Delhi's GIS portal if time allows
    ("Wazirpur", 28.6996, 77.1636),
    ("Mundka", 28.6819, 77.0388),
    ("Anand Vihar", 28.6469, 77.3157),
    ("RK Puram", 28.5651, 77.1770),
    ("Okhla", 28.5355, 77.2853),
    ("Dwarka", 28.5921, 77.0460),
    ("Rohini", 28.7495, 77.0565),
    ("Najafgarh", 28.6092, 76.9797),
]


def jitter(val, spread=0.01):
    return val + random.uniform(-spread, spread)


def generate(n=60):
    records = []
    for i in range(n):
        ward, lat, lon = random.choice(DELHI_WARD_CENTROIDS)
        source_type = random.choice(SOURCE_TYPES)
        records.append({
            "id": f"REG-{i+1:04d}",
            "source_type": source_type,
            "ward": ward,
            "lat": round(jitter(lat), 5),
            "lon": round(jitter(lon), 5),
            "registered_name": f"{source_type.replace('_', ' ').title()} #{i+1}",
            "active": random.random() > 0.15,
            "permit_status": random.choice(["valid", "expired", "unregistered"]),
            "last_inspection_days_ago": random.randint(1, 400),
        })
    return records


if __name__ == "__main__":
    data = generate(60)
    out_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "registry_demo_delhi.json")
    with open(out_path, "w") as f:
        json.dump({"note": "SIMULATED DATA - see script docstring", "records": data}, f, indent=2)
    print(f"Wrote {len(data)} synthetic registry records to {out_path}")
