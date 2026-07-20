import { motion } from "framer-motion";
import { cn } from "../../lib/utils/cn";

const BAR_TONE = {
  accent: "bg-accent",
  warning: "bg-warning",
  danger: "bg-danger",
  hazard: "bg-hazard",
  success: "bg-success",
  muted: "bg-muted-4",
};

/**
 * Labeled percentage bar with an animated fill — used for attribution
 * confidence (Command Center, Attribution page) and reused wherever a
 * 0-1 share needs an honest visual weight instead of just a number.
 */
export default function ConfidenceBar({ label, value, tone = "accent", sublabel, className }) {
  const pct = Math.round((value ?? 0) * 100);
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between gap-3 text-[13px]">
        <span className="text-ink font-medium truncate">{label}</span>
        <span className="font-mono text-muted-2 shrink-0">
          {pct}%{sublabel ? ` · ${sublabel}` : ""}
        </span>
      </div>
      <div className="h-[6px] rounded-full bg-search overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", BAR_TONE[tone] || BAR_TONE.accent)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
