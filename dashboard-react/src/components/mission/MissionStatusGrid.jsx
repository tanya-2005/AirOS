import { Users, HeartPulse, Factory, Radar } from "lucide-react";
import Card from "../ui/Card";

function StatusCard({ icon, label, value, sub }) {
  return (
    <Card padding="p-5" hover={false} className="flex flex-col">
      <div className="flex items-center gap-2 text-muted-3">
        {icon}
        <span className="font-mono text-[10.5px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="font-display text-[21px] leading-tight mt-2.5 text-ink truncate">{value}</div>
      {sub && <div className="text-[11px] text-muted-3 mt-1 leading-snug truncate">{sub}</div>}
    </Card>
  );
}

/**
 * Officers Assigned / Citizens at Risk / Top Pollution Source / Forecast
 * Summary — the supporting layer beneath the hero KPIs (Current AQI
 * Status, Emergency Level, Highest Priority Incident, Recommended Action
 * already live in PageHero on pages/MissionControl.jsx, so they aren't
 * repeated here as equal-weight cards too). Every value is aggregated
 * from data the page's own hooks already fetched — no new calculation.
 */
export default function MissionStatusGrid({ officersAssignedCount, citizensAtRisk, citizensAtRiskNote, topSource, forecastSummary }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatusCard
        icon={<Users size={13} strokeWidth={1.8} />}
        label="Officers assigned"
        value={officersAssignedCount}
      />
      <StatusCard
        icon={<HeartPulse size={13} strokeWidth={1.8} />}
        label="Citizens at risk"
        value={citizensAtRisk != null ? citizensAtRisk.toLocaleString() : "None modeled"}
        sub={citizensAtRiskNote}
      />
      <StatusCard
        icon={<Factory size={13} strokeWidth={1.8} />}
        label="Top pollution source"
        value={topSource ? topSource.label : "None in range"}
      />
      <StatusCard
        icon={<Radar size={13} strokeWidth={1.8} />}
        label="Forecast summary"
        value={forecastSummary?.headline || "—"}
        sub={forecastSummary?.detail}
      />
    </div>
  );
}
