import { useCallback, useState } from "react";
import { CityContext } from "./cityContextObject";
import { CITIES, DEFAULT_CITY, isValidCity, cityMeta } from "./cities";

const STORAGE_KEY = "airos_city";

/**
 * Central, app-wide selected-city state — wraps RouterProvider in App.jsx,
 * same level as AuthProvider. Every data-fetching hook in lib/hooks/useApi.js
 * reads the current city from here via useCity() and includes it in both
 * the request and the react-query cache key, so changing the city here
 * automatically refetches every page's data without each page owning its
 * own city state — this IS the "centralized city state" the architecture
 * requires, there is no second copy of it anywhere.
 */
export function CityProvider({ children }) {
  const [city, setCityState] = useState(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    return stored && isValidCity(stored) ? stored : DEFAULT_CITY;
  });

  const setCity = useCallback((id) => {
    if (!isValidCity(id)) return;
    setCityState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const value = {
    city,
    setCity,
    cities: CITIES,
    cityMeta: cityMeta(city),
  };

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}
