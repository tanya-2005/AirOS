import { ShieldCheck, CheckCircle2 } from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import { RELIABILITY_TONE } from "../../lib/validation";

/**
 * The single combined "how much should an officer trust this city's AI
 * output right now" verdict — backend/pipeline.py::get_model_reliability,
 * itself a rule-based combination of the forecast backtest + attribution
 * evidence-completeness signals below it on this page, never a separate
 * opaque score.
 */
export default function ModelReliabilityPanel({ reliability }) {
  if (!reliability) return null;
  const { label, reasons } = reliability;

  return (
    <Card dark hover={false} padding="p-9">
      <div className="flex items-center gap-2.5">
        <ShieldCheck size={18} className="text-panel-accent" strokeWidth={1.6} />
        <span className="font-mono text-[11px] tracking-[.08em] text-panel-muted">MODEL RELIABILITY</span>
      </div>
      <div className="flex items-center gap-3.5 mt-4 flex-wrap">
        <h3 className="font-display text-[32px] leading-[1.1] text-white">{label}</h3>
        <Badge tone={RELIABILITY_TONE[label] || "muted"}>{label}</Badge>
      </div>
      <ul className="flex flex-col gap-2.5 mt-5">
        {reasons.map((r, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[14px] leading-[1.55] text-[#D8DADE]">
            <CheckCircle2 size={15} className="text-panel-accent shrink-0 mt-0.5" strokeWidth={1.8} />
            {r}
          </li>
        ))}
      </ul>
    </Card>
  );
}
