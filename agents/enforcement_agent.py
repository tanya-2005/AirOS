"""
Enforcement Agent
------------------
Turns attribution + registry data into a ranked, evidence-backed action list.
This is your "Government Decision Agent" -- reuses simulation_agent's math so
every recommendation comes with an expected AQI impact %, not just a label.

Priority score combines:
  - severity (how bad is the AQI right now)
  - attribution confidence (how sure are we this source is the cause)
  - actionability (unregistered/expired-permit sources are easier wins --
    already a compliance violation, not just a pollution contributor)
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from simulation_agent import simulate  # reuse the impact-estimation math

ACTION_TEMPLATES = {
    "construction_site": {"action": "Enforce dust-control / water sprinkling order", "typical_reduction_pct": 40},
    "industrial_stack": {"action": "Inspect emission-control compliance", "typical_reduction_pct": 25},
    "waste_burning_zone": {"action": "Deploy enforcement patrol to stop burning", "typical_reduction_pct": 60},
    "diesel_generator_cluster": {"action": "Enforce diesel generator restrictions / power backup audit", "typical_reduction_pct": 20},
}


def severity_score(aqi):
    if aqi > 300:
        return 1.0
    if aqi > 200:
        return 0.7
    if aqi > 150:
        return 0.4
    return 0.1


def build_recommendations(attribution_results, registry_records):
    registry_by_id = {r["id"]: r for r in registry_records}
    recommendations = []

    for station_result in attribution_results:
        if not station_result["attribution"]:
            continue
        sev = severity_score(station_result["aqi"])
        shares = {a["source_type"]: a["confidence"] for a in station_result["attribution"]}

        for ev in station_result["evidence"]:
            source = registry_by_id.get(ev["source_id"])
            if not source:
                continue
            template = ACTION_TEMPLATES.get(ev["source_type"])
            if not template:
                continue

            actionability = 1.2 if source["permit_status"] != "valid" else 0.8
            confidence = next((a["confidence"] for a in station_result["attribution"]
                                if a["source_type"] == ev["source_type"]), 0)
            priority = round(sev * confidence * actionability, 3)

            sim = simulate(station_result["aqi"], shares,
                            reductions={ev["source_type"]: template["typical_reduction_pct"]})

            recommendations.append({
                "priority_score": priority,
                "station": station_result["station"],
                "current_aqi": station_result["aqi"],
                "source_id": source["id"],
                "source_name": source["registered_name"],
                "source_type": ev["source_type"],
                "permit_status": source["permit_status"],
                "distance_km": ev["distance_km"],
                "action": template["action"],
                "attribution_confidence": confidence,
                "expected_aqi_improvement_pct": sim["improvement_pct"],
                "projected_aqi_if_actioned": sim["projected_aqi"],
                "evidence": {
                    "last_inspection_days_ago": source["last_inspection_days_ago"],
                    "active": source["active"],
                },
            })

    recommendations.sort(key=lambda r: -r["priority_score"])
    return recommendations


def main():
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    attr_path = os.path.join(data_dir, "attribution_results.json")
    registry_path = os.path.join(data_dir, "registry_demo_delhi.json")

    if not os.path.exists(attr_path):
        print("Run attribution_agent.py first.")
        return

    with open(attr_path) as f:
        attribution = json.load(f)
    with open(registry_path) as f:
        registry = json.load(f)["records"]

    recs = build_recommendations(attribution, registry)

    out_path = os.path.join(data_dir, "enforcement_queue.json")
    with open(out_path, "w") as f:
        json.dump(recs, f, indent=2)

    print(f"Wrote {len(recs)} prioritized recommendations to {out_path}\n")
    print("Top 5 priority actions:")
    for r in recs[:5]:
        print(f"  [{r['priority_score']}] {r['action']} @ {r['source_name']} "
              f"(near {r['station']}, AQI {r['current_aqi']}) "
              f"-> est. {r['expected_aqi_improvement_pct']}% improvement")


if __name__ == "__main__":
    main()
