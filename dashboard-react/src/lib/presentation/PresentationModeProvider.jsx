import { useCallback, useState } from "react";
import { PresentationModeContext } from "./presentationContextObject";

/**
 * Presentation Mode's own state — active/current-step only, deliberately no
 * navigation logic here. This provider sits above <RouterProvider> in
 * App.jsx (same level as CityProvider), so it has no Router context to call
 * useNavigate() from; the components that actually move between pages
 * (components/workflow/PresentationBar.jsx, pages/MissionControl.jsx) live
 * inside the Router and call useNavigate() themselves, then update this
 * shared state so Prev/Next/Exit stay in sync across the whole app.
 */
export function PresentationModeProvider({ children }) {
  const [active, setActive] = useState(false);
  const [currentStepId, setCurrentStepId] = useState(null);

  const exit = useCallback(() => {
    setActive(false);
    setCurrentStepId(null);
  }, []);

  const value = { active, currentStepId, setActive, setCurrentStepId, exit };

  return <PresentationModeContext.Provider value={value}>{children}</PresentationModeContext.Provider>;
}
