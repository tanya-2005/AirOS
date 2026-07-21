// Phase 7 — Incident Management shared types/utilities.
//
// Everything here operates on the Incident shape returned by
// backend/routers/incidents.py (see agents/incident_agent.py for the exact
// fields) plus whatever live attribution/forecast/weather data the calling
// page already has. Nothing here calls the network or invents a number —
// it's the same "templated sentences over real fields" pattern already
// established by lib/decision.js and lib/report.js, applied to incidents.

import { categoryFor } from "./aqi";
import { sourceMeta } from "./sources";
import { RISK_TONE } from "./decision";

export const INCIDENT_STATUSES = ["Open", "Assigned", "In Progress", "Resolved"];
export const ACTIVE_STATUSES = new Set(["Open", "Assigned", "In Progress"]);

// Severity and priority both use the same Low/Medium/High/Critical
// vocabulary as riskLevel()/RiskBadge everywhere else in AirOS — reuse the
// same tone map rather than inventing a second one for incidents.
export const SEVERITY_TONE = RISK_TONE;
export const PRIORITY_TONE = RISK_TONE;

export const STATUS_TONE = {
  Open: "danger",
  Assigned: "accent",
  "In Progress": "warning",
  Resolved: "success",
};

// Every event name a timeline entry can actually carry (agents/incident_agent.py
// either appends one of these fixed lifecycle strings, or appends the status
// itself on a transition — reuse STATUS_TONE for those instead of a second
// map). Used to color-differentiate Case File's timeline instead of every
// event looking identical.
const TIMELINE_EVENT_TONE = {
  "Incident Created": "danger",
  "AI Investigation Generated": "accent",
  "Inspection Pending": "warning",
  "Forecast Updated": "accent",
  "Assigned to Officer": "success",
  "Task Completed": "success",
};

export function timelineEventTone(event) {
  return TIMELINE_EVENT_TONE[event] || STATUS_TONE[event] || "muted";
}

