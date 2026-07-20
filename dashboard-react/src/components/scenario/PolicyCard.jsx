import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, Info } from "lucide-react";
import Badge from "../ui/Badge";
import { Skeleton } from "../ui/Skeleton";
import { DIFFICULTY_TONE } from "../../lib/decision";
import { cn } from "../../lib/utils/cn";

/**
 * Replaces the old continuous lever sliders — a named, toggleable policy
 * with real backend-computed AQI reduction (its own solo /api/simulate
 * preview), registry-derived difficulty, and hand-authored execution-time/
 * trade-off metadata (disclosed as such — see lib/policies.js). `onToggle`
 * is the page's stable setter, called with policy.id here rather than
 * pre-bound per card, so React.memo below can actually skip re-rendering
 * cards whose own props didn't change.
 */
function PolicyCard({ policy, enabled, onToggle, previewReduction, isPreviewLoading, difficulty }) {
  const Icon = policy.Icon;
  const [showTradeoffs, setShowTradeoffs] = useState(false);
  const handleToggle = () => onToggle(policy.id);

  return (
    <motion.div
      onClick={handleToggle}
      role="button"
      tabIndex={0}
      aria-pressed={enabled}
      onKeyDown={(e) => e.key === "Enter" && handleToggle()}
      whileHover={{ y: -2 }}
      whileTap={{ y: 0 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "text-left p-5 rounded-card border cursor-pointer transition-colors duration-200",
        enabled ? "border-ink bg-ink" : "border-border bg-white hover:border-border-hover"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={cn("w-9 h-9 rounded-chip flex items-center justify-center shrink-0", enabled ? "bg-white/15" : "bg-search")}>
          <Icon size={17} strokeWidth={1.8} className={enabled ? "text-panel-accent" : "text-muted-2"} />
        </div>
        <span
          className={cn(
            "w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center shrink-0 transition-colors duration-150",
            enabled ? "bg-panel-accent border-panel-accent" : "border-border-hover bg-white"
          )}
        >
          {enabled && <Check size={12} className="text-ink" strokeWidth={3} />}
        </span>
      </div>

      <div className={cn("font-display text-[17px] mt-3.5 leading-tight", enabled ? "text-white" : "text-ink")}>
        {policy.label}
      </div>
      <div className={cn("text-[12.5px] mt-1.5 leading-snug", enabled ? "text-[#B8BEC1]" : "text-muted-2")}>
        {policy.description}
      </div>

      <div className={cn("grid grid-cols-2 gap-2.5 mt-4 pt-3.5 border-t", enabled ? "border-white/15" : "border-border-divider")}>
        <div>
          <div className={cn("font-mono text-[9.5px] uppercase tracking-wide", enabled ? "text-[#8A959A]" : "text-muted-3")}>
            AQI reduction
          </div>
          <div className={cn("text-[16px] font-medium mt-0.5 tabular-nums", enabled ? "text-panel-accent" : "text-ink")}>
            {isPreviewLoading ? (
              <Skeleton className={cn("h-4 w-10", enabled && "bg-panel-nested")} />
            ) : previewReduction != null ? (
              `−${previewReduction}`
            ) : (
              "—"
            )}
          </div>
        </div>
        <div>
          <div className={cn("font-mono text-[9.5px] uppercase tracking-wide", enabled ? "text-[#8A959A]" : "text-muted-3")}>
            Difficulty
          </div>
          <Badge tone={enabled ? "muted" : DIFFICULTY_TONE[difficulty] || "muted"} className="mt-1">
            {difficulty}
          </Badge>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className={cn("flex items-start gap-1.5 text-[11px]", enabled ? "text-[#8A959A]" : "text-muted-4")}>
          <Clock size={11} className="mt-[1.5px] shrink-0" />
          {policy.executionTime}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowTradeoffs((v) => !v);
          }}
          className={cn(
            "flex items-center gap-1 text-[11px] cursor-pointer shrink-0 hover:underline",
            enabled ? "text-panel-accent" : "text-accent"
          )}
        >
          <Info size={11} /> Trade-offs
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showTradeoffs && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className={cn("text-[11.5px] leading-[1.5] mt-3 pt-3 border-t", enabled ? "text-[#B8BEC1] border-white/15" : "text-muted-2 border-border-divider")}>
              {policy.tradeoffs}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default memo(PolicyCard);
