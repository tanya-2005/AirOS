import { Users, Megaphone, Landmark } from "lucide-react";
import Card from "../ui/Card";
import SectionHeading from "../ui/SectionHeading";
import EmergencyLevelBadge from "./EmergencyLevelBadge";

/** The 4 incident-level health fields (Affected Population, Recommended Public Advisory, Recommended Government Response, Health Impact Summary) — computed fresh by backend/pipeline.py::get_incident() and attached as `incident.health`, so this component needs no separate fetch. */
export default function IncidentHealthSummary({ health }) {
  if (!health) return null;

  return (
    <section>
      <SectionHeading eyebrow="HEALTH IMPACT" title="Citizen health advisory" className="mb-6" />
      <Card padding="p-7" hover={false} className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <p className="text-[14px] text-ink leading-[1.6] max-w-[560px]">{health.health_impact_summary}</p>
          <EmergencyLevelBadge level={health.emergency_level} className="shrink-0" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-border-divider">
          <div className="flex items-start gap-2.5">
            <Users size={14} className="text-accent shrink-0 mt-0.5" strokeWidth={1.8} />
            <div className="min-w-0">
              <div className="font-mono text-[10px] tracking-[.06em] text-muted-3 uppercase">
                Affected population (modeled)
              </div>
              <div className="text-[18px] font-display text-ink mt-0.5 tabular-nums">
                {health.affected_population.toLocaleString()}
              </div>
              <div className="text-[11px] text-muted-4 mt-1 leading-snug">{health.affected_population_note}</div>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Megaphone size={14} className="text-accent shrink-0 mt-0.5" strokeWidth={1.8} />
            <div className="min-w-0">
              <div className="font-mono text-[10px] tracking-[.06em] text-muted-3 uppercase">
                Recommended public advisory
              </div>
              <p className="text-[13px] text-ink mt-0.5 leading-[1.5]">{health.recommended_public_advisory}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 sm:col-span-2">
            <Landmark size={14} className="text-danger shrink-0 mt-0.5" strokeWidth={1.8} />
            <div className="min-w-0">
              <div className="font-mono text-[10px] tracking-[.06em] text-muted-3 uppercase">
                Recommended government response
              </div>
              <p className="text-[13px] text-ink mt-0.5 leading-[1.5]">{health.recommended_government_response}</p>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
