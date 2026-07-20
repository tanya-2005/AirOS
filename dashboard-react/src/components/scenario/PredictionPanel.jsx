import { motion } from "framer-motion";
import Card from "../ui/Card";
import AnimatedNumber from "../ui/AnimatedNumber";
import { Skeleton } from "../ui/Skeleton";
import { darkPanelCategoryFor } from "../../lib/aqi";

function MiniStat({ label, value, accent = false }) {
  return (
    <div className="bg-panel-nested rounded-[12px] p-3.5">
      <div className="font-mono text-[9.5px] text-panel-muted">{label}</div>
      <div className={`font-display text-[24px] mt-1.5 ${accent ? "text-panel-accent" : "text-white"}`}>{value}</div>
    </div>
  );
}

export default function PredictionPanel({ aqi, pm25, pm10, confidence, timeToImprove, isPending }) {
  const cat = darkPanelCategoryFor(aqi ?? 0);

  return (
    <Card dark padding="p-[26px]" hover={false}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10.5px] tracking-[.1em] text-panel-muted">LIVE PREDICTION</span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-panel-accent">
          <motion.span
            animate={{ opacity: isPending ? [1, 0.35, 1] : 1 }}
            transition={{ duration: 1.2, repeat: isPending ? Infinity : 0 }}
            className="w-1.5 h-1.5 rounded-full bg-panel-accent"
          />
          {isPending ? "RECOMPUTING" : "SYNCED"}
        </span>
      </div>

      <div className="flex items-end gap-2.5 mt-4">
        <div className="font-display text-[64px] leading-[.82] text-white tabular-nums">
          {aqi == null ? <Skeleton className="h-14 w-24 bg-panel-nested" /> : <AnimatedNumber value={aqi} />}
        </div>
        {aqi != null && (
          <div className="pb-2">
            <div
              className="text-[12.5px] font-medium px-2.5 py-1 rounded-[7px]"
              style={{ background: cat.bg, color: cat.fg }}
            >
              {cat.label}
            </div>
          </div>
        )}
      </div>
      <div className="font-mono text-[11px] text-panel-muted2 mt-2.5">FORECAST AQI · WITH THESE ACTIONS</div>

      <div className="grid grid-cols-2 gap-2.5 mt-5">
        <MiniStat label="EXPECTED PM2.5" value={pm25 ?? "—"} />
        <MiniStat label="EXPECTED PM10" value={pm10 ?? "—"} />
        <MiniStat label="CONFIDENCE" value={confidence != null ? `${confidence}%` : "—"} accent />
        <MiniStat label="TIME TO IMPROVE" value={timeToImprove != null ? `${timeToImprove}h` : "—"} />
      </div>
    </Card>
  );
}
