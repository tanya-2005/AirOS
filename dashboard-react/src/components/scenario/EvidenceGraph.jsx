import { GitBranch } from "lucide-react";
import Card from "../ui/Card";
import SectionHeading from "../ui/SectionHeading";
import Timeline from "../ui/Timeline";
import { categoryFor } from "../../lib/aqi";
import { sourceMeta } from "../../lib/sources";

const STAGE_LABELS = [
  { key: "aqi", label: "AQI" },
  { key: "weather", label: "Weather" },
  { key: "wind", label: "Wind" },
  { key: "sources", label: "Nearby Sources" },
  { key: "forecast", label: "Forecast" },
  { key: "enforcement", label: "Enforcement" },
  { key: "decision", label: "Decision" },
  { key: "impact", label: "Impact" },
];

/**
 * "How the recommendation was produced," for the current scenario —
 * reuses the same real-data-walkthrough pattern as Command Center's
 * ExplainabilityTimeline (Milestone 4), ending in this page's own
 * Decision (which policies are enabled) and Impact (the live simulation
 * result) instead of an enforcement recommendation.
 */
export default function EvidenceGraph({ station, weather, forecast, enforcementItem, enabledPolicies, baselineAqi, predictedAqi, improvementPct }) {
  if (!station) return null;

  const top = station.attribution?.[0];
  const topMeta = top ? sourceMeta(top.source_type) : null;
  const downwindCount = station.evidence?.filter((e) => e.downwind === true).length ?? 0;

  const values = {
    aqi: `${Math.round(station.aqi)} AQI (${categoryFor(station.aqi).label}) at ${station.station}`,
    weather: weather
      ? `${weather.wind_speed ?? "—"} km/h wind, ${weather.humidity ?? "—"}% humidity, ${weather.temperature ?? "—"}°C`
      : "No live weather data for this station",
    wind:
      station.wind_aware == null
        ? "Not computed"
        : station.wind_aware
          ? `Wind-aware attribution active — ${downwindCount} nearby source(s) currently downwind`
          : "Distance-only attribution — no live wind data was available",
    sources: topMeta
      ? `${station.evidence?.length ?? 0} registry source(s) in range, dominated by ${topMeta.label.toLowerCase()} (${Math.round(top.confidence * 100)}%)`
      : "No registry source within the 3km attribution radius",
    forecast: forecast
      ? `${Math.round(forecast.forecast_24h.predicted_aqi)} AQI projected in 24h absent intervention (${Math.round(forecast.forecast_24h.confidence * 100)}% confidence)`
      : "No forecast available for this station",
    enforcement: enforcementItem
      ? `Priority score ${enforcementItem.priority_score} queued — ${enforcementItem.action.toLowerCase()}`
      : "No enforcement action currently queued for this station",
    decision:
      enabledPolicies.length > 0
        ? `${enabledPolicies.length} polic${enabledPolicies.length === 1 ? "y" : "ies"} enabled: ${enabledPolicies.map((p) => p.label).join(", ")}`
        : "No policy enabled — showing the do-nothing baseline",
    impact:
      predictedAqi != null && baselineAqi != null
        ? `${Math.round(baselineAqi)} → ${Math.round(predictedAqi)} AQI (${improvementPct ?? 0}% improvement) — live simulation_agent.py result`
        : "Enable a policy to compute impact",
  };

  const stages = STAGE_LABELS.map((s) => ({ ...s, value: values[s.key] }));

  return (
    <Card padding="p-7" hover={false}>
      <SectionHeading
        eyebrow="EVIDENCE GRAPH"
        title="How this recommendation was produced"
        description="Every stage below reads real pipeline output for the selected station — nothing here is a separate narrative."
        className="mb-6"
      />
      <Timeline stages={stages} />
      <div className="flex items-center gap-2 mt-1 pt-4 border-t border-border-divider text-[11.5px] text-muted-3">
        <GitBranch size={13} strokeWidth={1.8} />
        Decision and Impact reflect your current policy selection live — toggle a policy above and this updates.
      </div>
    </Card>
  );
}
