"""
Simulation Agent
-----------------
"What if traffic dropped 20%?" "What if it rains tomorrow?"

This is the cheapest big win in the whole project: it reuses the attribution
scores you already computed (which source contributes what %) and just
scales them down under a hypothetical, then recombines into a projected AQI.
No new model needed -- that's why it's worth building before anything else
on the "nice to have" list.

Model:
  projected_aqi = current_aqi - sum(source_share[i] * reduction[i] * current_aqi)
  Rain gets a flat empirical knockdown (rain scrubs particulates) --
  cite a real figure if you find one in a CPCB/IMD study, otherwise label
  it clearly as an assumed coefficient in your deck.
"""
import json
import os

RAIN_AQI_REDUCTION_PCT = 0.30  # assumed; label as such in the deck


def simulate(current_aqi, attribution_shares, reductions=None, rain=False):
    """
    attribution_shares: dict like {"construction_site": 0.32, "industrial_stack": 0.18, ...}
    reductions: dict of {source_type: reduction_pct_0_to_100}, e.g.
                {"construction_site": 50, "waste_burning_zone": 60}
                Any source_type present in attribution_shares but absent
                here is treated as 0% reduction (no action taken on it).
    """
    reductions = reductions or {}
    total_reduction_fraction = 0.0
    breakdown = []
    for source, share in attribution_shares.items():
        red = reductions.get(source, 0) / 100
        contribution = share * red
        total_reduction_fraction += contribution
        if red > 0:
            breakdown.append({"source": source, "share_of_aqi": round(share, 2),
                               "reduction_applied": f"{red*100:.0f}%",
                               "aqi_points_saved": round(contribution * current_aqi, 1)})

    if rain:
        rain_saved = current_aqi * RAIN_AQI_REDUCTION_PCT
        total_reduction_fraction += RAIN_AQI_REDUCTION_PCT
        breakdown.append({"source": "rain", "aqi_points_saved": round(rain_saved, 1),
                           "note": "assumed coefficient, cite real study if available"})

    projected_aqi = max(0, current_aqi * (1 - total_reduction_fraction))
    return {
        "current_aqi": current_aqi,
        "projected_aqi": round(projected_aqi, 1),
        "improvement_pct": round(total_reduction_fraction * 100, 1),
        "breakdown": breakdown,
        "scenario": {"reductions": reductions, "rain": rain},
    }


def simulate_citizen_scenario(current_aqi, attribution_shares, traffic_reduction_pct=0,
                               construction_reduction_pct=0, rain=False):
    """
    Friendly wrapper for the dashboard's what-if sliders (matches the
    "trafficReduction / constructionReduction / rain" shape from your API
    design doc). Maps UI-friendly names onto real registry source_types.

    NOTE: traffic isn't its own registry source_type yet -- it's proxied via
    diesel_generator_cluster at a discount factor until you add a real
    traffic/road-density layer to the attribution agent's inputs.
    """
    reductions = {
        "construction_site": construction_reduction_pct,
        "diesel_generator_cluster": traffic_reduction_pct * 0.5,
    }
    return simulate(current_aqi, attribution_shares, reductions=reductions, rain=rain)


def main():
    attr_path = os.path.join(os.path.dirname(__file__), "..", "data", "attribution_results.json")
    if not os.path.exists(attr_path):
        print("Run attribution_agent.py first.")
        return
    with open(attr_path) as f:
        attribution = json.load(f)

    # Demo: simulate on the single worst station
    if not attribution:
        print("No attribution results.")
        return
    worst = attribution[0]
    shares = {a["source_type"]: a["confidence"] for a in worst["attribution"]}

    print(f"Simulating scenarios for {worst['station']} (current AQI {worst['aqi']}):\n")
    scenarios = [
        {"construction_reduction_pct": 50},
        {"traffic_reduction_pct": 30},
        {"rain": True},
        {"construction_reduction_pct": 50, "traffic_reduction_pct": 30, "rain": True},
    ]
    all_results = []
    for sc in scenarios:
        result = simulate_citizen_scenario(worst["aqi"], shares, **sc)
        all_results.append(result)
        print(f"  Scenario {sc}: AQI {worst['aqi']} -> {result['projected_aqi']} "
              f"({result['improvement_pct']}% improvement)")

    out_path = os.path.join(os.path.dirname(__file__), "..", "data", "simulation_demo.json")
    with open(out_path, "w") as f:
        json.dump(all_results, f, indent=2)
    print(f"\nWrote {len(all_results)} scenario results to {out_path}")


if __name__ == "__main__":
    main()
