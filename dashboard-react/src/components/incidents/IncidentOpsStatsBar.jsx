import { motion } from "framer-motion";
import { FolderOpen, UserCheck, UserX, AlertOctagon } from "lucide-react";
import StatTile from "../ui/StatTile";
import { staggerContainer, fadeUp } from "../../lib/motion";
import { activeIncidents, criticalIncidents } from "../../lib/incidents";

const ICON_PROPS = { size: 20, strokeWidth: 1.8 };

/** Command Center's ops-summary strip — Open/Assigned/Unassigned/Critical, all real counts derived from the same incident list CriticalAlerts already renders (no second fetch, no duplicate state). */
export default function IncidentOpsStatsBar({ incidents }) {
  const active = activeIncidents(incidents);
  const assigned = active.filter((i) => i.assignment);
  const unassigned = active.filter((i) => !i.assignment);
  const critical = criticalIncidents(incidents);

  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer} className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <motion.div variants={fadeUp}>
        <StatTile icon={<FolderOpen {...ICON_PROPS} className="text-accent" />} value={active.length} label="Open incidents" />
      </motion.div>
      <motion.div variants={fadeUp}>
        <StatTile icon={<UserCheck {...ICON_PROPS} className="text-success" />} value={assigned.length} label="Assigned" />
      </motion.div>
      <motion.div variants={fadeUp}>
        <StatTile icon={<UserX {...ICON_PROPS} className="text-warning" />} value={unassigned.length} label="Unassigned" />
      </motion.div>
      <motion.div variants={fadeUp}>
        <StatTile icon={<AlertOctagon {...ICON_PROPS} className="text-danger" />} value={critical.length} label="Critical" />
      </motion.div>
    </motion.div>
  );
}
