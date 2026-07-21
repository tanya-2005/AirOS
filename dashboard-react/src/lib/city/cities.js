// Mirrors backend/city_registry.py exactly — the id values here MUST match
// the lowercase city slugs the backend/ingestion scripts use (aqi_stations_<id>_*.json
// etc.). Kept as static local metadata (not fetched from /api/cities) so the
// city selector in Nav can render instantly with zero network round-trip;
// /api/cities exists for anything that wants to confirm the backend agrees.
export const CITIES = [
  { id: "delhi", label: "Delhi", state: "Delhi", lat: 28.6139, lon: 77.209 },
  { id: "mumbai", label: "Mumbai", state: "Maharashtra", lat: 19.076, lon: 72.8777 },
  { id: "bengaluru", label: "Bengaluru", state: "Karnataka", lat: 12.9716, lon: 77.5946 },
  { id: "chennai", label: "Chennai", state: "Tamil Nadu", lat: 13.0827, lon: 80.2707 },
  { id: "hyderabad", label: "Hyderabad", state: "Telangana", lat: 17.385, lon: 78.4867 },
  { id: "pune", label: "Pune", state: "Maharashtra", lat: 18.5204, lon: 73.8567 },
];

export const CITY_IDS = CITIES.map((c) => c.id);
export const DEFAULT_CITY = "delhi";

const _BY_ID = new Map(CITIES.map((c) => [c.id, c]));

export function cityMeta(id) {
  return _BY_ID.get(id) || _BY_ID.get(DEFAULT_CITY);
}

export function isValidCity(id) {
  return _BY_ID.has(id);
}
