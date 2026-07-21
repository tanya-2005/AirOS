import { ArrowLeft, ArrowRight } from "lucide-react";
import LinkButton from "../ui/LinkButton";
import { previousStep, nextStep, NEXT_STEP_LABELS } from "../../lib/workflow";

/**
 * Guided Workflow — every module in the operational chain exposes a
 * Previous Step / Next Step pair here, reading from the single
 * lib/workflow.js::WORKFLOW_STEPS registry so the sequence can't drift
 * between pages. `nextQuery`/`prevQuery` let a page hand off real current
 * context (e.g. Forecast -> Incident carries ?station=, Incident ->
 * Simulation carries ?incident=) instead of landing on a blank picker.
 */
export default function WorkflowNav({ currentStepId, nextQuery = "", prevQuery = "" }) {
  const prev = previousStep(currentStepId);
  const next = nextStep(currentStepId);
  if (!prev && !next) return null;

  return (
    <div className="flex items-center justify-between gap-4 mt-16 pt-8 border-t border-border-divider print:hidden">
      {prev ? (
        <LinkButton to={`${prev.path}${prevQuery}`} variant="ghost" size="md" icon={<ArrowLeft size={14} />}>
          {prev.label}
        </LinkButton>
      ) : (
        <span />
      )}
      {next ? (
        <LinkButton to={`${next.path}${nextQuery}`} variant="primary" size="md">
          {NEXT_STEP_LABELS[currentStepId] || `Next: ${next.label}`}
          <ArrowRight size={14} className="text-panel-accent" />
        </LinkButton>
      ) : (
        <span />
      )}
    </div>
  );
}
