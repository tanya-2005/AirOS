import { memo, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Card from "../ui/Card";
import SearchInput from "../ui/SearchInput";
import { categoryFor } from "../../lib/aqi";
import { sourceMeta } from "../../lib/sources";
import { cn } from "../../lib/utils/cn";
import { staggerContainer, fadeUp } from "../../lib/motion";

const HotspotRow = memo(function HotspotRow({ station, active, onSelect }) {
  const cat = categoryFor(station.aqi);
  const top = station.attribution?.[0];
  const meta = top ? sourceMeta(top.source_type) : null;

  return (
    <motion.button
      variants={fadeUp}
      onClick={() => onSelect(station.station)}
      aria-pressed={active}
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
});

/** Capped to the map panel's own height and internally scrollable with a name filter — 20+ stations in one city (Delhi) would otherwise stretch this sidebar column far past the map beside it, forcing a long page scroll to see a map that's already fully visible. */
export default function HotspotList({ stations, selected, onSelect }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stations;
    return stations.filter((s) => s.station.toLowerCase().includes(q));
  }, [stations, query]);

  return (
    <Card padding="p-0" hover={false} className="overflow-hidden flex flex-col max-h-[620px] lg:max-h-[760px]">
      {stations.length > 6 && (
        <div className="px-4 py-3 border-b border-border-divider shrink-0">
          <SearchInput placeholder="Filter stations…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      )}
      <div className="overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-5 py-8 text-center text-[13px] text-muted-3">No station matches "{query}".</div>
        ) : (
          <motion.div initial="hidden" animate="show" variants={staggerContainer}>
            {filtered.map((s) => (
              <HotspotRow key={s.station} station={s} active={s.station === selected} onSelect={onSelect} />
            ))}
          </motion.div>
        )}
      </div>
    </Card>
  );
}
