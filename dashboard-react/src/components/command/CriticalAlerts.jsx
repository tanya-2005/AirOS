import { motion } from "framer-motion";
import { AlertOctagon, CheckCircle2 } from "lucide-react";
import Card from "../ui/Card";
import RiskBadge from "../ui/RiskBadge";
import LinkButton from "../ui/LinkButton";
import { categoryFor } from "../../lib/aqi";
import { riskLevel } from "../../lib/decision";
import { staggerContainer, fadeUp } from "../../lib/motion";

/**
 * Real alerts only, filtered from live data — no separate "alerts" backend
 * resource, no invented severity: a station is critical because its
 * category is High/Critical risk (CPCB Poor/Very Poor/Severe), an
 * enforcement item is urgent because it's active AND lacks a valid permit
 * (mirrors enforcement_agent.py's own actionability signal).
 */
function buildAlerts(stations, enforcement) {
  const alerts = [];

  for (const s of stations) {
    const level = riskLevel(s.aqi);
    if (level === "Critical" || level === "High") {
      alerts.push({
        id: `station-${s.station}`,
        level,
        title: `${s.station} — ${Math.round(s.aqi)} AQI`,
        detail: `${categoryFor(s.aqi).label} category, immediate attention warranted`,
        link: `/attribution?station=${encodeURIComponent(s.station)}`,
      });
    }
  }

  const urgent = enforcement
    .filter((e) => e.evidence?.active && e.permit_status !== "valid")
    .slice(0, 2);
  for (const e of urgent) {
    alerts.push({
      id: `enforce-${e.source_id}-${e.station}`,
      level: "High",
      title: `${e.source_name} — ${e.permit_status}`,
      detail: `${e.action}, near ${e.station}`,
      link: `/attribution?station=${encodeURIComponent(e.station)}`,
    });
  }

  return alerts.slice(0, 4);
}

export default function CriticalAlerts({ stations, enforcement }) {
  const alerts = buildAlerts(stations, enforcement);

  if (alerts.length === 0) {
    return (
      <Card padding="p-5" hover={false} className="flex items-center gap-3 bg-success-bg border-success/25">
        <CheckCircle2 size={18} className="text-success shrink-0" strokeWidth={1.8} />
        <span className="text-[14px] text-success font-medium">
          No critical alerts right now — every tracked station is below High risk and no active source lacks a valid permit.
        </span>
      </Card>
    );
  }

  return (
    <Card padding="p-0" hover={false} className="overflow-hidden border-danger/25">
      <div className="flex items-center gap-2 px-5 py-3.5 bg-danger-bg border-b border-danger/20">
        <AlertOctagon size={16} className="text-danger" strokeWidth={1.8} />
        <span className="font-mono text-[11px] tracking-[.08em] text-danger uppercase">
          Critical alerts · {alerts.length}
        </span>
      </div>
      <motion.div initial="hidden" animate="show" variants={staggerContainer}>
        {alerts.map((a, i) => (
          <motion.div
            key={a.id}
            variants={fadeUp}
            className={`flex items-center gap-3 px-5 py-3.5 ${i !== alerts.length - 1 ? "border-b border-border-divider" : ""}`}
          >
            <RiskBadge level={a.level} className="shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-medium text-ink truncate">{a.title}</div>
              <div className="text-[12px] text-muted-3 truncate">{a.detail}</div>
            </div>
            <LinkButton to={a.link} variant="ghost" size="sm" className="shrink-0">
              View
            </LinkButton>
          </motion.div>
        ))}
      </motion.div>
    </Card>
  );
}
