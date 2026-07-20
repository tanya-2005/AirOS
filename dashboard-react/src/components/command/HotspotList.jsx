import { motion } from "framer-motion";
import Card from "../ui/Card";
import { categoryFor } from "../../lib/aqi";
import { sourceMeta } from "../../lib/sources";
import { cn } from "../../lib/utils/cn";
import { staggerContainer, fadeUp } from "../../lib/motion";

function HotspotRow({ station, active, onClick }) {
  const cat = categoryFor(station.aqi);
  const top = station.attribution?.[0];
  const meta = top ? sourceMeta(top.source_type) : null;

  return (
    <motion.button
      variants={fadeUp}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-5 py-4 text-left border-b border-border-divider last:border-b-0",
        "transition-colors duration-150 cursor-pointer",
        active ? "bg-accent-tint" : "hover:bg-search"
      )}
    >
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
      <div className="flex-1 min-w-0">
        <div className="text-[14.5px] font-medium text-ink truncate">{station.station}</div>
        {meta && (
          <div className="text-[12.5px] text-muted-2 truncate mt-0.5">
            {meta.label} · {Math.round(top.confidence * 100)}% attributed
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="font-display text-[22px] text-ink tabular-nums leading-none">
          {Math.round(station.aqi)}
        </div>
        <div className="text-[10px] font-mono uppercase tracking-wide mt-1" style={{ color: cat.color }}>
          {cat.label}
        </div>
      </div>
    </motion.button>
  );
}

export default function HotspotList({ stations, selected, onSelect }) {
  return (
    <Card padding="p-0" hover={false} className="overflow-hidden">
      <motion.div initial="hidden" animate="show" variants={staggerContainer}>
        {stations.map((s) => (
          <HotspotRow
            key={s.station}
            station={s}
            active={s.station === selected}
            onClick={() => onSelect(s.station)}
          />
        ))}
      </motion.div>
    </Card>
  );
}
