import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wind as WindIcon, Sparkles, ClipboardList, HeartPulse, TrendingUp, TrendingDown, Minus } from "lucide-react";
import Badge from "../ui/Badge";
import LinkButton from "../ui/LinkButton";
import CurrentWeatherPanel from "../forecast/CurrentWeatherPanel";
import SeverityBadge from "../incidents/SeverityBadge";
import IncidentStatusBadge from "../incidents/IncidentStatusBadge";
import EmergencyLevelBadge from "../health/EmergencyLevelBadge";
import { categoryFor } from "../../lib/aqi";
import { sourceMeta } from "../../lib/sources";
import { elevatedGroupLabels } from "../../lib/healthAdvisory";

function buildExplanation(station, weather) {
  const top = station.attribution?.[0];
  if (!top) {
    return "No registry sources fall within the 3km attribution radius for this station.";
  }
  const meta = sourceMeta(top.source_type);
  const evidenceCount = station.evidence?.length ?? 0;
  const windPart =
    weather?.wind_direction != null
      ? ` Current wind (${Math.round(weather.wind_speed ?? 0)} km/h from ${Math.round(weather.wind_direction)}°) is
 factored into which nearby sources count most right now — sources the wind is currently blowing from get weighted higher.`
      : " No live wind data is available for this station right now, so this is distance-only.";
  return `${Math.round(top.confidence * 100)}% of the explained signal is attributed to ${meta.label.toLowerCase()}, based on ${evidenceCount} nearby registry source${evidenceCount === 1 ? "" : "s"} within 3km.${windPart}`;
}

const EvidenceRow = memo(function EvidenceRow({ e, last }) {
  const meta = sourceMeta(e.source_type);
  const Icon = meta.Icon;
  return (
    <div className={`flex items-center gap-3 py-3 ${!last ? "border-b border-border-divider" : ""}`}>
      <div className="w-8 h-8 rounded-chip bg-search flex items-center justify-center shrink-0">
        <Icon size={14} strokeWidth={1.8} className="text-muted-2" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-ink truncate flex items-center gap-1.5">
          {meta.label}
          {e.downwind === true && <WindIcon size={11} className="text-accent shrink-0" strokeWidth={2} />}
        </div>
        <div className="text-[11.5px] text-muted-3 font-mono mt-0.5">{e.source_id} · {e.distance_km}km</div>
      </div>
      <div className="text-[12.5px] font-mono font-medium text-ink shrink-0">{e.contribution}</div>
    </div>
  );
});

