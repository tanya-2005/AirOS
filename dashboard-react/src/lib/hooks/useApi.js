import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCity } from "../city/useCity";
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
  getIncidents,
  getIncident,
  patchIncident,
  getUsers,
  getTasks,
  patchTask,
  getNotifications,
  patchNotificationRead,
  postAssignIncident,
  postIncidentNote,
  getCityHealthAdvisory,
  getStationHealthAdvisory,
  getCities,
  getCityComparison,
  getForecastValidation,
  getAttributionReliability,
  getModelReliability,
  getSystemHealth,
  getValidationReport,
  getIncidentValidation,
} from "../api/endpoints";

// Thin react-query wrappers, one per resource, shared by every page that
// needs it (Command Center + Attribution both use attribution data, etc.)
// so the network request is de-duped and cached instead of re-fetched per page.
//
// Multi-City: every geographic hook calls useCity() to read the globally
// selected city and includes it in the queryKey — that's what makes
// switching cities correctly show a fresh loading state instead of a
// stale cached Delhi response: react-query treats ["attribution","mumbai"]
// and ["attribution","delhi"] as entirely separate cache entries, each
// with its own fetch/loading/error state, automatically.

const STALE_TIME = 60_000;

export function useAttribution() {
  const { city } = useCity();
  return useQuery({
    queryKey: ["attribution", city],
    queryFn: ({ signal }) => getAttribution(city, signal),
    staleTime: STALE_TIME,
  });
}

export function useForecast() {
  const { city } = useCity();
  return useQuery({
    queryKey: ["forecast", city],
    queryFn: ({ signal }) => getForecast(city, signal),
    staleTime: STALE_TIME,
  });
}

export function useEnforcement() {
  const { city } = useCity();
  return useQuery({
    queryKey: ["enforcement", city],
    queryFn: ({ signal }) => getEnforcement(city, signal),
    staleTime: STALE_TIME,
  });
}

export function useRegistry() {
  const { city } = useCity();
  return useQuery({
    queryKey: ["registry", city],
    queryFn: ({ signal }) => getRegistry(city, signal),
    staleTime: STALE_TIME,
  });
}

export function useSimulate() {
  const queryClient = useQueryClient();
  const { city } = useCity();
  return useMutation({
    mutationFn: (scenario) => postSimulate({ city, ...scenario }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enforcement", city] });
    },
  });
}

// Milestone 2 — weather + history. Shorter staleTime than the others:
// ingestion can run every 15 min (scheduler.py), so these are worth
// refetching a bit more eagerly than attribution/forecast/enforcement,
// which only change when a full agent run happens.
const HISTORY_STALE_TIME = 30_000;

export function useWeatherCurrent() {
  const { city } = useCity();
  return useQuery({
    queryKey: ["weather", "current", city],
    queryFn: ({ signal }) => getWeatherCurrent(city, signal),
    staleTime: HISTORY_STALE_TIME,
  });
}

export function useWeatherHistory(hours = 24) {
  const { city } = useCity();
  return useQuery({
    queryKey: ["weather", "history", city, hours],
    queryFn: ({ signal }) => getWeatherHistory(city, hours, signal),
    staleTime: HISTORY_STALE_TIME,
  });
}

export function useStationHistory(stationName, hours = 24) {
  const { city } = useCity();
  return useQuery({
    queryKey: ["history", "station", city, stationName, hours],
    queryFn: ({ signal }) => getStationHistory(stationName, city, hours, signal),
    enabled: !!stationName,
    staleTime: HISTORY_STALE_TIME,
  });
}

export function useCityHistory(hours = 24) {
  const { city } = useCity();
  return useQuery({
    queryKey: ["history", "city", city, hours],
    queryFn: ({ signal }) => getCityHistory(city, hours, signal),
    staleTime: HISTORY_STALE_TIME,
  });
}

// Milestone 3 — geospatial. Roads don't change between ingestion runs in
// any meaningful way, so a much longer staleTime than the live data above.
export function useRoads() {
  const { city } = useCity();
  return useQuery({
    queryKey: ["geo", "roads", city],
    queryFn: ({ signal }) => getRoads(city, signal),
    staleTime: 10 * 60_000,
  });
}

// Milestone 5 — one real /api/simulate preview per policy card, run in
// parallel via useQueries (the array of policies is fixed at module load,
// so this doesn't violate rules-of-hooks the way a loop of useQuery calls
// would). Each card's "AQI reduction" number is a live backend result, not
// an estimate — only which policies are simultaneously enabled is client state.
export function usePolicyPreviews(stationName, policies) {
  const { city } = useCity();
  return useQueries({
    queries: policies.map((p) => ({
      queryKey: ["simulate-preview", city, stationName, p.id],
      queryFn: ({ signal }) => postSimulate({ station: stationName, city, reductions: p.reductions, rain: p.rain }, signal),
      enabled: !!stationName,
      staleTime: STALE_TIME,
    })),
  });
}

// Phase 7 — incident management. Shorter staleTime than attribution/forecast/
// enforcement: incidents carry operator-driven state (status, timeline) that
// should feel responsive after a PATCH, not sit on a 60s cache.
const INCIDENT_STALE_TIME = 20_000;

export function useIncidents() {
  const { city } = useCity();
  return useQuery({
    queryKey: ["incidents", city],
    queryFn: ({ signal }) => getIncidents(city, signal),
    staleTime: INCIDENT_STALE_TIME,
  });
}

