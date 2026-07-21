import { Link } from "react-router-dom";
import { AlertCircle, Target, ArrowRight, ShieldCheck } from "lucide-react";
import Card from "./Card";
import Badge from "./Badge";
import { RELIABILITY_TONE } from "../../lib/validation";

function Row({ n, icon, label, children }) {
  return (
    <div className="flex items-start gap-3.5 py-3 border-b border-border-divider last:border-b-0">
      <div className="w-6 h-6 rounded-full bg-search flex items-center justify-center shrink-0 mt-0.5 font-mono text-[10px] text-muted-3">
        {n}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-muted-3">
          {icon}
          <span className="font-mono text-[10px] tracking-[.08em] uppercase">{label}</span>
        </div>
        <div className="text-[14.5px] text-ink leading-[1.45] mt-1">{children}</div>
      </div>
    </div>
  );
}

/**
 * The single synthesized operational recommendation Command Centre leads
 * with — answers, in this fixed order, the four questions the platform
 * asks every screen to answer: What changed / Why it matters / What to do
 * now / Why trust it. Every value passed in is already computed by
 * pages/MissionControl.jsx from real attribution/forecast/incident/health/
 * reliability data (citySummary, topIncident, cityHealth, model
 * reliability) — this component only arranges it in decision order and
 * compresses it to one line per question instead of four separate cards a
 * reader has to mentally reassemble themselves. This is the "Google test"
 * answer: a single AQI number is a weather-app fact, this is an
 * operational recommendation nothing else combines.
 */
export default function DecisionBrief({ whatChanged, whyItMatters, whatToDo, whatToDoTo, trustLabel, trustReason, trustTo = "/validation" }) {
  if (!whatChanged) return null;

  return (
    <Card padding="p-0" hover={false} className="mt-7 overflow-hidden">
      <div className="px-6 pt-1">
        <Row n={1} icon={<AlertCircle size={12} strokeWidth={2} />} label="What changed">
          {whatChanged}
        </Row>
        <Row n={2} icon={<Target size={12} strokeWidth={2} />} label="Why it matters">
          {whyItMatters}
        </Row>
        <Row n={3} icon={<ArrowRight size={12} strokeWidth={2} />} label="What to do now">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span>{whatToDo}</span>
            {whatToDoTo && (
              <Link to={whatToDoTo} className="text-accent hover:underline text-[13px] font-medium shrink-0">
                Act on this →
              </Link>
            )}
          </div>
        </Row>
        <Row n={4} icon={<ShieldCheck size={12} strokeWidth={2} />} label="Why trust this">
          <div className="flex items-center gap-2 flex-wrap">
            {trustLabel && <Badge tone={RELIABILITY_TONE[trustLabel] || "muted"}>{trustLabel} reliability</Badge>}
            <span className="text-muted-1">{trustReason}</span>
            <Link to={trustTo} className="text-accent hover:underline text-[12.5px] shrink-0">
              See evidence →
            </Link>
          </div>
        </Row>
      </div>
    </Card>
  );
}
