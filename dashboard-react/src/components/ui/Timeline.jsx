import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "../../lib/motion";
import { cn } from "../../lib/utils/cn";

// Only used when a caller passes a per-stage `tone` (e.g. Case File's real
// event log) — callers that don't (ExplainabilityTimeline, Scenario Lab's
// Evidence Graph, both conceptual/sequential rather than typed events) keep
// the original plain numbered-circle look untouched.
const TONE_CIRCLE = {
  danger: "bg-danger-bg text-danger",
  warning: "bg-warning-bg text-warning",
  success: "bg-success-bg text-success",
  accent: "bg-accent-tint text-accent",
  muted: "bg-search text-muted-3",
};

/**
 * Generic vertical stepper — extracted from Command Center's
 * ExplainabilityTimeline (Milestone 4) so Scenario Lab's Evidence Graph
 * (Milestone 5) can reuse the exact same visual instead of a second
 * hand-rolled copy. Callers own the stage list and its values; this
 * component only renders them. Each stage may optionally carry `icon` +
 * `tone` to color-differentiate event types (Case File's real history log);
 * without them it falls back to the original numbered ink circle.
 */
export default function Timeline({ stages }) {
  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer}>
      {stages.map((s, i) => (
        <motion.div key={s.key} variants={fadeUp} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono shrink-0",
                s.icon ? TONE_CIRCLE[s.tone] || TONE_CIRCLE.muted : "bg-ink text-white"
              )}
            >
              {s.icon || i + 1}
            </div>
            {i < stages.length - 1 && <div className="w-px flex-1 bg-border-divider my-1" />}
          </div>
          <div className={i < stages.length - 1 ? "pb-6" : ""}>
            <div className="font-mono text-[10.5px] tracking-[.08em] text-muted-3 uppercase">{s.label}</div>
            <div className="text-[14px] text-ink mt-1 leading-snug">{s.value}</div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
