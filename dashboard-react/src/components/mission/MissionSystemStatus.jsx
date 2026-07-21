import { Wifi, Bell, CheckCircle2 } from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import { Skeleton } from "../ui/Skeleton";
import { timeAgo, freshnessTone } from "../../lib/validation";

function StatusRow({ label, value, tone }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-border-divider last:border-b-0">
      <span className="text-[13px] text-muted-2">{label}</span>
      {tone ? <Badge tone={tone}>{value}</Badge> : <span className="text-[13px] font-mono text-ink">{value}</span>}
    </div>
  );
}

/**
 * AQI/Weather/Forecast freshness + Notification Status + System Health —
 * reuses backend/pipeline.py::get_system_health (same data the AI
 * Validation page's SystemHealthTable shows across all 6 cities), filtered
 * to the currently selected city, plus useNotifications' already-fetched
 * unread count. No new backend call for this component.
 */
export default function MissionSystemStatus({ cityHealthRow, unread, isLoading }) {
  return (
    <Card padding="p-6" hover={false}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Wifi size={15} className="text-accent" strokeWidth={1.8} />
          <span className="font-mono text-[10.5px] tracking-[.08em] text-muted-3 uppercase">System status</span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-success font-medium">
          <CheckCircle2 size={12} strokeWidth={2} /> API responding
        </span>
      </div>

      {isLoading || !cityHealthRow ? (
        <div className="flex flex-col gap-2.5 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[18px] w-full" />
          ))}
        </div>
      ) : (
        <div className="mt-2">
          <StatusRow
            label="AQI data freshness"
            value={timeAgo(cityHealthRow.data_freshness_minutes)}
            tone={freshnessTone(cityHealthRow.data_freshness_minutes)}
          />
          <StatusRow
            label="Weather freshness"
            value={cityHealthRow.last_weather_sync ? "Synced" : "No data yet"}
            tone={cityHealthRow.last_weather_sync ? "success" : "muted"}
          />
          <StatusRow
            label="Forecast freshness"
            value={cityHealthRow.last_forecast_update ? "Computed live from AQI sync" : "No data yet"}
            tone={cityHealthRow.last_forecast_update ? "success" : "muted"}
          />
          <StatusRow
            label="Notification status"
            value={unread > 0 ? `${unread} unread` : "All read"}
            tone={unread > 0 ? "warning" : "success"}
          />
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-muted-3">
            <Bell size={11} /> Live-polled every 30s
          </div>
        </div>
      )}
    </Card>
  );
}
