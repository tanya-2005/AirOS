import { useContext } from "react";
import { CityContext } from "./cityContextObject";

export function useCity() {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error("useCity must be used within CityProvider");
  return ctx;
}
