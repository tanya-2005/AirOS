import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import PageLoading from "../components/layout/PageLoading";

// Route-level code splitting: CityMap alone pulls in maplibre-gl (~800kB),
// so it (and every other page) loads on demand instead of inflating every
// visitor's initial bundle regardless of which page they land on.
const CommandCenter = lazy(() => import("../pages/CommandCenter"));
const CityMap = lazy(() => import("../pages/CityMap"));
const Attribution = lazy(() => import("../pages/Attribution"));
const Forecast = lazy(() => import("../pages/Forecast"));
const ScenarioLab = lazy(() => import("../pages/ScenarioLab"));
const IntelligenceReport = lazy(() => import("../pages/IntelligenceReport"));

function withSuspense(el) {
  return <Suspense fallback={<PageLoading />}>{el}</Suspense>;
}

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: withSuspense(<CommandCenter />) },
      { path: "/map", element: withSuspense(<CityMap />) },
      { path: "/attribution", element: withSuspense(<Attribution />) },
      { path: "/forecast", element: withSuspense(<Forecast />) },
      { path: "/report", element: withSuspense(<IntelligenceReport />) },
      { path: "/simulate", element: withSuspense(<ScenarioLab />) },
    ],
  },
]);