// Single-incident lookup is NOT city-scoped — ids are globally unique
// across cities (station names never collide between them) and the
// backend infers the incident's own city from its stored record (see
// backend/pipeline.py::get_incident), so this works regardless of which
// city is currently selected in Nav.
export function useIncident(incidentId) {
  return useQuery({
    queryKey: ["incidents", "detail", incidentId],
    queryFn: ({ signal }) => getIncident(incidentId, signal),
    enabled: !!incidentId,
    staleTime: INCIDENT_STALE_TIME,
  });
}

export function useUpdateIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ incidentId, ...payload }) => patchIncident(incidentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

// Phase 8 — auth roster, tasks, notifications, assignment. Not city-scoped
// — these are user/operator resources (a Pollution Control Officer's
// roster entry, a task assigned to them) rather than geographic ones, so
// they intentionally don't take `city` — same as their backend routes.

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: ({ signal }) => getUsers(signal),
    staleTime: 5 * 60_000, // the roster barely changes within a session
  });
}

export function useTasks(incidentId) {
  return useQuery({
    queryKey: ["tasks", incidentId ?? "all"],
    queryFn: ({ signal }) => getTasks(incidentId, signal),
    staleTime: INCIDENT_STALE_TIME,
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, ...payload }) => patchTask(taskId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["incidents"] }); // task completion logs onto the incident's timeline
    },
  });
}

const NOTIFICATION_POLL_MS = 30_000;

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: ({ signal }) => getNotifications(signal),
    staleTime: NOTIFICATION_POLL_MS,
    refetchInterval: NOTIFICATION_POLL_MS, // real polling — "due soon" notifications are time-derived and go stale on their own
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId) => patchNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useAssignIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ incidentId, ...payload }) => postAssignIncident(incidentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useAddIncidentNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ incidentId, text }) => postIncidentNote(incidentId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

// Phase 9 — Citizen Health Advisory. Same staleTime as incidents: derived
// from the same live attribution/forecast data, worth refetching about as
// often.
export function useCityHealthAdvisory() {
  const { city } = useCity();
  return useQuery({
    queryKey: ["health-advisory", "city", city],
    queryFn: ({ signal }) => getCityHealthAdvisory(city, signal),
    staleTime: INCIDENT_STALE_TIME,
  });
}

export function useStationHealthAdvisory(stationName) {
  const { city } = useCity();
  return useQuery({
    queryKey: ["health-advisory", "station", city, stationName],
    queryFn: ({ signal }) => getStationHealthAdvisory(stationName, city, signal),
    enabled: !!stationName,
    staleTime: INCIDENT_STALE_TIME,
  });
}

// Phase 10 — Multi-City. The city registry itself and the cross-city
// comparison rollup are inherently NOT scoped to the selected city — they
// span all 6 by definition.
export function useCities() {
  return useQuery({
    queryKey: ["cities"],
    queryFn: ({ signal }) => getCities(signal),
    staleTime: 60 * 60_000, // the supported-city list essentially never changes at runtime
  });
}

export function useCityComparison() {
  return useQuery({
    queryKey: ["cities", "compare"],
    queryFn: ({ signal }) => getCityComparison(signal),
    staleTime: INCIDENT_STALE_TIME,
  });
}

// Phase 11 — AI Validation & Performance. Forecast validation/attribution
// reliability/model reliability are city-scoped like every other pipeline
// output; system-health and the cross-city report span all cities by
// definition (same pattern as useCities/useCityComparison above). A longer
// staleTime than incidents/attribution: these are backtests over history
// that only meaningfully changes once a new ingestion snapshot lands
// (~15 min cadence), not worth refetching on every 20s poll.
const VALIDATION_STALE_TIME = 5 * 60_000;

export function useForecastValidation(station) {
  const { city } = useCity();
  return useQuery({
    queryKey: ["validation", "forecast", city, station ?? "all"],
    queryFn: ({ signal }) => getForecastValidation(city, station, signal),
    staleTime: VALIDATION_STALE_TIME,
  });
}

export function useAttributionReliability() {
  const { city } = useCity();
  return useQuery({
    queryKey: ["validation", "attribution", city],
    queryFn: ({ signal }) => getAttributionReliability(city, signal),
    staleTime: VALIDATION_STALE_TIME,
  });
}

export function useModelReliability() {
  const { city } = useCity();
  return useQuery({
    queryKey: ["validation", "reliability", city],
    queryFn: ({ signal }) => getModelReliability(city, signal),
    staleTime: VALIDATION_STALE_TIME,
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ["validation", "system-health"],
    queryFn: ({ signal }) => getSystemHealth(signal),
    staleTime: 60_000, // freshness numbers are worth refreshing more eagerly than the backtests above
    refetchInterval: 60_000,
  });
}

export function useValidationReport() {
  return useQuery({
    queryKey: ["validation", "report"],
    queryFn: ({ signal }) => getValidationReport(signal),
    staleTime: VALIDATION_STALE_TIME,
  });
}

export function useIncidentValidation(incidentId) {
  return useQuery({
    queryKey: ["validation", "incident", incidentId],
    queryFn: ({ signal }) => getIncidentValidation(incidentId, signal),
    enabled: !!incidentId,
    staleTime: VALIDATION_STALE_TIME,
  });
}
