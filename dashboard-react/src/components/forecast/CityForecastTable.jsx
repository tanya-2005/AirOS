import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import Card from "../ui/Card";
import { categoryFor } from "../../lib/aqi";
import { staggerContainer, fadeUp } from "../../lib/motion";
import { cn } from "../../lib/utils/cn";

function Row({ f, active, onClick, last }) {
  const delta = f.forecast_24h.predicted_aqi - f.current_aqi;
  const worse = delta > 2;
  const better = delta < -2;
  const Icon = worse ? TrendingUp : better ? TrendingDown : Minus;
  const tone = worse ? "text-danger" : better ? "text-success" : "text-muted-3";
  const cat = categoryFor(f.current_aqi);

  return (
    <motion.button
      variants={fadeUp}
      onClick={onClick}
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
}

/** All stations ranked by projected 24h change — worsening first — so the biggest emerging risk surfaces at the top. */
export default function CityForecastTable({ forecasts, selected, onSelect }) {
  const sorted = [...forecasts].sort(
    (a, b) => b.forecast_24h.predicted_aqi - b.current_aqi - (a.forecast_24h.predicted_aqi - a.current_aqi)
  );

  return (
    <Card padding="p-0" hover={false} className="overflow-hidden">
      <div className="flex items-center gap-4 px-5 py-3 border-b border-border-divider bg-search/60">
        <span className="flex-1 font-mono text-[10.5px] tracking-[.08em] text-muted-3 uppercase">Station</span>
        <span className="font-mono text-[10.5px] tracking-[.08em] text-muted-3 uppercase w-10 text-right">Now</span>
        <span className="font-mono text-[10.5px] tracking-[.08em] text-muted-3 uppercase w-16 text-right">+24h</span>
      </div>
      <motion.div initial="hidden" animate="show" variants={staggerContainer}>
        {sorted.map((f, i) => (
          <Row key={f.station} f={f} active={f.station === selected} onClick={() => onSelect(f.station)} last={i === sorted.length - 1} />
        ))}
      </motion.div>
    </Card>
  );
}
