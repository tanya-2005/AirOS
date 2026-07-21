import { Activity, CheckCircle2, Cloud, Radar, ClipboardList } from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import { timeAgo, freshnessTone } from "../../lib/validation";

function SourceDot({ ok, Icon, label }) {
  return (
    <span title={label} className={`flex items-center gap-1 ${ok ? "text-success" : "text-muted-4"}`}>
      <Icon size={13} strokeWidth={2} />
    </span>
  );
}

/**
 * Last AQI sync freshness + data-source completeness, one row per
 * supported city — backend/pipeline.py::get_system_health(). "Last AQI
 * Sync" and "Freshness" used to be two columns showing the exact same
 * timestamp twice (once as plain text, once as a badge); collapsed into
 * one. Weather/Forecast/Incident sync status collapsed from 3 text
 * columns into one compact icon row (hover for detail) — the exact
 * timestamps were rarely what anyone scanned this table for.
 */
export default function SystemHealthTable({ rows }) {
  if (!rows?.length) return null;

  return (
    <Card padding="p-0" hover={false} className="overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-divider bg-search/50">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-accent" strokeWidth={1.8} />
          <span className="font-mono text-[11px] tracking-[.08em] text-muted-2 uppercase">System health · all cities</span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[12px] text-success font-medium">
          <CheckCircle2 size={13} strokeWidth={2} /> API responding
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[520px]">
          <thead>
            <tr className="border-b border-border-divider bg-search/30">
              {["City", "AQI Freshness", "Data Sources"].map((h) => (
                <th key={h} className="px-5 py-3 text-[10.5px] font-mono uppercase tracking-wider text-muted-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.city} className="border-b border-border-divider last:border-b-0">
                <td className="px-5 py-3.5 text-[13.5px] font-medium text-ink">{r.label}</td>
                <td className="px-5 py-3.5">
                  <Badge tone={freshnessTone(r.data_freshness_minutes)}>{timeAgo(r.data_freshness_minutes)}</Badge>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <SourceDot ok={!!r.last_weather_sync} Icon={Cloud} label="Weather" />
                    <SourceDot ok={!!r.last_forecast_update} Icon={Radar} label="Forecast" />
                    <SourceDot ok={!!r.last_incident_sync} Icon={ClipboardList} label="Incidents" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
