import { apiFetch } from "./client";

// One function per backend route (backend/routers/*.py). Keep these thin —
// react-query hooks in lib/hooks wrap them with caching/loading/error state.
//
// Multi-City: every geographic endpoint takes a `city` id (e.g. "delhi",
// "mumbai") as its first argument and forwards it as `?city=` — the exact
// same query param every backend router now reads (default "delhi" there
// too, so omitting it is still 100% backward compatible). lib/hooks/useApi.js
// is the only place that actually reads the currently-selected city
// (via useCity()) and passes it in here; these functions don't know
// anything about "selected" vs "any" city, they just forward whatever
// they're given.

function withCity(path, city, extraParams = "") {
  const params = new URLSearchParams();
  if (city) params.set("city", city);
  if (extraParams) {
    for (const [k, v] of new URLSearchParams(extraParams)) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export const getAttribution = (city, signal) => apiFetch(withCity("/api/attribution", city), { signal });
export const getForecast = (city, signal) => apiFetch(withCity("/api/forecast", city), { signal });
export const getEnforcement = (city, signal) => apiFetch(withCity("/api/enforcement", city), { signal });
export const getRegistry = (city, signal) => apiFetch(withCity("/api/registry", city), { signal });
export const getHealth = (signal) => apiFetch("/api/health", { signal });

export const postSimulate = (scenario, signal) =>
  apiFetch("/api/simulate", { method: "POST", body: scenario, signal });

// Milestone 2 — weather + history
export const getWeatherCurrent = (city, signal) => apiFetch(withCity("/api/weather/current", city), { signal });
export const getWeatherHistory = (city, hours = 24, signal) =>
  apiFetch(withCity("/api/weather/history", city, `hours=${hours}`), { signal });
export const getStationHistory = (stationName, city, hours = 24, signal) =>
  apiFetch(withCity(`/api/history/station/${encodeURIComponent(stationName)}`, city, `hours=${hours}`), { signal });
export const getCityHistory = (city, hours = 24, signal) =>
  apiFetch(withCity("/api/history/city", city, `hours=${hours}`), { signal });

// Milestone 3 — geospatial
export const getRoads = (city, signal) => apiFetch(withCity("/api/geo/roads", city), { signal });

// Phase 7 — incident management
export const getIncidents = (city, signal) => apiFetch(withCity("/api/incidents", city), { signal });
export const getIncident = (incidentId, signal) =>
  apiFetch(`/api/incidents/${encodeURIComponent(incidentId)}`, { signal });
export const patchIncident = (incidentId, payload, signal) =>
  apiFetch(`/api/incidents/${encodeURIComponent(incidentId)}`, { method: "PATCH", body: payload, signal });

// Phase 8 — authentication
export const postLogin = (email, password, signal) =>
  apiFetch("/api/auth/login", { method: "POST", body: { email, password }, signal });
export const postLogout = (signal) => apiFetch("/api/auth/logout", { method: "POST", signal });
export const getMe = (signal) => apiFetch("/api/auth/me", { signal });

// Phase 8 — users, tasks, notifications, assignment (not city-scoped —
// these are user/operator resources, not geographic ones)
export const getUsers = (signal) => apiFetch("/api/users", { signal });
export const getTasks = (incidentId, signal) =>
  apiFetch(`/api/tasks${incidentId ? `?incident_id=${encodeURIComponent(incidentId)}` : ""}`, { signal });
export const patchTask = (taskId, payload, signal) =>
  apiFetch(`/api/tasks/${encodeURIComponent(taskId)}`, { method: "PATCH", body: payload, signal });
export const getNotifications = (signal) => apiFetch("/api/notifications", { signal });
export const patchNotificationRead = (notificationId, signal) =>
  apiFetch(`/api/notifications/${encodeURIComponent(notificationId)}`, { method: "PATCH", signal });
export const postAssignIncident = (incidentId, payload, signal) =>
  apiFetch(`/api/incidents/${encodeURIComponent(incidentId)}/assign`, { method: "POST", body: payload, signal });
export const postIncidentNote = (incidentId, text, signal) =>
  apiFetch(`/api/incidents/${encodeURIComponent(incidentId)}/notes`, { method: "POST", body: { text }, signal });

// Phase 9 — Citizen Health Advisory
export const getCityHealthAdvisory = (city, signal) => apiFetch(withCity("/api/health-advisory/city", city), { signal });
export const getStationHealthAdvisory = (stationName, city, signal) =>
  apiFetch(withCity(`/api/health-advisory/station/${encodeURIComponent(stationName)}`, city), { signal });

// Phase 10 — Multi-City
export const getCities = (signal) => apiFetch("/api/cities", { signal });
export const getCityComparison = (signal) => apiFetch("/api/cities/compare", { signal });

// Phase 11 — AI Validation & Performance. Reuses withCity() the same as
// every other geographic endpoint; system-health and report span all
// cities by definition (see backend/routers/validation.py), same pattern
// as getCities/getCityComparison above.
export const getForecastValidation = (city, station, signal) =>
  apiFetch(withCity("/api/validation/forecast", city, station ? `station=${encodeURIComponent(station)}` : ""), { signal });
export const getAttributionReliability = (city, signal) =>
  apiFetch(withCity("/api/validation/attribution", city), { signal });
export const getModelReliability = (city, signal) =>
  apiFetch(withCity("/api/validation/reliability", city), { signal });
export const getSystemHealth = (signal) => apiFetch("/api/validation/system-health", { signal });
export const getValidationReport = (signal) => apiFetch("/api/validation/report", { signal });
export const getIncidentValidation = (incidentId, signal) =>
  apiFetch(`/api/validation/incident/${encodeURIComponent(incidentId)}`, { signal });
