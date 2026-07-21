import { AlertOctagon, HeartPulse, Landmark, UsersRound } from "lucide-react";
import Badge from "../ui/Badge";
import SeverityBadge from "../incidents/SeverityBadge";
import { USER_STATUS_TONE } from "../../lib/officers";

function BriefingBlock({ icon, title, children }) {
  return (
    <div className="bg-panel-nested rounded-[14px] p-5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="font-mono text-[10px] tracking-[.08em] text-panel-muted uppercase">{title}</span>
      </div>
      {children}
    </div>
  );
}

/**
 * Layers the four Executive Summary fields the pre-existing
 * components/report/ExecutiveSummary.jsx doesn't already cover (Major
 * Incidents, Public Health Status, Recommended Government Actions,
 * Resource Status) — Overall Air Quality + Forecast Outlook stay owned by
 * that existing component, rendered alongside this one on Mission Control
 * rather than reimplemented here.
 */
export default function MissionBriefingExtras({ majorIncidents, publicHealthStatus, governmentActions, resourceStatus }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      <BriefingBlock icon={<AlertOctagon size={14} className="text-panel-accent" strokeWidth={1.8} />} title="Major incidents">
        {majorIncidents.length ? (
          <ul className="flex flex-col gap-2.5">
            {majorIncidents.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 text-[13px] text-white">
                <span className="truncate">{i.station}</span>
                <SeverityBadge level={i.severity} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-panel-muted">No active incidents right now.</p>
        )}
      </BriefingBlock>

      <BriefingBlock icon={<HeartPulse size={14} className="text-panel-accent" strokeWidth={1.8} />} title="Public health status">
        <p className="text-[13px] text-[#D8DADE] leading-[1.55]">{publicHealthStatus}</p>
      </BriefingBlock>

      <BriefingBlock icon={<Landmark size={14} className="text-panel-accent" strokeWidth={1.8} />} title="Recommended government actions">
        <p className="text-[13px] text-[#D8DADE] leading-[1.55]">{governmentActions}</p>
      </BriefingBlock>

      <BriefingBlock icon={<UsersRound size={14} className="text-panel-accent" strokeWidth={1.8} />} title="Resource status">
        {resourceStatus.total > 0 ? (
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(resourceStatus.byStatus).map(([status, count]) => (
              <Badge key={status} tone={USER_STATUS_TONE[status] || "muted"}>
                {count} {status}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-panel-muted">No officer roster data available.</p>
        )}
        <p className="text-[12px] text-panel-muted mt-2.5">
          {resourceStatus.assigned} of {resourceStatus.total} officers currently carrying an active incident assignment.
        </p>
      </BriefingBlock>
    </div>
  );
}
