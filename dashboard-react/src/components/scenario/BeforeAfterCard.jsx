import { motion } from "framer-motion";
import Card from "../ui/Card";
import { categoryFor } from "../../lib/aqi";

function Bar({ label, value, animate = true }) {
  const pct = Math.min(100, (value / 300) * 100);
  const color = categoryFor(value).color;
  return (
    <div className="mt-4 first:mt-0">
      <div className="flex justify-between items-baseline mb-[7px]">
        <span className="text-[13px] text-muted-1">{label}</span>
        <span className="font-display text-[18px] text-ink tabular-nums">{Math.round(value)}</span>
      </div>
      <div className="h-3 rounded-full bg-border-divider overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={animate ? { width: 0 } : false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

export default function BeforeAfterCard({ currentAqi, predictedAqi }) {
  const netChange = currentAqi != null && predictedAqi != null ? Math.round(currentAqi - predictedAqi) : null;

  return (
    <Card>
      <div className="font-mono text-[11px] tracking-[.08em] text-muted-3">04 · BEFORE vs AFTER</div>
      <Bar label="Current (do nothing)" value={currentAqi ?? 0} animate={false} />
      <Bar label="Predicted (with actions)" value={predictedAqi ?? currentAqi ?? 0} />
      <div className="flex items-center gap-2 mt-4 pt-3.5 border-t border-border-divider">
        <span className="font-mono text-[11px] text-muted-3">NET CHANGE</span>
        <span
          className="ml-auto text-[15px] font-medium"
          style={{ color: netChange > 0 ? "#2E7D52" : "#6E7679" }}
        >
          {netChange == null ? "—" : netChange > 0 ? `−${netChange} AQI` : "0 AQI"}
        </span>
      </div>
    </Card>
  );
}
