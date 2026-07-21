import { MapPin } from "lucide-react";
import Card from "../ui/Card";
import SeverityBadge from "./SeverityBadge";
import PriorityBadge from "./PriorityBadge";
import IncidentStatusBadge from "./IncidentStatusBadge";
import { formatRelativeTime } from "../../lib/incidents";

function Field({ label, value }) {
  return (
    <div>
      <div className="font-mono text-[10px] tracking-[.08em] text-muted-3 uppercase">{label}</div>
      <div className="text-[15px] font-medium text-ink mt-1">{value}</div>
    </div>
  );
}

// Dominant source and AQI intentionally aren't repeated here — the
// DecisionBrief right below this card already states them, with more
// context (confidence, forecast direction) than a bare field could. This
// card is the case's identity summary: title, severity, status, priority
// queue position, exact coordinates, when it opened — everything an
// officer needs to confirm "is this the right case" before reading the
// decision brief underneath.
export default function IncidentOverview({ incident }) {
  return (
    <Card padding="p-7" hover={false}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-mono text-[10.5px] tracking-[.1em] text-muted-3 uppercase flex items-center gap-1.5">
            <MapPin size={11} /> {incident.city} · {incident.station}
          </div>
          <h2 className="font-display font-normal text-[24px] md:text-[28px] text-ink mt-1.5 leading-tight">
            {incident.title}
          </h2>
          <div className="font-mono text-[11px] text-muted-4 mt-2">{incident.id}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SeverityBadge level={incident.severity} />
          <IncidentStatusBadge status={incident.status} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5 mt-7 pt-6 border-t border-border-divider">
        <Field label="Priority" value={<PriorityBadge level={incident.priority} />} />
        <Field
          label="Coordinates"
          value={incident.lat != null ? `${incident.lat.toFixed(3)}, ${incident.lon.toFixed(3)}` : "—"}
        />
        <Field label="Created" value={formatRelativeTime(incident.created_at)} />
      </div>
    </Card>
  );
}
