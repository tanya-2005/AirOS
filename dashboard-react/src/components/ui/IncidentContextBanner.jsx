import { Link } from "react-router-dom";
import { ClipboardList, ArrowRight } from "lucide-react";
import SeverityBadge from "../incidents/SeverityBadge";
import IncidentStatusBadge from "../incidents/IncidentStatusBadge";

/**
 * The connective tissue that makes the Incident AirOS's one primary
 * object instead of each module (Prediction Engine, Attribution, Public
 * Protection) treating a station as its own island. Whenever the station
 * a page is looking at already has an open case, this says so and links
 * straight to it — reusing lib/incidents.js::activeIncidentForStation at
 * the call site, not a new incident lookup. Renders nothing when there's
 * no active incident for this station: silence is the honest state, not
 * a "no incident" placeholder.
 */
export default function IncidentContextBanner({ incident }) {
  if (!incident) return null;

  return (
    <Link
      to={`/incidents/${encodeURIComponent(incident.id)}`}
      className="group flex items-center gap-3 mt-6 px-5 py-3.5 rounded-card border border-danger/25 bg-danger-bg hover:border-danger/40 transition-colors duration-150"
    >
      <ClipboardList size={16} className="text-danger shrink-0" strokeWidth={1.8} />
      <div className="flex-1 min-w-0 flex items-center gap-2.5 flex-wrap">
        <span className="text-[13.5px] text-ink font-medium">Active case for this station</span>
        <SeverityBadge level={incident.severity} />
        <IncidentStatusBadge status={incident.status} />
        <span className="text-[12.5px] text-muted-2 truncate">
          {incident.assignment ? incident.assignment.officer_name : "Unassigned"}
        </span>
      </div>
      <span className="flex items-center gap-1 text-[13px] font-medium text-danger shrink-0">
        Open case <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
      </span>
    </Link>
  );
}
