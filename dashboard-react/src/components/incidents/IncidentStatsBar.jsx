import { motion } from "framer-motion";
import { Layers, ListChecks, AlertOctagon, ShieldCheck } from "lucide-react";
import StatTile from "../ui/StatTile";
import { staggerContainer, fadeUp } from "../../lib/motion";
import { incidentStats } from "../../lib/incidents";

const ICON_PROPS = { size: 20, strokeWidth: 1.8 };

export default function IncidentStatsBar({ incidents }) {
  const stats = incidentStats(incidents);
  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer} className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <motion.div variants={fadeUp}>
        <StatTile icon={<Layers {...ICON_PROPS} className="text-accent" />} value={stats.total} label="Total incidents" />
      </motion.div>
      <motion.div variants={fadeUp}>
        <StatTile icon={<ListChecks {...ICON_PROPS} className="text-warning" />} value={stats.active} label="Active incidents" />
      </motion.div>
      <motion.div variants={fadeUp}>
        <StatTile icon={<AlertOctagon {...ICON_PROPS} className="text-danger" />} value={stats.critical} label="Critical, unresolved" />
      </motion.div>
      <motion.div variants={fadeUp}>
        <StatTile icon={<ShieldCheck {...ICON_PROPS} className="text-success" />} value={stats.resolved} label="Recently resolved" />
      </motion.div>
    </motion.div>
  );
}
