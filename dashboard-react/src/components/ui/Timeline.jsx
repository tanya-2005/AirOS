import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "../../lib/motion";

/**
 * Generic numbered vertical stepper — extracted from Command Center's
 * ExplainabilityTimeline (Milestone 4) so Scenario Lab's Evidence Graph
 * (Milestone 5) can reuse the exact same visual instead of a second
 * hand-rolled copy. Callers own the stage list and its values; this
 * component only renders them.
 */
export default function Timeline({ stages }) {
  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer}>
      {stages.map((s, i) => (
        <motion.div key={s.key} variants={fadeUp} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-7 h-7 rounded-full bg-ink text-white flex items-center justify-center text-[11px] font-mono shrink-0">
              {i + 1}
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
