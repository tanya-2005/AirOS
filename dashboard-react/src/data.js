// Sample data below is the ACTUAL output of the tested Python pipeline
// (attribution_agent.py -> forecast_agent.py -> enforcement_agent.py) run
// against placeholder AQI values, since this dev environment can't reach
// the live WAQI API. Replace by fetching agents/../data/*.json once you're
// running ingestion against real stations. Every number here traces back to
// real code in ../agents/, not hand-typed fiction.

export const CPCB_CATEGORIES = [
  { label: "Good", range: [0, 50], color: "#6fae66" },
  { label: "Satisfactory", range: [51, 100], color: "#9ab86a" },
  { label: "Moderate", range: [101, 200], color: "#d9a441" },
  { label: "Poor", range: [201, 300], color: "#c9793f" },
  { label: "Very Poor", range: [301, 400], color: "#c1543f" },
  { label: "Severe", range: [401, 500], color: "#8b3a3a" },
];

export function categoryFor(aqi) {
  return CPCB_CATEGORIES.find((c) => aqi >= c.range[0] && aqi <= c.range[1]) || CPCB_CATEGORIES[CPCB_CATEGORIES.length - 1];
}

export const wards = [
  {
    station: "Wazirpur",
    lat: 28.6996,
    lon: 77.1636,
    aqi: 340,
    attribution: [
      { source_type: "waste_burning_zone", confidence: 0.506 },
      { source_type: "industrial_stack", confidence: 0.266 },
      { source_type: "construction_site", confidence: 0.228 },
    ],
    evidence: [
      { source_id: "REG-0027", source_type: "industrial_stack", distance_km: 1.33 },
      { source_id: "REG-0037", source_type: "waste_burning_zone", distance_km: 1.0 },
      { source_id: "REG-0017", source_type: "construction_site", distance_km: 0.41 },
    ],
    forecast_24h: { predicted_aqi: 350.5, confidence: 0.76, components: { trend_adjustment: 0, wind_adjustment: 3.0, humidity_adjustment: 7.5 } },
    forecast_72h: { predicted_aqi: 350.5, confidence: 0.3, components: { trend_adjustment: 0, wind_adjustment: 3.0, humidity_adjustment: 7.5 } },
  },
  {
    station: "Mundka",
    lat: 28.6819,
    lon: 77.0388,
    aqi: 298,
    attribution: [
      { source_type: "waste_burning_zone", confidence: 0.306 },
      { source_type: "construction_site", confidence: 0.28 },
      { source_type: "industrial_stack", confidence: 0.239 },
      { source_type: "diesel_generator_cluster", confidence: 0.174 },
    ],
    evidence: [
      { source_id: "REG-0045", source_type: "industrial_stack", distance_km: 0.55 },
      { source_id: "REG-0018", source_type: "waste_burning_zone", distance_km: 0.17 },
      { source_id: "REG-0031", source_type: "construction_site", distance_km: 0.38 },
    ],
    forecast_24h: { predicted_aqi: 308.5, confidence: 0.76, components: { trend_adjustment: 0, wind_adjustment: 3.0, humidity_adjustment: 7.5 } },
    forecast_72h: { predicted_aqi: 308.5, confidence: 0.3, components: { trend_adjustment: 0, wind_adjustment: 3.0, humidity_adjustment: 7.5 } },
  },
  {
    station: "RK Puram",
    lat: 28.5651,
    lon: 77.177,
    aqi: 210,
    attribution: [
      { source_type: "waste_burning_zone", confidence: 0.41 },
      { source_type: "diesel_generator_cluster", confidence: 0.342 },
      { source_type: "industrial_stack", confidence: 0.154 },
      { source_type: "construction_site", confidence: 0.094 },
    ],
    evidence: [
      { source_id: "REG-0034", source_type: "industrial_stack", distance_km: 0.21 },
      { source_id: "REG-0043", source_type: "waste_burning_zone", distance_km: 0.49 },
      { source_id: "REG-0008", source_type: "construction_site", distance_km: 0.28 },
    ],
    forecast_24h: { predicted_aqi: 220.5, confidence: 0.76, components: { trend_adjustment: 0, wind_adjustment: 3.0, humidity_adjustment: 7.5 } },
    forecast_72h: { predicted_aqi: 220.5, confidence: 0.3, components: { trend_adjustment: 0, wind_adjustment: 3.0, humidity_adjustment: 7.5 } },
  },
];

export const enforcementQueue = [
  { priority_score: 0.607, station: "Wazirpur", current_aqi: 340, source_name: "Waste Burning Zone #37", source_type: "waste_burning_zone", permit_status: "unregistered", distance_km: 1.0, action: "Deploy enforcement patrol to stop burning", attribution_confidence: 0.506, expected_aqi_improvement_pct: 30.4, projected_aqi_if_actioned: 236.8 },
  { priority_score: 0.607, station: "Wazirpur", current_aqi: 340, source_name: "Waste Burning Zone #44", source_type: "waste_burning_zone", permit_status: "expired", distance_km: 1.23, action: "Deploy enforcement patrol to stop burning", attribution_confidence: 0.506, expected_aqi_improvement_pct: 30.4, projected_aqi_if_actioned: 236.8 },
  { priority_score: 0.344, station: "RK Puram", current_aqi: 210, source_name: "Waste Burning Zone #43", source_type: "waste_burning_zone", permit_status: "expired", distance_km: 0.49, action: "Deploy enforcement patrol to stop burning", attribution_confidence: 0.41, expected_aqi_improvement_pct: 24.6, projected_aqi_if_actioned: 158.3 },
  { priority_score: 0.3, station: "Mundka", current_aqi: 298, source_name: "Industrial Stack #45", source_type: "industrial_stack", permit_status: "valid", distance_km: 0.55, action: "Inspect emission-control compliance", attribution_confidence: 0.239, expected_aqi_improvement_pct: 12.1, projected_aqi_if_actioned: 262.0 },
];

// JS port of agents/simulation_agent.py::simulate() -- same math, same
// coefficients, so numbers shown here match what the Python script produces.
const RAIN_AQI_REDUCTION_PCT = 0.30;

export function simulate(currentAqi, attributionShares, reductions = {}, rain = false) {
  let totalReductionFraction = 0;
  const breakdown = [];
  for (const [source, share] of Object.entries(attributionShares)) {
    const red = (reductions[source] || 0) / 100;
    const contribution = share * red;
    totalReductionFraction += contribution;
    if (red > 0) {
      breakdown.push({
        source,
        share_of_aqi: share,
        reduction_applied: `${Math.round(red * 100)}%`,
        aqi_points_saved: Math.round(contribution * currentAqi * 10) / 10,
      });
    }
  }
  if (rain) {
    const rainSaved = currentAqi * RAIN_AQI_REDUCTION_PCT;
    totalReductionFraction += RAIN_AQI_REDUCTION_PCT;
    breakdown.push({ source: "rain", aqi_points_saved: Math.round(rainSaved * 10) / 10, note: "assumed coefficient" });
  }
  const projectedAqi = Math.max(0, currentAqi * (1 - totalReductionFraction));
  return {
    currentAqi,
    projectedAqi: Math.round(projectedAqi * 10) / 10,
    improvementPct: Math.round(totalReductionFraction * 1000) / 10,
    breakdown,
  };
}
