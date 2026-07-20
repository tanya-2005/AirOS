import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAttribution,
  getForecast,
  getEnforcement,
  getRegistry,
  postSimulate,
  getWeatherCurrent,
  getWeatherHistory,
  getStationHistory,
  getCityHistory,
  getRoads,
} from "../api/endpoints";

// Thin react-query wrappers, one per resource, shared by every page that
// needs it (Command Center + Attribution both use attribution data, etc.)
// so the network request is de-duped and cached instead of re-fetched per page.

const STALE_TIME = 60_000;

export function useAttribution() {
  return useQuery({
    queryKey: ["attribution"],
    queryFn: ({ signal }) => getAttribution(signal),
    staleTime: STALE_TIME,
  });
}

export function useForecast() {
  return useQuery({
    queryKey: ["forecast"],
    queryFn: ({ signal }) => getForecast(signal),
    staleTime: STALE_TIME,
  });
}

export function useEnforcement() {
  return useQuery({
    queryKey: ["enforcement"],
    queryFn: ({ signal }) => getEnforcement(signal),
    staleTime: STALE_TIME,
  });
}

export function useRegistry() {
  return useQuery({
    queryKey: ["registry"],
    queryFn: ({ signal }) => getRegistry(signal),
    staleTime: STALE_TIME,
  });
}

export function useSimulate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scenario) => postSimulate(scenario),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enforcement"] });
    },
  });
}

// Milestone 2 — weather + history. Shorter staleTime than the others:
// ingestion can run every 15 min (scheduler.py), so these are worth
// refetching a bit more eagerly than attribution/forecast/enforcement,
// which only change when a full agent run happens.
const HISTORY_STALE_TIME = 30_000;

export function useWeatherCurrent() {
  return useQuery({
    queryKey: ["weather", "current"],
    queryFn: ({ signal }) => getWeatherCurrent(signal),
    staleTime: HISTORY_STALE_TIME,
  });
}

export function useWeatherHistory(hours = 24) {
  return useQuery({
    queryKey: ["weather", "history", hours],
    queryFn: ({ signal }) => getWeatherHistory(hours, signal),
    staleTime: HISTORY_STALE_TIME,
  });
}

export function useStationHistory(stationName, hours = 24) {
  return useQuery({
    queryKey: ["history", "station", stationName, hours],
    queryFn: ({ signal }) => getStationHistory(stationName, hours, signal),
    enabled: !!stationName,
    staleTime: HISTORY_STALE_TIME,
  });
}

export function useCityHistory(hours = 24) {
  return useQuery({
    queryKey: ["history", "city", hours],
    queryFn: ({ signal }) => getCityHistory(hours, signal),
    staleTime: HISTORY_STALE_TIME,
  });
}

// Milestone 3 — geospatial. Roads don't change between ingestion runs in
// any meaningful way, so a much longer staleTime than the live data above.
export function useRoads() {
  return useQuery({
    queryKey: ["geo", "roads"],
    queryFn: ({ signal }) => getRoads(signal),
    staleTime: 10 * 60_000,
  });
}

// Milestone 5 — one real /api/simulate preview per policy card, run in
// parallel via useQueries (the array of policies is fixed at module load,
// so this doesn't violate rules-of-hooks the way a loop of useQuery calls
// would). Each card's "AQI reduction" number is a live backend result, not
// an estimate — only which policies are simultaneously enabled is client state.
export function usePolicyPreviews(stationName, policies) {
  return useQueries({
    queries: policies.map((p) => ({
      queryKey: ["simulate-preview", stationName, p.id],
      queryFn: ({ signal }) => postSimulate({ station: stationName, reductions: p.reductions, rain: p.rain }, signal),
      enabled: !!stationName,
      staleTime: STALE_TIME,
    })),
  });
}
