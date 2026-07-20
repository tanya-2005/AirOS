import { useState } from "react";
import { Wind, Droplets, TrendingUp, Gauge } from "lucide-react";
import Card from "../ui/Card";
import AnimatedNumber from "../ui/AnimatedNumber";
import { cn } from "../../lib/utils/cn";

function Cell({ icon, label, value, note, last }) {
  return (
    <div className={cn("p-6", !last && "border-r border-border-divider")}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-mono text-[10.5px] tracking-[.06em] text-muted-3 uppercase">{label}</span>
      </div>
      <div className="font-display text-[26px] text-ink mt-3">{value}</div>
      <div className="text-[12px] text-muted-4 mt-1">{note}</div>
    </div>
  );
}

const TABS = [
  { id: "forecast_24h", label: "24H" },
  { id: "forecast_72h", label: "72H" },
];

/** Breaks a forecast down into the heuristic's real inputs — trend, wind, humidity — not just the final number. */
export default function ForecastComponents({ station }) {
  const [tab, setTab] = useState("forecast_24h");
  const horizon = station[tab];
  if (!horizon) return null;

  const { trend_adjustment, wind_adjustment, humidity_adjustment } = horizon.components;
  const sign = (v) => (v > 0 ? "+" : "");

  return (
    <Card padding="p-0" hover={false}>
      <div className="flex items-center justify-between px-6 pt-5">
        <div className="font-mono text-[10.5px] tracking-[.08em] text-muted-3 uppercase">Forecast components</div>
        <div className="flex gap-1 bg-search rounded-full p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[12px] font-mono transition-colors duration-150 cursor-pointer",
                tab === t.id ? "bg-ink text-white" : "text-muted-2 hover:text-ink"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 mt-3">
        <Cell
          icon={<TrendingUp size={14} className="text-accent" strokeWidth={1.8} />}
          label="Trend"
          value={`${sign(trend_adjustment)}${trend_adjustment}`}
          note="from recent readings"
        />
        <Cell
          icon={<Wind size={14} className="text-accent" strokeWidth={1.8} />}
          label="Wind"
          value={`${sign(wind_adjustment)}${wind_adjustment}`}
          note="dispersion effect"
        />
        <Cell
          icon={<Droplets size={14} className="text-accent" strokeWidth={1.8} />}
          label="Humidity"
          value={`${sign(humidity_adjustment)}${humidity_adjustment}`}
          note="particulate suspension"
        />
        <Cell
          icon={<Gauge size={14} className="text-accent" strokeWidth={1.8} />}
          label="Confidence"
          value={<><AnimatedNumber value={Math.round(horizon.confidence * 100)} />%</>}
          note={`at ${horizon.horizon_hours}h horizon`}
          last
        />
      </div>
    </Card>
  );
}
