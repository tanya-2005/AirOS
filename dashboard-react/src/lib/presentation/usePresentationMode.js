import { useContext } from "react";
import { PresentationModeContext } from "./presentationContextObject";

export function usePresentationMode() {
  const ctx = useContext(PresentationModeContext);
  if (!ctx) throw new Error("usePresentationMode must be used within PresentationModeProvider");
  return ctx;
}
