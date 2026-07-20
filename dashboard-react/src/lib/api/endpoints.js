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
