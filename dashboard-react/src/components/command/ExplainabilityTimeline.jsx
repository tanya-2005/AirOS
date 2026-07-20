import { Route } from "lucide-react";
import Card from "../ui/Card";
import SectionHeading from "../ui/SectionHeading";
import Timeline from "../ui/Timeline";
import { categoryFor } from "../../lib/aqi";
import { sourceMeta } from "../../lib/sources";

const STAGE_LABELS = [
  { key: "aqi", label: "Live AQI" },
  { key: "weather", label: "Weather" },
  { key: "sources", label: "Nearby Sources" },
  { key: "wind", label: "Wind Analysis" },
  { key: "attribution", label: "Attribution" },
  { key: "forecast", label: "Forecast" },
  { key: "enforcement", label: "Enforcement Priority" },
  { key: "recommendation", label: "Recommendation" },
];

/**
 * Turns the abstract "how the AI reached its recommendation" pipeline into
 * a concrete, real-data walkthrough for the selected station — every value
 * shown is read straight off the same attribution/forecast/enforcement
 * objects the rest of the page already renders, not a separate narrative.
 */
export default function ExplainabilityTimeline({ station, weather, forecast, enforcementItem }) {
  if (!station) return null;

  const top = station.attribution?.[0];
  const topMeta = top ? sourceMeta(top.source_type) : null;
  const downwindCount = station.evidence?.filter((e) => e.downwind === true).length ?? 0;

  const values = {
    aqi: `${Math.round(station.aqi)} AQI (${categoryFor(station.aqi).label})`,
    weather: weather
      ? `${weather.wind_speed ?? "—"} km/h wind, ${weather.humidity ?? "—"}% humidity, ${weather.temperature ?? "—"}°C`
      : "No live weather data for this station",
    sources: `${station.evidence?.length ?? 0} registry source(s) within the 3km attribution radius`,
    wind:
      station.wind_aware == null
        ? "Not computed"
        : station.wind_aware
          ? `Wind-aware scoring active — ${downwindCount} source(s) currently downwind, weighted higher`
          : "Distance-only scoring — no live wind data was available for this station",
    attribution: topMeta
      ? `${topMeta.label} — ${Math.round(top.confidence * 100)}% of the explained signal`
      : "No dominant source within range",
    forecast: forecast
      ? `${Math.round(forecast.forecast_24h.predicted_aqi)} AQI projected in 24h (${Math.round(forecast.forecast_24h.confidence * 100)}% confidence)`
      : "No forecast available for this station",
    enforcement: enforcementItem
      ? `Priority score ${enforcementItem.priority_score} — ${enforcementItem.permit_status} source`
      : "No enforcement action currently queued for this station",
    recommendation: enforcementItem ? enforcementItem.action : "No recommendation queued for this station",
  };

  const stages = STAGE_LABELS.map((s) => ({ ...s, value: values[s.key] }));

  return (
    <Card padding="p-7" hover={false}>
      <SectionHeading
        eyebrow="EXPLAINABILITY"
        title="How the AI reached this"
        description={`Live walkthrough for ${station.station}, stage by stage — every value below is read from the actual pipeline output.`}
        className="mb-6"
      />
      <Timeline stages={stages} />
      <div className="flex items-center gap-2 mt-1 pt-4 border-t border-border-divider text-[11.5px] text-muted-3">
        <Route size={13} strokeWidth={1.8} />
        Every stage reads real pipeline output — nothing on this timeline is generated text.
      </div>
    </Card>
  );
}
