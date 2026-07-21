import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Presentation } from "lucide-react";
import { usePresentationMode } from "../../lib/presentation/usePresentationMode";
import { WORKFLOW_STEPS, stepIndex } from "../../lib/workflow";

/**
 * Floating control bar shown only while Presentation Mode is active —
 * rendered in AppShell (inside the Router, unlike PresentationModeProvider
 * itself) so it can call useNavigate(). Requires minimal navigation during
 * a live demo: one click steps through Mission Control -> Map -> Forecast
 * -> Incident -> Officer Workflow -> Citizen Advisory -> Simulation ->
 * Report -> AI Validation, per the milestone spec's exact sequence
 * (lib/workflow.js::WORKFLOW_STEPS).
 */
export default function PresentationBar() {
  const { active, currentStepId, setCurrentStepId, exit } = usePresentationMode();
  const navigate = useNavigate();
  const location = useLocation();

  // Keeps the bar's step indicator honest if the presenter clicks a normal
  // Nav link instead of Next/Previous mid-demo — the URL is the source of
  // truth, this just follows it rather than drifting out of sync.
  useEffect(() => {
    if (!active) return;
    const match = WORKFLOW_STEPS.find((s) => s.path === location.pathname);
    if (match && match.id !== currentStepId) setCurrentStepId(match.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, location.pathname]);

  if (!active) return null;

  const idx = stepIndex(currentStepId);
  const step = idx >= 0 ? WORKFLOW_STEPS[idx] : null;
  const prev = idx > 0 ? WORKFLOW_STEPS[idx - 1] : null;
  const next = idx >= 0 && idx < WORKFLOW_STEPS.length - 1 ? WORKFLOW_STEPS[idx + 1] : null;

  function go(target) {
    if (!target) return;
    setCurrentStepId(target.id);
    navigate(target.path);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] print:hidden"
      >
        <div className="flex items-center gap-1 bg-ink text-white rounded-full shadow-panel pl-2 pr-2.5 py-2 border border-white/10">
          <div className="flex items-center gap-2 pl-2 pr-3">
            <Presentation size={14} className="text-panel-accent" strokeWidth={2} />
            <span className="font-mono text-[10.5px] tracking-[.08em] text-panel-muted uppercase">
              {idx + 1} / {WORKFLOW_STEPS.length}
            </span>
            <span className="text-[13px] font-medium">{step?.label ?? "Presentation"}</span>
          </div>

          <button
            onClick={() => go(prev)}
            disabled={!prev}
            title={prev ? `Previous: ${prev.label}` : "Start of workflow"}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => go(next)}
            disabled={!next}
            title={next ? `Next: ${next.label}` : "End of workflow"}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={exit}
            title="Exit presentation mode"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors duration-150 cursor-pointer ml-0.5"
          >
            <X size={15} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
