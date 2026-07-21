import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wind, Shield, AlertTriangle, Clock, Info, ChevronDown } from "lucide-react";
import Card from "../ui/Card";
import EmergencyLevelBadge from "./EmergencyLevelBadge";
import { groupMeta } from "../../lib/healthAdvisory";

/** One group's full advisory — all 7 required fields (risk level, recommended actions, outdoor activity guidance, mask recommendation, emergency recommendation, expected duration, reason) are present; actions/emergency/duration/reason sit behind a "details" expand so a 10-card grid stays scannable, mirroring PolicyCard's trade-offs pattern (Scenario Lab). */
export default function GroupAdvisoryCard({ groupKey, advisory }) {
  const [expanded, setExpanded] = useState(false);
  if (!advisory) return null;
  const meta = groupMeta(groupKey);
  const Icon = meta.Icon;

  return (
    <Card padding="p-5" className="flex flex-col gap-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-chip bg-search flex items-center justify-center shrink-0">
            <Icon size={16} className="text-ink" strokeWidth={1.8} />
          </div>
          <div className="font-display text-[15.5px] text-ink leading-tight truncate">{advisory.group_label}</div>
        </div>
        <EmergencyLevelBadge level={advisory.risk_level} className="shrink-0" />
      </div>

      <div className="flex flex-col gap-2.5 text-[12.5px]">
        <div className="flex items-start gap-2">
          <Wind size={13} className="text-accent shrink-0 mt-0.5" strokeWidth={1.8} />
          <span className="text-ink">{advisory.outdoor_activity_guidance}</span>
        </div>
        <div className="flex items-start gap-2">
          <Shield size={13} className="text-accent shrink-0 mt-0.5" strokeWidth={1.8} />
          <span className="text-ink">{advisory.mask_recommendation}</span>
        </div>
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex items-center gap-1.5 text-[11.5px] text-accent hover:underline cursor-pointer w-fit"
      >
        <Info size={11} />
        {expanded ? "Hide details" : "Actions, emergency guidance & reason"}
        <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={12} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 pt-3.5 border-t border-border-divider text-[12.5px]">
              <div>
                <div className="font-mono text-[9.5px] uppercase tracking-wide text-muted-3 mb-1.5">
                  Recommended actions
                </div>
                <ul className="flex flex-col gap-1.5">
                  {advisory.recommended_actions.map((a, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-ink">
                      <span className="w-1 h-1 rounded-full bg-accent mt-[6px] shrink-0" />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle size={13} className="text-danger shrink-0 mt-0.5" strokeWidth={1.8} />
                <span className="text-ink">{advisory.emergency_recommendation}</span>
              </div>
              <div className="flex items-start gap-2">
                <Clock size={13} className="text-muted-3 shrink-0 mt-0.5" strokeWidth={1.8} />
                <span className="text-muted-2">{advisory.expected_duration}</span>
              </div>
              <div className="text-[11.5px] text-muted-3 italic leading-[1.5]">{advisory.reason}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
