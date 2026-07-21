// Operational Continuity — the single ordered sequence AirOS's workflow
// pages are chained through: Guided Workflow's Previous/Next links,
// Presentation Mode's step-through, and the Live Operation Timeline's
// deep links all read from this ONE registry rather than each page
// hardcoding its neighbors. Every path here is an existing route
// (dashboard-react/src/app/router.jsx) — this file adds no new pages
// itself, just orders the ones that already exist (plus /advisory, the one
// new page this milestone adds specifically to give "Citizen Advisory" a
// concrete stop, itself composed entirely from existing health components).
import { Radar as MapIcon, LayoutDashboard, Radar, Microscope, ClipboardList, HardHat, HeartPulse, FlaskConical, FileText, ShieldCheck } from "lucide-react";

// Signal -> Forecast -> Attribution -> Incident -> Officer -> Citizen ->
// Simulation -> Report -> Validation — the exact evidence chain the SIH
// brief asks for (detect -> explain cause -> predict -> respond -> protect
// -> decide -> report -> trust), not just a list of pages in nav order.
// Attribution sits between Forecast and Incident because "why is this
// happening" is real evidence an officer opening a case needs, not an
// afterthought.
export const WORKFLOW_STEPS = [
  { id: "mission-control", label: "Command Centre", path: "/mission-control", Icon: LayoutDashboard },
  { id: "map", label: "Map", path: "/map", Icon: MapIcon },
  { id: "forecast", label: "Prediction Engine", path: "/forecast", Icon: Radar },
  { id: "attribution", label: "Attribution", path: "/attribution", Icon: Microscope },
  { id: "incident", label: "Response Coordination", path: "/incidents", Icon: ClipboardList },
  { id: "officer", label: "Officer Workflow", path: "/officer", Icon: HardHat },
  { id: "citizen-advisory", label: "Public Protection", path: "/advisory", Icon: HeartPulse },
  { id: "simulation", label: "Decision Support", path: "/simulate", Icon: FlaskConical },
  { id: "report", label: "Executive Briefing", path: "/report", Icon: FileText },
  { id: "validation", label: "Trust & Reliability", path: "/validation", Icon: ShieldCheck },
];

// The example action-verb labels the milestone spec gave for "Next Step"
// ("Forecast -> Create Incident", "Incident -> View Officer Assignment", ...)
// — shown instead of the plain step name where they exist, falling back to
// "Next: {label}" for any edge not called out explicitly.
export const NEXT_STEP_LABELS = {
  "mission-control": "Open the Map",
  map: "Check the Prediction Engine",
  forecast: "Investigate the Source",
  attribution: "Create Incident",
  incident: "View Officer Assignment",
  officer: "Issue Public Protection Advisory",
  "citizen-advisory": "Run Decision Support Simulation",
  simulation: "Generate Executive Briefing",
  report: "Review Trust & Reliability",
};

export function stepIndex(id) {
  return WORKFLOW_STEPS.findIndex((s) => s.id === id);
}

export function stepById(id) {
  return WORKFLOW_STEPS.find((s) => s.id === id) ?? null;
}

export function nextStep(id) {
  const i = stepIndex(id);
  return i >= 0 && i < WORKFLOW_STEPS.length - 1 ? WORKFLOW_STEPS[i + 1] : null;
}

export function previousStep(id) {
  const i = stepIndex(id);
  return i > 0 ? WORKFLOW_STEPS[i - 1] : null;
}
