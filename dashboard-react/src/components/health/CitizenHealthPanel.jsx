import { HeartPulse } from "lucide-react";
import Card from "../ui/Card";
import SectionHeading from "../ui/SectionHeading";
import EmergencyLevelBadge from "./EmergencyLevelBadge";

function Field({ label, value }) {
  return (
    <div>
      <div className="font-mono text-[10px] tracking-[.08em] text-muted-3 uppercase">{label}</div>
      <div className="text-[15px] font-medium text-ink mt-1 leading-snug">{value}</div>
    </div>
  );
}

/** Command Center's city-wide health summary — Current Risk / Most Affected Group / Top Recommendation / Emergency Level, all derived from the single worst-AQI station's advisory (see backend/pipeline.py::get_city_health), the same "worst station drives the headline" pattern citySummary() already uses. */
export default function CitizenHealthPanel({ summary }) {
  if (!summary) return null;

  return (
    <section>
      <SectionHeading eyebrow="CITIZEN HEALTH ADVISORY" title="Public health risk right now" className="mb-[18px]" />
      <Card padding="p-7" hover={false}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-chip bg-search flex items-center justify-center shrink-0">
              <HeartPulse size={16} className="text-danger" strokeWidth={1.8} />
            </div>
            <div className="font-mono text-[10.5px] tracking-[.08em] text-muted-3 uppercase truncate">
              Worst station: {summary.worst_station} ({Math.round(summary.worst_station_aqi)} AQI)
            </div>
          </div>
          <EmergencyLevelBadge level={summary.emergency_level} className="shrink-0" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mt-6 pt-6 border-t border-border-divider">
          <Field label="Current risk" value={summary.current_risk} />
          <Field label="Most affected group" value={summary.most_affected_group} />
          <Field label="Top recommendation" value={summary.top_recommendation} />
          <Field label="Emergency level" value={<EmergencyLevelBadge level={summary.emergency_level} />} />
        </div>
      </Card>
    </section>
  );
}
