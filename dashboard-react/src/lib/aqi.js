// CPCB AQI category bands + the client-side simulation math.
//
// The simulate() port below is a 1:1 mirror of agents/simulation_agent.py's
// simulate() — kept ONLY as an offline fallback for the Scenario Lab page
// when /api/simulate is unreachable (see lib/api/simulation.js). The live
// backend call is the source of truth; this never runs unless the network
// request fails.

export const CPCB_CATEGORIES = [
  { label: "Good", range: [0, 50], color: "#2E7D52", bg: "#E8F1EA" },
  { label: "Satisfactory", range: [51, 100], color: "#4CAF7D", bg: "#E8F1EA" },
  { label: "Moderate", range: [101, 200], color: "#9A7217", bg: "#FBF3E1" },
  { label: "Poor", range: [201, 300], color: "#B7502C", bg: "#FBEDE8" },
  { label: "Very Poor", range: [301, 400], color: "#D4663B", bg: "#FBEDE8" },
  { label: "Severe", range: [401, 500], color: "#9A2F41", bg: "#F6E6E8" },
];

export function categoryFor(aqi) {
  return (
    CPCB_CATEGORIES.find((c) => aqi >= c.range[0] && aqi <= c.range[1]) ||
    CPCB_CATEGORIES[CPCB_CATEGORIES.length - 1]
  );
}

// Coarser 4-bucket badge used on dark panels (Scenario Lab prediction card,
// AI's Pick) where the full 6-band CPCB scale would be too fine-grained for
// a single pill. categoryFor()/CPCB_CATEGORIES above remain the
// government-standard scale used everywhere else (gauge, tables, legends).
export function darkPanelCategoryFor(aqi) {
  if (aqi <= 100) return { label: "Good", bg: "#22312A", fg: "#8FD3AE" };
  if (aqi <= 150) return { label: "Moderate", bg: "#33301E", fg: "#E6C878" };
  if (aqi <= 200) return { label: "Unhealthy", bg: "#3A2A22", fg: "#F0A184" };
  return { label: "Hazardous", bg: "#3A2027", fg: "#EE8697" };
}

const RAIN_AQI_REDUCTION_PCT = 0.3; // assumed coefficient — not sourced, see simulation_agent.py docstring

/**
 * Offline fallback mirror of agents/simulation_agent.py::simulate().
 * attributionShares: { [source_type]: confidence_0_to_1 }
 * reductions: { [source_type]: reduction_pct_0_to_100 }
 */
export function simulateLocally(currentAqi, attributionShares, reductions = {}, rain = false) {
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
    breakdown.push({
      source: "rain",
      aqi_points_saved: Math.round(rainSaved * 10) / 10,
      note: "assumed coefficient",
    });
  }
  const projectedAqi = Math.max(0, currentAqi * (1 - totalReductionFraction));
  return {
    current_aqi: currentAqi,
    projected_aqi: Math.round(projectedAqi * 10) / 10,
    improvement_pct: Math.round(totalReductionFraction * 1000) / 10,
    breakdown,
    source: "offline_fallback",
  };
}
