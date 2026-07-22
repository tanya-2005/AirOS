// Multilingual Citizen Communication — language registry. MUST match
// agents/translation_agent.py::SUPPORTED_LANGUAGES exactly, same "shared
// vocabulary duplicated on both sides" convention already used for
// EMERGENCY_LEVELS/GROUP_ORDER (lib/healthAdvisory.js) — mirrored here for
// zero-latency initial render rather than waiting on a network round trip
// before the language selector can even show its options; the backend's
// GET /api/health-advisory/languages is the source of truth either side
// can reconcile against if they ever drift.
//
// Adding a language later: one more entry here, one more entry in
// SUPPORTED_LANGUAGES on the backend. Nothing else in the translation
// pipeline (the cache, the prompt, the endpoint, this selector) assumes a
// fixed list length or specific languages.
export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "mr", label: "Marathi", nativeLabel: "मराठी" },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்" },
  { code: "bn", label: "Bengali", nativeLabel: "বাংলা" },
];

export const DEFAULT_LANGUAGE = "en";

const LANGUAGE_STORAGE_KEY = "airos_advisory_language";

export function languageMeta(code) {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code) || SUPPORTED_LANGUAGES[0];
}

/** Persisted across sessions — "remember the user's selected language" — same localStorage approach lib/api/client.js already uses for the auth token. */
export function getStoredLanguage() {
  return localStorage.getItem(LANGUAGE_STORAGE_KEY) || DEFAULT_LANGUAGE;
}

export function setStoredLanguage(code) {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
}
