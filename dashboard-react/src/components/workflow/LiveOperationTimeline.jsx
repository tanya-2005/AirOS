import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, ArrowUpRight, Radio, History } from "lucide-react";
import Card from "../ui/Card";
import SectionHeading from "../ui/SectionHeading";
import EmptyState from "../ui/EmptyState";
import { staggerContainer, fadeUp } from "../../lib/motion";
import { formatRelativeTime } from "../../lib/incidents";

/**
 * "How AirOS handled the latest pollution event" — renders
 * lib/incidents.js::buildOperationTimeline's step list for the single most
 * relevant incident (see pages/MissionControl.jsx for how that incident is
 * picked). Every step links to the module that actually owns that data.
 */
export default function LiveOperationTimeline({ incident, steps }) {
  return (
    <section>
      <SectionHeading
        eyebrow="LIVE OPERATION TIMELINE"
        title="How AirOS handled the latest pollution event"
        description={incident ? `${incident.station} · ${incident.id}` : undefined}
        className="mb-6"
      />
      {!incident ? (
        <EmptyState
          icon={<History size={18} strokeWidth={1.8} />}
          tone="muted"
          title="No pollution event to trace yet"
          description="This timeline populates automatically the next time an incident opens for this city."
        />
      ) : (
        <Card padding="p-7" hover={false}>
          <motion.div initial="hidden" animate="show" variants={staggerContainer}>
            {steps.map((step, i) => (
              <motion.div key={step.key} variants={fadeUp} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      step.status === "done" ? "bg-success text-white" : "bg-search text-muted-3 border border-border"
                    }`}
                  >
                    {step.status === "done" ? <CheckCircle2 size={15} strokeWidth={2} /> : <Circle size={13} strokeWidth={2} />}
                  </div>
                  {i < steps.length - 1 && <div className="w-px flex-1 bg-border-divider my-1" />}
                </div>
                <Link to={step.linkTo} className="group flex-1 min-w-0 pb-6 last:pb-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10.5px] tracking-[.08em] text-muted-3 uppercase group-hover:text-accent transition-colors">
                      {step.label}
                    </span>
                    {step.status === "available" && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-warning uppercase">
                        <Radio size={9} /> Available
                      </span>
                    )}
                    <ArrowUpRight size={11} className="text-muted-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-[13.5px] text-ink mt-1 leading-snug">{step.detail}</div>
                  {step.at && <div className="text-[11px] text-muted-3 mt-0.5">{formatRelativeTime(step.at)}</div>}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </Card>
      )}
    </section>
  );
}
