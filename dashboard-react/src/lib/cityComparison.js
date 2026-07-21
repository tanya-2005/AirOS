// Shared derivation logic over /api/cities/compare rows — used by both the
// City Comparison page and the Intelligence Report's Multiple Cities /
// National Comparison modes, so ranking/trend logic lives in exactly one
// place instead of being re-implemented per page.
import { EMERGENCY_LEVELS } from "./healthAdvisory";

// Government Priority ranking: derived entirely from fields the backend
// already returns (emergency level + active incident count + current AQI) —
// no new score is invented. Cities in the worst public-health emergency
// tier rank first, ties broken by how many incidents are currently open,
// then by raw AQI. Cities with no live data yet rank last since there's
// nothing real to prioritize against (see backend/pipeline.get_city_comparison).
export function rankCities(rows) {
  const withData = rows.filter((r) => r.data_source === "live_pipeline");
  const withoutData = rows.filter((r) => r.data_source !== "live_pipeline");
  const sorted = [...withData].sort((a, b) => {
    const emergencyDiff = EMERGENCY_LEVELS.indexOf(b.emergency_level) - EMERGENCY_LEVELS.indexOf(a.emergency_level);
    if (emergencyDiff !== 0) return emergencyDiff;
    const incidentDiff = (b.active_incident_count ?? 0) - (a.active_incident_count ?? 0);
    if (incidentDiff !== 0) return incidentDiff;
    return (b.current_aqi ?? 0) - (a.current_aqi ?? 0);
  });
  return [...sorted, ...withoutData];
}

export function citiesWithLiveData(rows) {
  return rows.filter((r) => r.data_source === "live_pipeline");
}

export function bestPerformingCity(rows) {
  const withData = citiesWithLiveData(rows);
  return withData.length ? [...withData].sort((a, b) => a.current_aqi - b.current_aqi)[0] : null;
}

export function worstPerformingCity(rows) {
  const withData = citiesWithLiveData(rows);
  return withData.length ? [...withData].sort((a, b) => b.current_aqi - a.current_aqi)[0] : null;
}

// 24h-forecast-trending-down vs. currently at Severe/Emergency — both
// derived from fields already on the row, no separate metric.
export function improvingCities(rows) {
  return citiesWithLiveData(rows).filter((r) => r.forecast_aqi != null && r.forecast_aqi < r.current_aqi);
}

export function criticalCities(rows) {
  return citiesWithLiveData(rows).filter((r) => r.emergency_level === "Severe" || r.emergency_level === "Emergency");
}
