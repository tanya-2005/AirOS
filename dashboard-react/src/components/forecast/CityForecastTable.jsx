import { memo, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import Card from "../ui/Card";
import SearchInput from "../ui/SearchInput";
import { categoryFor } from "../../lib/aqi";
import { staggerContainer, fadeUp } from "../../lib/motion";
import { cn } from "../../lib/utils/cn";

const Row = memo(function Row({ f, active, onSelect, last }) {
  const delta = f.forecast_24h.predicted_aqi - f.current_aqi;
  const worse = delta > 2;
  const better = delta < -2;
  const Icon = worse ? TrendingUp : better ? TrendingDown : Minus;
  const tone = worse ? "text-danger" : better ? "text-success" : "text-muted-3";
  const cat = categoryFor(f.current_aqi);

  return (
    <motion.button
      variants={fadeUp}
      onClick={() => onSelect(f.station)}
      aria-pressed={active}
      className={cn(
        "w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors duration-150 cursor-pointer",
        !last && "border-b border-border-divider",
        active ? "bg-accent-tint" : "hover:bg-search"
      )}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cat.color }} />
      <span className="flex-1 min-w-0 text-[13.5px] font-medium text-ink truncate">{f.station}</span>
      <span className="font-mono text-[13px] text-muted-3 tabular-nums w-10 text-right">{Math.round(f.current_aqi)}</span>
      <span className={cn("flex items-center gap-1 font-mono text-[13px] w-16 justify-end", tone)}>
        <Icon size={12} strokeWidth={2} />
        {Math.round(f.forecast_24h.predicted_aqi)}
      </span>
    </motion.button>
  );
});

/**
 * All stations ranked by projected 24h change — worsening first — so the
 * biggest emerging risk surfaces at the top. Capped height + internal
 * scroll + name filter once there are enough rows to matter — this sits in
 * a sticky sidebar next to the main forecast column, so an uncapped list
 * (20+ stations in Delhi) would make the sticky column, and therefore the
 * whole page, far taller than it needs to be.
 */
export default function CityForecastTable({ forecasts, selected, onSelect }) {
  const [query, setQuery] = useState("");
  const sorted = [...forecasts].sort(
    (a, b) => b.forecast_24h.predicted_aqi - b.current_aqi - (a.forecast_24h.predicted_aqi - a.current_aqi)
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((f) => f.station.toLowerCase().includes(q));
  }, [sorted, query]);

  return (
    <Card padding="p-0" hover={false} className="overflow-hidden flex flex-col max-h-[560px]">
      <div className="flex items-center gap-4 px-5 py-3 border-b border-border-divider bg-search/60 shrink-0">
        <span className="flex-1 font-mono text-[10.5px] tracking-[.08em] text-muted-3 uppercase">Station</span>
        <span className="font-mono text-[10.5px] tracking-[.08em] text-muted-3 uppercase w-10 text-right">Now</span>
        <span className="font-mono text-[10.5px] tracking-[.08em] text-muted-3 uppercase w-16 text-right">+24h</span>
      </div>
      {forecasts.length > 6 && (
        <div className="px-4 py-2.5 border-b border-border-divider shrink-0">
          <SearchInput placeholder="Filter stations…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      )}
      <div className="overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-5 py-8 text-center text-[13px] text-muted-3">No station matches "{query}".</div>
        ) : (
          <motion.div initial="hidden" animate="show" variants={staggerContainer}>
            {filtered.map((f, i) => (
              <Row key={f.station} f={f} active={f.station === selected} onSelect={onSelect} last={i === filtered.length - 1} />
            ))}
          </motion.div>
        )}
      </div>
    </Card>
  );
}
