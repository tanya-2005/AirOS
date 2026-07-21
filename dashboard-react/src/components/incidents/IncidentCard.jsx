import { memo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Clock } from "lucide-react";
import Card from "../ui/Card";
import SeverityBadge from "./SeverityBadge";
import PriorityBadge from "./PriorityBadge";
import IncidentStatusBadge from "./IncidentStatusBadge";
import { sourceMeta } from "../../lib/sources";
import { formatRelativeTime } from "../../lib/incidents";

const MotionLink = motion(Link);

/** Dashboard grid card — everything the spec's "each incident card should show" list asks for, clicking anywhere opens the Incident Detail page. */
function IncidentCard({ incident }) {
  const meta = incident.dominant_source ? sourceMeta(incident.dominant_source) : null;
  const Icon = meta?.Icon;

  return (
    <Card
      as={MotionLink}
      to={`/incidents/${encodeURIComponent(incident.id)}`}
      padding="p-5"
      className="flex flex-col gap-3.5"
    >
      <div className="flex items-start justify-between gap-2">
        <SeverityBadge level={incident.severity} />
        <IncidentStatusBadge status={incident.status} />
      </div>

      <div>
        <div className="font-mono text-[10.5px] tracking-[.08em] text-muted-3 uppercase flex items-center gap-1.5">
          <MapPin size={11} className="shrink-0" /> <span className="truncate">{incident.station}</span>
        </div>
        <h3 className="font-display text-[18px] text-ink mt-1 leading-snug">{incident.title}</h3>
      </div>

      <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-border-divider">
        <div>
          <div className="font-mono text-[9.5px] uppercase tracking-wide text-muted-3">AQI now</div>
          <div className="text-[18px] font-display text-ink mt-0.5 tabular-nums">{Math.round(incident.aqi)}</div>
        </div>
        <div>
          <div className="font-mono text-[9.5px] uppercase tracking-wide text-muted-3">Forecast 24h</div>
          <div className="text-[18px] font-display text-ink mt-0.5 tabular-nums">
            {incident.forecast_aqi != null ? Math.round(incident.forecast_aqi) : "—"}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 text-[12.5px]">
        <div className="flex items-center gap-1.5 text-muted-2 min-w-0">
          {Icon && <Icon size={13} className="text-muted-3 shrink-0" strokeWidth={1.8} />}
          <span className="truncate">{meta ? meta.label : "No dominant source"}</span>
        </div>
        <PriorityBadge level={incident.priority} />
      </div>

      <div className="flex items-center gap-1.5 text-[11.5px] text-muted-4 font-mono">
        <Clock size={11} /> {formatRelativeTime(incident.created_at)}
      </div>
    </Card>
  );
}

export default memo(IncidentCard);
