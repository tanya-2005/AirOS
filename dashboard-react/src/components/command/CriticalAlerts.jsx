import { motion } from "framer-motion";
import { AlertOctagon, CheckCircle2 } from "lucide-react";
import Card from "../ui/Card";
import LinkButton from "../ui/LinkButton";
import SeverityBadge from "../incidents/SeverityBadge";
import { staggerContainer, fadeUp } from "../../lib/motion";
import { activeIncidents, criticalIncidents, recentlyResolved } from "../../lib/incidents";

/**
 * Phase 7 — incident-driven instead of the old ad hoc alert heuristic built
 * from stations+enforcement directly: an Incident (agents/incident_agent.py)
 * already IS the formalized, persisted version of what this used to
 * synthesize locally on every render, so this component just displays the
 * real incident list — Open / Critical / Recently Resolved — instead of
 * recomputing a second notion of "alert." Clicking through goes to the real
 * Incident Detail page instead of a same-page anchor.
 */
export default function CriticalAlerts({ incidents }) {
  const active = activeIncidents(incidents);
  const critical = criticalIncidents(incidents);
  const resolved = recentlyResolved(incidents, 3);

  if (active.length === 0) {
    return (
      <Card padding="p-5" hover={false} className="flex items-center gap-3 bg-success-bg border-success/25">
        <CheckCircle2 size={18} className="text-success shrink-0" strokeWidth={1.8} />
        <span className="text-[14px] text-success font-medium">
          No open incidents right now — every tracked station is below the operational AQI threshold and no
          high-priority enforcement flag is active.
        </span>
      </Card>
    );
  }

  const featured = (critical.length > 0 ? critical : active).slice(0, 4);

  return (
    <Card padding="p-0" hover={false} className="overflow-hidden border-danger/25">
      <div className="flex items-center justify-between gap-2 px-5 py-3.5 bg-danger-bg border-b border-danger/20 flex-wrap">
        <div className="flex items-center gap-2">
          <AlertOctagon size={16} className="text-danger" strokeWidth={1.8} />
          <span className="font-mono text-[11px] tracking-[.08em] text-danger uppercase">
            {critical.length > 0 ? `Critical incidents · ${critical.length}` : `Open incidents · ${active.length}`}
          </span>
        </div>
        <LinkButton to="/incidents" variant="ghost" size="sm">
          {active.length} open{resolved.length > 0 ? ` · ${resolved.length} recently resolved` : ""}
        </LinkButton>
      </div>
      <motion.div initial="hidden" animate="show" variants={staggerContainer}>
        {featured.map((incident, i) => (
          <motion.div
            key={incident.id}
            variants={fadeUp}
            className={`flex items-center gap-3 px-5 py-3.5 ${i !== featured.length - 1 ? "border-b border-border-divider" : ""}`}
          >
            <SeverityBadge level={incident.severity} className="shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-medium text-ink truncate">{incident.title}</div>
              <div className="text-[12px] text-muted-3 truncate">
                AQI {Math.round(incident.aqi)} · {incident.status}
              </div>
            </div>
            <LinkButton to={`/incidents/${encodeURIComponent(incident.id)}`} variant="ghost" size="sm" className="shrink-0">
              Investigate
            </LinkButton>
          </motion.div>
        ))}
      </motion.div>
    </Card>
  );
}
