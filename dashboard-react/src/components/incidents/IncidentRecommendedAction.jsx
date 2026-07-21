import { ShieldAlert } from "lucide-react";
import Card from "../ui/Card";
import SectionHeading from "../ui/SectionHeading";
import LinkButton from "../ui/LinkButton";

/** Reuses the incident's own recommended_action field (computed once in agents/incident_agent.py from enforcement_agent's ACTION_TEMPLATES) — the "Simulate impact" link hands off to Scenario Lab's existing ?incident= integration rather than recomputing anything here. `reason` is passed in from IncidentDetail's already-computed attribution fields (dominant source, confidence, evidence count) so this card doesn't hand an officer a bare instruction with nothing backing it. */
export default function IncidentRecommendedAction({ incident, reason }) {
  return (
    <section>
      <SectionHeading eyebrow="RECOMMENDED ACTIONS" title="Where to act" className="mb-6" />
      <Card padding="p-7" hover={false} className="flex items-start justify-between gap-5 flex-wrap">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-chip bg-search flex items-center justify-center shrink-0 mt-0.5">
            <ShieldAlert size={16} className="text-danger" strokeWidth={1.8} />
          </div>
          <div>
            <div className="font-mono text-[10.5px] tracking-[.08em] text-muted-3 uppercase">Recommended action</div>
            <p className="text-[15px] text-ink mt-1.5 max-w-[520px] leading-[1.5]">{incident.recommended_action}</p>
            {reason && (
              <p className="text-[12.5px] text-muted-2 mt-2 max-w-[520px] leading-[1.5]">
                <span className="text-muted-3">Why: </span>
                {reason}
              </p>
            )}
          </div>
        </div>
        <LinkButton to={`/simulate?incident=${encodeURIComponent(incident.id)}`} variant="primary" size="sm">
          Simulate impact
        </LinkButton>
      </Card>
    </section>
  );
}
