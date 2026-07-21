import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import PageLoading from "../components/layout/PageLoading";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import Login from "../pages/Login";

// Route-level code splitting: CityMap alone pulls in maplibre-gl (~800kB),
// so it (and every other page) loads on demand instead of inflating every
// visitor's initial bundle regardless of which page they land on.
const CommandCenter = lazy(() => import("../pages/CommandCenter"));
const CityMap = lazy(() => import("../pages/CityMap"));
const CityComparison = lazy(() => import("../pages/CityComparison"));
const AIValidation = lazy(() => import("../pages/AIValidation"));
const Attribution = lazy(() => import("../pages/Attribution"));
const Forecast = lazy(() => import("../pages/Forecast"));
const ScenarioLab = lazy(() => import("../pages/ScenarioLab"));
const IntelligenceReport = lazy(() => import("../pages/IntelligenceReport"));
const IncidentDashboard = lazy(() => import("../pages/Incidents/IncidentDashboard"));
const IncidentDetail = lazy(() => import("../pages/Incidents/IncidentDetail"));
const OfficerWorkspace = lazy(() => import("../pages/Officer/OfficerWorkspace"));
const CitizenAdvisory = lazy(() => import("../pages/CitizenAdvisory"));
const MissionControl = lazy(() => import("../pages/MissionControl"));

function withSuspense(el) {
  return <Suspense fallback={<PageLoading />}>{el}</Suspense>;
}

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { path: "/", element: <Navigate to="/mission-control" replace /> },
      { path: "/mission-control", element: withSuspense(<MissionControl />) },
      { path: "/city-operations", element: withSuspense(<CommandCenter />) },
      { path: "/map", element: withSuspense(<CityMap />) },
      { path: "/advisory", element: withSuspense(<CitizenAdvisory />) },
      { path: "/compare", element: withSuspense(<CityComparison />) },
      { path: "/validation", element: withSuspense(<AIValidation />) },
      { path: "/attribution", element: withSuspense(<Attribution />) },
      { path: "/forecast", element: withSuspense(<Forecast />) },
      { path: "/report", element: withSuspense(<IntelligenceReport />) },
      { path: "/simulate", element: withSuspense(<ScenarioLab />) },
      { path: "/incidents", element: withSuspense(<IncidentDashboard />) },
      { path: "/incidents/:id", element: withSuspense(<IncidentDetail />) },
      { path: "/officer", element: withSuspense(<OfficerWorkspace />) },
    ],
  },
]);