/** "5m ago" / "3h ago" / "2d ago" for incident cards; falls back to a plain date past a week. */
export function formatRelativeTime(iso) {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function isActiveIncident(incident) {
  return ACTIVE_STATUSES.has(incident.status);
}

/** Dashboard-level counts — Active / Critical / Recently Resolved / total. */
export function incidentStats(incidents) {
  const active = incidents.filter(isActiveIncident);
  const critical = active.filter((i) => i.severity === "Critical");
  const resolved = incidents.filter((i) => i.status === "Resolved");
  return {
    total: incidents.length,
    active: active.length,
    critical: critical.length,
    resolved: resolved.length,
  };
}

function resolvedAt(incident) {
  return incident.timeline.find((t) => t.event === "Resolved")?.at ?? incident.created_at;
}

export function recentlyResolved(incidents, limit = 5) {
  return incidents
    .filter((i) => i.status === "Resolved")
    .sort((a, b) => resolvedAt(b).localeCompare(resolvedAt(a)))
    .slice(0, limit);
}

export function activeIncidents(incidents) {
  return incidents.filter(isActiveIncident).sort((a, b) => b.priority_score - a.priority_score);
}

/** Average hours from an incident opening to its first officer assignment, across every incident that has one — a real "how fast do we react" metric computed from timeline/assignment fields already on the record, not a new backend calculation. Returns null if nothing's been assigned yet. */
export function averageResponseHours(incidents) {
  const withAssignment = incidents.filter((i) => i.assignment?.assigned_at);
  if (!withAssignment.length) return null;
  const totalHours = withAssignment.reduce((sum, i) => {
    const created = new Date(i.created_at).getTime();
    const assigned = new Date(i.assignment.assigned_at).getTime();
    return sum + Math.max(0, (assigned - created) / 3600000);
  }, 0);
  return Math.round((totalHours / withAssignment.length) * 10) / 10;
}

export function criticalIncidents(incidents) {
  return activeIncidents(incidents).filter((i) => i.severity === "Critical");
}

/** The one active (Open/Assigned/In Progress) incident for a station, if any — used by the Map and Simulation integrations. */
export function activeIncidentForStation(incidents, stationName) {
  return incidents.find((i) => i.station === stationName && isActiveIncident(i)) ?? null;
}

/** Prefers an active incident for the station; falls back to the most recently created resolved one — used by the Report page, where a closed case's resolution timeline is still worth showing. */
export function mostRelevantIncidentForStation(incidents, stationName) {
  const forStation = incidentsForStation(incidents, stationName);
  if (!forStation.length) return null;
  const active = forStation.find(isActiveIncident);
  if (active) return active;
  return [...forStation].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
}

/** Every incident that references a given station, active or resolved — used by the Report page. */
export function incidentsForStation(incidents, stationName) {
  return incidents.filter((i) => i.station === stationName);
}

/**
 * Builds the "AI Investigation" panel content for the Incident Detail page —
 * every section is a sentence templated directly from the incident record
 * plus the live attribution/forecast/weather objects the detail page already
 * fetched (via the existing hooks, no new backend call). This does NOT
 * duplicate the attribution/forecast math — it only narrates fields those
 * agents already computed, the same division of labor lib/decision.js's
 * recommendationRationale() and lib/report.js's stationNarrative() use.
 */
export function buildInvestigation(incident, station, forecast, weather) {
  const top = station?.attribution?.[0];
  const topMeta = top ? sourceMeta(top.source_type) : null;
  const evidenceCount = station?.evidence?.length ?? 0;
  const cat = categoryFor(incident.aqi);

  const why = topMeta
    ? `This incident was opened because AQI at ${incident.station} reached ${Math.round(incident.aqi)} (${cat.label}), with attribution scoring pointing to ${topMeta.label.toLowerCase()} as the dominant contributor at ${Math.round(top.confidence * 100)}% of the explained signal.`
    : `This incident was opened because AQI at ${incident.station} reached ${Math.round(incident.aqi)} (${cat.label}); no single registry source dominates the attributed signal.`;

  const evidence = evidenceCount
    ? `${evidenceCount} registry source${evidenceCount === 1 ? "" : "s"} fall within the 3km attribution radius, led by ${topMeta?.label.toLowerCase()} at ${station.evidence[0].distance_km}km.`
    : "No individual registry source cleared the contribution threshold for this station — attribution is inconclusive at the individual-source level.";

  const dominantSources = station?.attribution?.length
    ? station.attribution
        .slice(0, 3)
        .map((a) => `${sourceMeta(a.source_type).label} (${Math.round(a.confidence * 100)}%)`)
        .join(", ")
    : "No nearby registry sources within range.";

  const weatherContribution = weather
    ? `Wind ${weather.wind_speed ?? "—"} km/h from ${weather.wind_direction != null ? `${Math.round(weather.wind_direction)}°` : "an unknown direction"}, humidity ${weather.humidity ?? "—"}%. ${
        station?.wind_aware
          ? "Wind-aware attribution is active for this station — nearby sources currently downwind are weighted higher in the score above."
          : "No live wind data was available when attribution last ran, so scoring is distance-only."
      }`
    : "No live weather data is available for this station right now.";

  const forecastRisk = forecast
    ? `The 24h forecast projects ${Math.round(forecast.forecast_24h.predicted_aqi)} AQI at ${Math.round(forecast.forecast_24h.confidence * 100)}% confidence — ${
        forecast.forecast_24h.predicted_aqi > incident.aqi + 2
          ? "a further deterioration from"
          : forecast.forecast_24h.predicted_aqi < incident.aqi - 2
            ? "an improvement from"
            : "roughly steady versus"
      } the ${Math.round(incident.aqi)} AQI that triggered this incident.`
    : "No forecast is available for this station right now.";

  const confidence = top
    ? `${Math.round(top.confidence * 100)}% attribution confidence in the dominant source${
        forecast ? `, ${Math.round(forecast.forecast_24h.confidence * 100)}% forecast confidence at the 24h horizon` : ""
      }.`
    : "Attribution confidence unavailable — no dominant source identified within range.";

  const inspectionArea = topMeta
    ? `Prioritize inspection within 3km of ${incident.station}, focused on registered ${topMeta.label.toLowerCase()} sites — see Evidence below for the specific registry entries.`
    : `No specific registry source to target — recommend a general field survey around ${incident.station}.`;

  return { why, evidence, dominantSources, weatherContribution, forecastRisk, confidence, inspectionArea };
}

/**
 * Live Operation Timeline (Operational Continuity milestone) — "how AirOS
 * handled the latest pollution event," built entirely from one incident's
 * own real fields plus its actual timeline log (agents/incident_agent.py).
 * Steps with a real logged timestamp are marked "done"; steps that are
 * genuinely available to act on but not a discrete logged event (there's
 * no persisted record of "a simulation was run for this incident") are
 * marked "available" rather than fabricating a completion — same honesty
 * standard as the rest of this app's "no fake AI" rule. The last two steps
 * ("AQI improved" / "Incident closed") only appear once the incident is
 * actually Resolved, matching the milestone spec's own "(if applicable)".
 */
export function buildOperationTimeline(incident, station) {
  if (!incident) return [];
  const q = `?station=${encodeURIComponent(incident.station)}`;
  const timelineEvent = (eventName) => incident.timeline?.find((t) => t.event === eventName) ?? null;
  const resolved = timelineEvent("Resolved");
  const topMeta = station?.attribution?.[0] ? sourceMeta(station.attribution[0].source_type) : null;

  const steps = [
    {
      key: "aqi",
      label: "AQI increased",
      status: "done",
      detail: `${incident.station} reached ${Math.round(incident.aqi)} AQI.`,
      at: incident.created_at,
      linkTo: `/map${q}`,
    },
    {
      key: "forecast",
      label: "Forecast predicted deterioration",
      status: incident.forecast_aqi != null && incident.forecast_aqi > incident.aqi ? "done" : "available",
      detail:
        incident.forecast_aqi != null
          ? `24h forecast made at creation: ${Math.round(incident.forecast_aqi)} AQI.`
          : "No forecast was available at creation time.",
      at: incident.created_at,
      linkTo: `/forecast${q}`,
    },
    {
      key: "attribution",
      label: "Attribution identified dominant source",
      status: incident.dominant_source ? "done" : "available",
      detail: topMeta ? `${topMeta.label} identified as the dominant contributor.` : "No single dominant source identified.",
      at: incident.created_at,
      linkTo: `/attribution${q}`,
    },
    {
      key: "incident",
      label: "Incident automatically created",
      status: "done",
      detail: `${incident.id} opened, severity ${incident.severity}.`,
      at: incident.created_at,
      linkTo: `/incidents/${encodeURIComponent(incident.id)}`,
    },
    {
      key: "officer",
      label: "Officer assigned",
      status: incident.assignment ? "done" : "available",
      detail: incident.assignment ? `${incident.assignment.officer_name} assigned.` : "Not yet assigned to an officer.",
      at: incident.assignment?.assigned_at ?? null,
      linkTo: incident.assignment ? "/officer" : `/incidents/${encodeURIComponent(incident.id)}`,
    },
    {
      key: "advisory",
      label: "Citizen advisory issued",
      status: incident.health ? "done" : "available",
      detail: incident.health
        ? `${incident.health.emergency_level} health risk advisory for ${incident.health.most_affected_group}.`
        : "Advisory available once health data loads.",
      at: null,
      linkTo: `/advisory${q}`,
    },
    {
      key: "simulation",
      label: "Simulation recommended intervention",
      status: "available",
      detail: incident.recommended_action || "Run a simulation to model an intervention.",
      at: null,
      linkTo: `/simulate?incident=${encodeURIComponent(incident.id)}`,
    },
  ];

  if (incident.status === "Resolved") {
    steps.push({
      key: "improved",
      label: "AQI improved",
      status: "done",
      detail: incident.resolution_notes || "Conditions improved and the incident was resolved.",
      at: resolved?.at ?? null,
      linkTo: `/incidents/${encodeURIComponent(incident.id)}`,
    });
    steps.push({
      key: "closed",
      label: "Incident closed",
      status: "done",
      detail: `Resolved${resolved?.at ? ` ${formatRelativeTime(resolved.at)}` : ""}.`,
      at: resolved?.at ?? null,
      linkTo: `/incidents/${encodeURIComponent(incident.id)}`,
    });
  }

  return steps;
}
