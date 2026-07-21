import { BrainCircuit, CheckCircle2, XCircle } from "lucide-react";
import Card from "../ui/Card";
import { attributionReasoningSummary, attributionDataInputs } from "../../lib/decision";

/**
 * Reasoning Summary + Data Inputs Used — the two AI Validation & Performance
 * fields AttributionBreakdown/EvidenceTable didn't already cover (dominant
 * source, contribution %, evidence, confidence were already shown
 * elsewhere on this page before this milestone). Explains HOW the
 * attribution decision was reached, in plain language, traceable to the
 * exact fields shown alongside it.
 */
export default function AttributionExplainability({ station, hasWeather, registryLoaded }) {
  if (!station) return null;
  const summary = attributionReasoningSummary(station);
  const inputs = attributionDataInputs(station, hasWeather, registryLoaded);

  return (
    <Card padding="p-7" hover={false}>
      <div className="flex items-center gap-2">
        <BrainCircuit size={16} className="text-accent" strokeWidth={1.8} />
        <span className="font-mono text-[10.5px] tracking-[.1em] text-muted-3 uppercase">
          How this attribution was reached
        </span>
      </div>
      <p className="text-[14px] text-ink leading-[1.65] mt-3.5">{summary}</p>

      <div className="mt-5 pt-4 border-t border-border-divider">
        <div className="font-mono text-[10px] tracking-[.08em] text-muted-3 uppercase mb-3">Data inputs used</div>
        <div className="grid grid-cols-2 gap-2.5">
          {inputs.map((input) => (
            <div key={input.label} className="flex items-center gap-2 text-[12.5px]">
              {input.available ? (
                <CheckCircle2 size={14} className="text-success shrink-0" strokeWidth={2} />
              ) : (
                <XCircle size={14} className="text-muted-4 shrink-0" strokeWidth={2} />
              )}
              <span className={input.available ? "text-ink" : "text-muted-3"}>{input.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
