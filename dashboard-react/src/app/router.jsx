import { createBrowserRouter } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import CommandCenter from "../pages/CommandCenter";
import CityMap from "../pages/CityMap";
import Attribution from "../pages/Attribution";
import Forecast from "../pages/Forecast";
import ScenarioLab from "../pages/ScenarioLab";
import IntelligenceReport from "../pages/IntelligenceReport";

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <CommandCenter /> },
      { path: "/map", element: <CityMap /> },
      { path: "/attribution", element: <Attribution /> },
      { path: "/forecast", element: <Forecast /> },
      { path: "/report", element: <IntelligenceReport /> },
      { path: "/simulate", element: <ScenarioLab /> },
    ],
  },
]);
