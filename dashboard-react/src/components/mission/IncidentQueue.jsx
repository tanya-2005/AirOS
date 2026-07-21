import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ClipboardList, UserCheck, UserPlus, ArrowUpRight, CheckCircle2 } from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import LinkButton from "../ui/LinkButton";
import EmptyState from "../ui/EmptyState";
import SeverityBadge from "../incidents/SeverityBadge";
import { formatRelativeTime } from "../../lib/incidents";
import { staggerContainer, fadeUp } from "../../lib/motion";

function QueueRow({ incident, last }) {
  const sourceLabel = incident.dominant_source ? incident.dominant_source.replace(/_/g, " ") : "an unidentified source";
  const healthPart = incident.health?.emergency_level ? `, ${incident.health.emergency_level.toLowerCase()} health risk` : "";
  const why = `AQI ${Math.round(incident.aqi)} attributed to ${sourceLabel}${healthPart}.`;

  return (
    <motion.div variants={fadeUp} className={!last ? "border-b border-border-divider" : ""}>
      <Link
        to={`/incidents/${encodeURIComponent(incident.id)}`}
        className="flex items-start gap-4 px-5 py-4 hover:bg-search/60 transition-colors duration-150"
      >
        <SeverityBadge level={incident.severity} className="mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-medium text-ink truncate">{incident.station}</span>
            <span className="text-[12px] text-muted-3 font-mono">{formatRelativeTime(incident.created_at)}</span>
          </div>
          <div className="text-[12.5px] text-muted-2 mt-1 leading-[1.5]">
            <span className="text-muted-3">Why: </span>
            {why}
          </div>
          <div className="text-[12.5px] text-ink mt-1 leading-[1.5] truncate">{incident.recommended_action}</div>
        </div>
        <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
          <Badge tone={incident.assignment ? "success" : "warning"} mono={false} className="inline-flex items-center gap-1">
            {incident.assignment ? <UserCheck size={10} /> : <UserPlus size={10} />}
            {incident.assignment ? incident.assignment.officer_name : "Unassigned"}
          </Badge>
          <ArrowUpRight size={14} className="text-muted-4" />
        </div>
      </Link>
    </motion.div>
  );
}

/**
 * The operational work queue — every active incident ranked by priority
 * score (same ordering lib/incidents.js::activeIncidents already computes
 * for Response Coordination), condensed to one clickable row each: what
 * it is, why it was opened, what to do, who owns it. This replaces "a
 * dashboard you read" with "a queue you triage top to bottom" — nothing
 * here is a new calculation, every field already exists on the incident
 * record.
 */
export default function IncidentQueue({ incidents, limit = 5 }) {
  if (!incidents.length) {
    return (
      <EmptyState
        icon={<CheckCircle2 size={18} strokeWidth={1.8} />}
        tone="success"
        title="No incidents need attention right now"
        description="Every tracked station is within its operational threshold. New incidents open automatically the moment that changes."
      />
    );
  }

  const top = incidents.slice(0, limit);
  const remaining = incidents.length - top.length;

  return (
    <div>
      <Card padding="p-0" hover={false} className="overflow-hidden">
        <motion.div initial="hidden" animate="show" variants={staggerContainer}>
          {top.map((incident, i) => (
            <QueueRow key={incident.id} incident={incident} last={i === top.length - 1} />
          ))}
        </motion.div>
      </Card>
      <div className="flex items-center justify-between mt-4">
        <span className="text-[12.5px] text-muted-3 flex items-center gap-1.5">
          <ClipboardList size={13} /> {incidents.length} active incident{incidents.length === 1 ? "" : "s"} total
          {remaining > 0 ? `, ${remaining} more below the fold` : ""}
        </span>
        <LinkButton to="/incidents" variant="ghost" size="sm">
          Open full queue
        </LinkButton>
      </div>
    </div>
  );
}
