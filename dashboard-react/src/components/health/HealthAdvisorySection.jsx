import { HeartPulse } from "lucide-react";
import Card from "../ui/Card";
import SectionHeading from "../ui/SectionHeading";

/** Report page's Health Advisory section — Summary, Population Impact, Recommendations, Emergency Measures — mirrors ExecutiveSummary.jsx's dark-panel visual language exactly, same city-wide rollup Command Center's CitizenHealthPanel uses (backend/pipeline.py::get_city_health), so the two pages never disagree. */
export default function HealthAdvisorySection({ summary }) {
  if (!summary) return null;

  const emergencyMeasures =
    summary.emergency_level === "Severe" || summary.emergency_level === "Emergency"
      ? "Escalate to a formal public health response — issue city-wide advisories, apply GRAP-aligned restrictions, and prepare healthcare facilities for a rise in respiratory admissions."
      : summary.emergency_level === "High"
        ? "Issue a public advisory for sensitive groups; no city-wide emergency measures required yet."
        : "No emergency measures required at current levels.";

  return (
    <section className="mt-16 print:mt-8">
      <SectionHeading eyebrow="HEALTH ADVISORY" title="Citizen health impact" className="mb-6" />
      <Card dark hover={false} padding="p-9">
        <div className="flex items-center gap-2.5">
          <HeartPulse size={18} className="text-panel-accent" strokeWidth={1.6} />
          <span className="font-mono text-[11px] tracking-[.08em] text-panel-muted">CITY-WIDE HEALTH SUMMARY</span>
        </div>
        <p className="font-display text-[22px] md:text-[26px] leading-[1.35] mt-4 text-white max-w-[820px]">
          Overall public health risk is currently <span className="text-panel-accent">{summary.emergency_level}</span>,
          driven by <strong className="font-medium">{summary.worst_station}</strong> at{" "}
          {Math.round(summary.worst_station_aqi)} AQI. {summary.most_affected_group} face the highest risk right now.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-7">
          <div className="bg-panel-nested rounded-[12px] p-4">
            <div className="font-mono text-[10px] text-panel-muted uppercase tracking-wide">Population impact</div>
            <div className="text-[15px] text-white mt-1.5 leading-snug">Most affected: {summary.most_affected_group}</div>
          </div>
          <div className="bg-panel-nested rounded-[12px] p-4">
            <div className="font-mono text-[10px] text-panel-muted uppercase tracking-wide">Recommendations</div>
            <div className="text-[14px] text-white mt-1.5 leading-snug">{summary.top_recommendation}</div>
          </div>
          <div className="bg-panel-nested rounded-[12px] p-4">
            <div className="font-mono text-[10px] text-panel-muted uppercase tracking-wide">Emergency measures</div>
            <div className="text-[13px] text-[#D8DADE] mt-1.5 leading-snug">{emergencyMeasures}</div>
          </div>
        </div>
      </Card>
    </section>
  );
}