/** Slide-in evidence panel opened by clicking a station marker — nearby sources, distances, contribution, weather, confidence, and a plain-language explanation (Milestone 3 Task 4). */
export default function StationEvidencePanel({ station, weather, forecast, incident, health, onClose }) {
  const elevatedGroups = health ? elevatedGroupLabels(health.advisories) : [];
  const topActions = health ? health.advisories[health.most_affected_group_key]?.recommended_actions.slice(0, 3) : [];

  return (
    <AnimatePresence>
      {station && (
        <motion.div
          initial={{ x: 360, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 360, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
          className="absolute top-0 right-0 h-full w-full sm:w-[360px] bg-white border-l border-border shadow-panel overflow-y-auto z-10"
        >
          <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-border-divider px-5 py-4 flex items-start justify-between gap-3 z-10">
            <div>
              <div className="font-mono text-[10px] tracking-[.1em] text-muted-3 uppercase">Evidence panel</div>
              <h3 className="font-display text-[19px] text-ink mt-1 leading-tight">{station.station}</h3>
            </div>
            <button
              onClick={onClose}
              aria-label="Close evidence panel"
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-search transition-colors duration-150 cursor-pointer shrink-0"
            >
              <X size={15} className="text-muted-2" />
            </button>
          </div>

          <div className="p-5 flex flex-col gap-5">
            {(() => {
              const cat = categoryFor(station.aqi);
              return (
                <div className="flex items-end gap-2.5">
                  <span className="font-display text-[38px] leading-none text-ink tabular-nums">{Math.round(station.aqi)}</span>
                  <span
                    className="text-[12px] font-medium px-2.5 py-1 rounded-[7px] mb-1"
                    style={{ background: cat.bg, color: cat.color }}
                  >
                    {cat.label}
                  </span>
                </div>
              );
            })()}

            {incident && (
              <div className="bg-danger-bg border border-danger/25 rounded-xl p-4 flex flex-col gap-2.5">
                <div className="flex items-center gap-2 text-danger">
                  <ClipboardList size={14} strokeWidth={1.8} />
                  <span className="font-mono text-[10.5px] tracking-[.08em] uppercase">Active incident</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <SeverityBadge level={incident.severity} />
                  <IncidentStatusBadge status={incident.status} />
                </div>
                <div>
                  <div className="font-mono text-[10px] tracking-[.06em] text-muted-3 uppercase">
                    {incident.assignment ? "Assigned officer" : "Assignment"}
                  </div>
                  <p className="text-[13px] text-ink mt-1 leading-[1.5]">
                    {incident.assignment ? incident.assignment.officer_name : "Not yet assigned"}
                  </p>
                </div>
                <div>
                  <div className="font-mono text-[10px] tracking-[.06em] text-muted-3 uppercase">
                    Recommended inspection
                  </div>
                  <p className="text-[13px] text-ink mt-1 leading-[1.5]">{incident.recommended_action}</p>
                </div>
                <LinkButton
                  to={`/incidents/${encodeURIComponent(incident.id)}`}
                  variant="primary"
                  size="sm"
                  className="w-fit"
                >
                  Open incident
                </LinkButton>
              </div>
            )}

            {health && (
              <div className="bg-search rounded-xl p-4 flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-ink">
                    <HeartPulse size={14} className="text-danger" strokeWidth={1.8} />
                    <span className="font-mono text-[10.5px] tracking-[.08em] uppercase">Health risk</span>
                  </div>
                  <EmergencyLevelBadge level={health.emergency_level} />
                </div>
                <div>
                  <div className="font-mono text-[10px] tracking-[.06em] text-muted-3 uppercase">
                    Affected population groups
                  </div>
                  <p className="text-[13px] text-ink mt-1 leading-[1.5]">
                    {elevatedGroups.length ? elevatedGroups.join(", ") : "No group currently at elevated risk beyond the general population."}
                  </p>
                </div>
                {topActions?.length > 0 && (
                  <div>
                    <div className="font-mono text-[10px] tracking-[.06em] text-muted-3 uppercase">
                      Recommended actions
                    </div>
                    <ul className="flex flex-col gap-1 mt-1">
                      {topActions.map((a, i) => (
                        <li key={i} className="text-[13px] text-ink flex items-start gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-accent mt-[7px] shrink-0" />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Sparkles size={14} className="text-accent" strokeWidth={1.8} />
                <div className="font-mono text-[10.5px] tracking-[.1em] text-muted-3 uppercase">
                  Attribution explanation
                </div>
              </div>
              <p className="text-[13.5px] text-ink leading-[1.6]">{buildExplanation(station, weather)}</p>
              {station.wind_aware != null && (
                <Badge tone={station.wind_aware ? "accent" : "muted"} className="mt-2.5">
                  {station.wind_aware ? "Wind-aware scoring" : "Distance-only (no live wind)"}
                </Badge>
              )}
            </div>

            {forecast?.forecast_24h && (
              <div className="bg-search rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-ink">
                    {forecast.forecast_24h.predicted_aqi > station.aqi + 2 ? (
                      <TrendingUp size={14} className="text-danger" strokeWidth={1.8} />
                    ) : forecast.forecast_24h.predicted_aqi < station.aqi - 2 ? (
                      <TrendingDown size={14} className="text-success" strokeWidth={1.8} />
                    ) : (
                      <Minus size={14} className="text-muted-3" strokeWidth={1.8} />
                    )}
                    <span className="font-mono text-[10.5px] tracking-[.08em] uppercase">24h forecast</span>
                  </div>
                  <span className="text-[15px] font-display text-ink tabular-nums">
                    {Math.round(forecast.forecast_24h.predicted_aqi)}
                  </span>
                </div>
                <p className="text-[12.5px] text-muted-2 leading-[1.5]">
                  {Math.round(forecast.forecast_24h.confidence * 100)}% model confidence
                  {forecast.forecast_72h ? ` · ${Math.round(forecast.forecast_72h.predicted_aqi)} AQI projected at 72h` : ""}.
                </p>
                <LinkButton
                  to={`/forecast?station=${encodeURIComponent(station.station)}`}
                  variant="ghost"
                  size="sm"
                  className="w-fit -ml-1"
                >
                  Open Prediction Engine
                </LinkButton>
              </div>
            )}

            <CurrentWeatherPanel weather={weather} isLoading={false} />

            <div>
              <div className="font-mono text-[10.5px] tracking-[.1em] text-muted-3 uppercase mb-1">
                Nearby pollution sources
              </div>
              {station.evidence?.length > 0 ? (
                <div>
                  {station.evidence.map((e, i) => (
                    <EvidenceRow key={e.source_id} e={e} last={i === station.evidence.length - 1} />
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-muted-3 py-2">No individual evidence points cleared the contribution threshold.</p>
              )}
            </div>

            <LinkButton
              to={`/attribution?station=${encodeURIComponent(station.station)}`}
              variant="ghost"
              size="sm"
              className="w-fit"
            >
              Open Attribution
            </LinkButton>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
