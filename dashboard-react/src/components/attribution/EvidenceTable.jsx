import { memo } from "react";
import { motion } from "framer-motion";
import { Wind } from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import { sourceMeta } from "../../lib/sources";
import { staggerContainer, fadeUp } from "../../lib/motion";

const EvidenceRow = memo(function EvidenceRow({ e, last }) {
  const meta = sourceMeta(e.source_type);
  return (
    <motion.div
      variants={fadeUp}
      className={`grid grid-cols-2 sm:grid-cols-[1fr_140px_110px_110px] gap-3 px-5 py-3.5 items-center ${
        last ? "" : "border-b border-border-divider"
      }`}
    >
      <span className="text-[13.5px] font-medium text-ink font-mono flex items-center gap-1.5">
        {e.source_id}
        {e.downwind === true && (
          <Wind size={12} className="text-accent shrink-0" strokeWidth={2} aria-label="Downwind of this station" />
        )}
      </span>
      <Badge tone={meta.tone} className="w-fit">
        {meta.label}
      </Badge>
      <span className="text-[13px] text-muted-2 font-mono">{e.distance_km}km</span>
      <span className="text-[13px] text-ink font-mono font-medium">{e.contribution}</span>
    </motion.div>
  );
});

/** The ≤5 nearby registry records that actually drove a station's attribution score (contribution > 0.15). */
export default function EvidenceTable({ evidence }) {
  if (!evidence?.length) {
    return (
      <Card padding="p-7" hover={false} className="text-center text-[13.5px] text-muted-3">
        No individual evidence points cleared the contribution threshold for this station.
      </Card>
    );
  }

  return (
    <Card padding="p-0" hover={false} className="overflow-hidden">
      <div className="hidden sm:grid grid-cols-[1fr_140px_110px_110px] gap-3 px-5 py-3 border-b border-border-divider bg-search/60">
        {["Source", "Type", "Distance", "Contribution"].map((h) => (
          <span key={h} className="font-mono text-[10.5px] tracking-[.08em] text-muted-3 uppercase">
            {h}
          </span>
        ))}
      </div>
      <motion.div initial="hidden" animate="show" variants={staggerContainer}>
        {evidence.map((e, i) => (
          <EvidenceRow key={e.source_id} e={e} last={i === evidence.length - 1} />
        ))}
      </motion.div>
    </Card>
  );
}
