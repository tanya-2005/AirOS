import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Radar, Megaphone, FlaskConical, ArrowUpRight } from "lucide-react";
import Card from "../ui/Card";
import { staggerContainer, fadeUp } from "../../lib/motion";

const MotionLink = motion(Link);

function ActionCard({ icon, title, description, to, disabled }) {
  return (
    <motion.div variants={fadeUp}>
      <Card
        as={disabled ? motion.div : MotionLink}
        to={disabled ? undefined : to}
        hover={!disabled}
        padding="p-6"
        className={disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer h-full flex flex-col"}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="w-10 h-10 rounded-chip bg-search flex items-center justify-center shrink-0">{icon}</div>
          {!disabled && <ArrowUpRight size={15} className="text-muted-3 shrink-0" strokeWidth={2} />}
        </div>
        <div className="font-display text-[18px] text-ink mt-4">{title}</div>
        <p className="text-[12.5px] text-muted-2 mt-1.5 leading-[1.5]">{description}</p>
      </Card>
    </motion.div>
  );
}

/**
 * City-wide actions that aren't already covered by a specific incident row
 * in the work queue above — investigating a specific incident happens by
 * clicking that incident's row, not from a card here. Every `to` still
 * carries real current-state context (a real severe station, a real
 * incident id for simulation) computed on Command Centre from data already
 * fetched, not a static link to a blank page.
 */
export default function ActionCenter({ topIncident, severeStation, worstStation }) {
  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <ActionCard
        icon={<Radar size={17} className="text-warning" strokeWidth={1.8} />}
        title="Review severe forecast"
        description={severeStation ? `${severeStation.station} — forecast crosses into Severe/Emergency` : "No station forecast is currently severe"}
        to={severeStation ? `/forecast?station=${encodeURIComponent(severeStation.station)}` : worstStation ? `/forecast?station=${encodeURIComponent(worstStation)}` : "/forecast"}
      />
      <ActionCard
        icon={<Megaphone size={17} className="text-accent" strokeWidth={1.8} />}
        title="Issue public advisory"
        description="Review the current citizen health advisory and, if warranted, act on the government response it recommends."
        to={worstStation ? `/advisory?station=${encodeURIComponent(worstStation)}` : "/advisory"}
      />
      <ActionCard
        icon={<FlaskConical size={17} className="text-success" strokeWidth={1.8} />}
        title="Run simulation"
        description={topIncident ? `Model an intervention for ${topIncident.station}` : "Model a policy intervention for any station"}
        to={topIncident ? `/simulate?incident=${encodeURIComponent(topIncident.id)}` : "/simulate"}
      />
    </motion.div>
  );
}
