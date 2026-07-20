import { motion } from "framer-motion";
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import Card from "../ui/Card";
import { fadeUp } from "../../lib/motion";

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-ink text-white rounded-[10px] px-3.5 py-2.5 shadow-panel">
      <div className="font-mono text-[10px] text-panel-muted uppercase tracking-wide">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 mt-1 text-[13px]">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[#D8DADE]">{p.name}</span>
          <span className="font-mono font-medium">{Math.round(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/** AI-adjusted forecast vs. the flat "nothing changes" persistence baseline, now / +24h / +72h. */
export default function ForecastChart({ station, forecast24, forecast72 }) {
  const data = [
    { t: "Now", predicted: station.current_aqi, baseline: station.current_aqi },
    { t: "+24h", predicted: forecast24?.predicted_aqi ?? null, baseline: forecast24?.persistence_baseline ?? station.current_aqi },
    { t: "+72h", predicted: forecast72?.predicted_aqi ?? null, baseline: forecast72?.persistence_baseline ?? station.current_aqi },
  ];

  return (
    <Card padding="p-7" hover={false}>
      <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }} variants={fadeUp}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-[10.5px] tracking-[.1em] text-muted-3 uppercase">Forecast trend</div>
            <h3 className="font-display text-[22px] text-ink mt-1">{station.station}</h3>
          </div>
        </div>
        <div className="h-[260px] mt-5 -ml-3">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#F1EFEA" vertical={false} />
              <XAxis dataKey="t" tick={{ fontSize: 12, fill: "#8A8F96", fontFamily: "IBM Plex Mono" }} axisLine={{ stroke: "#E9E7E2" }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#8A8F96", fontFamily: "IBM Plex Mono" }} axisLine={false} tickLine={false} width={38} />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12.5, fontFamily: "Helvetica Neue", color: "#6B6F75" }}
              />
              <Line
                type="monotone"
                dataKey="baseline"
                name="If nothing changes"
                stroke="#B5B2AB"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3 }}
                isAnimationActive
              />
              <Line
                type="monotone"
                dataKey="predicted"
                name="AI-adjusted forecast"
                stroke="#1F7A85"
                strokeWidth={2.5}
                dot={{ r: 4 }}
                isAnimationActive
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </Card>
  );
}
