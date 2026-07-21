import { memo, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ChevronDown, MapPin, AlertTriangle, Info } from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import LinkButton from "../ui/LinkButton";
import { sourceMeta, PERMIT_TONE } from "../../lib/sources";
import {
  difficultyFromPermit,
  DIFFICULTY_TONE,
  recommendationRationale,
  alternativeInterpretation,
  KNOWN_LIMITATIONS,
} from "../../lib/decision";
import { staggerContainer, fadeUp } from "../../lib/motion";
import { cn } from "../../lib/utils/cn";

const DecisionRow = memo(function DecisionRow({ item, id, expanded, onToggle, last }) {
  const meta = sourceMeta(item.source_type);
  const Icon = meta.Icon;
  const difficulty = difficultyFromPermit(item.permit_status);
  const confidencePct = Math.round((item.attribution_confidence ?? 0) * 100);
  const alternative = alternativeInterpretation(item);

  return (
    <motion.div variants={fadeUp} className={cn(!last && "border-b border-border-divider")}>
      <button
        onClick={() => onToggle(id)}
        aria-expanded={expanded}
        className="w-full flex items-start gap-4 px-5 py-4 text-left cursor-pointer hover:bg-search/60 transition-colors duration-150"
      >
        <div className="w-9 h-9 rounded-chip bg-search flex items-center justify-center shrink-0 mt-0.5">
          <Icon size={16} strokeWidth={1.8} className="text-muted-2" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-medium text-ink">{item.source_name}</span>
            <Badge tone={PERMIT_TONE[item.permit_status] || "muted"}>{item.permit_status}</Badge>
            <Badge tone={DIFFICULTY_TONE[difficulty]}>{difficulty} difficulty</Badge>
          </div>
          <div className="text-[12.5px] text-muted-2 mt-1">{item.action}</div>
          <div className="text-[11.5px] text-muted-4 mt-1 font-mono flex items-center gap-1">
            <MapPin size={10} /> {item.station} · {item.distance_km}km · {confidencePct}% confidence
          </div>
        </div>
        <div className="text-right shrink-0 flex items-center gap-2">
          <div>
            <div className="text-[14px] font-medium text-success font-mono">−{item.expected_aqi_improvement_pct}%</div>
            <div className="text-[10.5px] text-muted-4 mt-0.5">est. AQI improvement</div>
          </div>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={16} className="text-muted-3" />
          </motion.div>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pl-[54px]">
              <div className="bg-search rounded-xl p-4">
                <div className="font-mono text-[10px] tracking-[.08em] text-muted-3 uppercase mb-2">
                  Why this recommendation
                </div>
                <p className="text-[13px] text-ink leading-[1.6]">{recommendationRationale(item)}</p>
                <div className="grid grid-cols-3 gap-3 mt-4 pt-3.5 border-t border-border-divider">
                  <div>
                    <div className="font-mono text-[10px] text-muted-3 uppercase">Confidence</div>
                    <div className="text-[15px] font-medium text-ink mt-0.5">{confidencePct}%</div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] text-muted-3 uppercase">Projected AQI</div>
                    <div className="text-[15px] font-medium text-ink mt-0.5">{Math.round(item.projected_aqi_if_actioned)}</div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] text-muted-3 uppercase">Last inspected</div>
                    <div className="text-[15px] font-medium text-ink mt-0.5">
                      {item.evidence?.last_inspection_days_ago != null ? `${item.evidence.last_inspection_days_ago}d ago` : "no data"}
                    </div>
                  </div>
                </div>

                {alternative && (
                  <div className="flex items-start gap-2.5 mt-4 pt-3.5 border-t border-border-divider text-[12.5px] text-warning leading-[1.55]">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" strokeWidth={1.8} />
                    <div>
                      <span className="font-medium">Alternative interpretation: </span>
                      {alternative}
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2.5 mt-3.5 pt-3.5 border-t border-border-divider text-[11.5px] text-muted-3 leading-[1.55]">
                  <Info size={13} className="shrink-0 mt-0.5" strokeWidth={1.8} />
                  <div>
                    <span className="font-medium text-muted-2">Known limitations: </span>
                    {KNOWN_LIMITATIONS.join(" ")}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

/**
 * Command Center's richer alternative to PriorityActions — click a
 * recommendation to expand its rationale, evidence, and confidence.
 * PriorityActions itself is untouched and still used on the Intelligence
 * Report page; this is additive, not a replacement of that component.
 */
export default function AIDecisionPanel({ items, limit = 6 }) {
  const [expandedId, setExpandedId] = useState(null);
  const top = items.slice(0, limit);
  const toggleExpanded = useCallback((id) => setExpandedId((prev) => (prev === id ? null : id)), []);

  return (
    <Card padding="p-0" hover={false} className="overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-divider bg-search/50">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-accent" strokeWidth={1.8} />
          <span className="font-mono text-[11px] tracking-[.08em] text-muted-2 uppercase">
            AI decision panel · {items.length} total
          </span>
        </div>
        <LinkButton to="/attribution" variant="ghost" size="sm">
          View All Sources
        </LinkButton>
      </div>
      <motion.div initial="hidden" animate="show" variants={staggerContainer}>
        {top.map((item, i) => {
          const id = `${item.source_id}-${item.station}`;
          return (
            <DecisionRow
              key={id}
              id={id}
              item={item}
              expanded={expandedId === id}
              onToggle={toggleExpanded}
              last={i === top.length - 1}
            />
          );
        })}
      </motion.div>
    </Card>
  );
}
