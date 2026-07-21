import { motion } from "framer-motion";
import { Briefcase, CheckCircle2, Timer, Target } from "lucide-react";
import StatTile from "../ui/StatTile";
import InsightTile from "../ui/InsightTile";
import { staggerContainer, fadeUp } from "../../lib/motion";
import { avgResolutionHours, onTimeRate } from "../../lib/tasks";

const ICON_PROPS = { size: 20, strokeWidth: 1.8 };

export default function PerformanceSummaryBar({ incidents, tasks }) {
  const resolvedCount = incidents.filter((i) => i.status === "Resolved").length;
  const avgHours = avgResolutionHours(incidents);
  const onTime = onTimeRate(tasks);

  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer} className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <motion.div variants={fadeUp}>
        <StatTile icon={<Briefcase {...ICON_PROPS} className="text-accent" />} value={incidents.length} label="Incidents assigned" />
      </motion.div>
      <motion.div variants={fadeUp}>
        <StatTile icon={<CheckCircle2 {...ICON_PROPS} className="text-success" />} value={resolvedCount} label="Resolved" />
      </motion.div>
      <motion.div variants={fadeUp}>
        <InsightTile
          icon={<Timer {...ICON_PROPS} className="text-warning" />}
          value={avgHours != null ? `${avgHours}h` : "—"}
          label="Avg. resolution time"
        />
      </motion.div>
      <motion.div variants={fadeUp}>
        <InsightTile
          icon={<Target {...ICON_PROPS} className="text-accent" />}
          value={onTime != null ? `${onTime}%` : "—"}
          label="Tasks completed on time"
        />
      </motion.div>
    </motion.div>
  );
}
