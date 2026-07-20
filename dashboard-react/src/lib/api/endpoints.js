import { apiFetch } from "./client";

// One function per backend route (backend/routers/*.py). Keep these thin —
// react-query hooks in lib/hooks wrap them with caching/loading/error state.

export const getAttribution = (signal) => apiFetch("/api/attribution", { signal });
export const getForecast = (signal) => apiFetch("/api/forecast", { signal });
export const getEnforcement = (signal) => apiFetch("/api/enforcement", { signal });
export const getRegistry = (signal) => apiFetch("/api/registry", { signal });
export const getHealth = (signal) => apiFetch("/api/health", { signal });

export const postSimulate = (scenario, signal) =>
  apiFetch("/api/simulate", { method: "POST", body: scenario, signal });

// Milestone 2 — weather + history
export const getWeatherCurrent = (signal) => apiFetch("/api/weather/current", { signal });
export const getWeatherHistory = (hours = 24, signal) =>
  apiFetch(`/api/weather/history?hours=${hours}`, { signal });
export const getStationHistory = (stationName, hours = 24, signal) =>
  apiFetch(`/api/history/station/${encodeURIComponent(stationName)}?hours=${hours}`, { signal });
export const getCityHistory = (hours = 24, signal) =>
  apiFetch(`/api/history/city?hours=${hours}`, { signal });

// Milestone 3 — geospatial
export const getRoads = (signal) => apiFetch("/api/geo/roads", { signal });
