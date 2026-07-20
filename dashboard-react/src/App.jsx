import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { Flame, Factory, HardHat, Fuel, CloudRain, Radio, ShieldAlert, Wind } from "lucide-react";
import AQIGauge from "./AQIGauge";
import { wards, enforcementQueue, simulate, categoryFor } from "./data";

const SOURCE_META = {
  waste_burning_zone: { icon: Flame, label: "Waste Burning" },
  industrial_stack: { icon: Factory, label: "Industrial Stack" },
  construction_site: { icon: HardHat, label: "Construction" },
  diesel_generator_cluster: { icon: Fuel, label: "Diesel Generators" },
};

function Badge({ children, tone = "muted" }) {
  const tones = {
    muted: "bg-panelAlt text-inkMuted border-borderc",
    danger: "bg-aqi-verypoor/15 text-aqi-verypoor border-aqi-verypoor/40",
    haze: "bg-haze/15 text-haze border-haze/40",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${tones[tone]}`}>
      {children}
    </span>
  );
}

function AttributionBar({ item }) {
  const meta = SOURCE_META[item.source_type] || { icon: Wind, label: item.source_type };
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <Icon size={15} className="text-haze shrink-0" />
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-ink font-body">{meta.label}</span>
          <span className="text-inkMuted font-mono">{Math.round(item.confidence * 100)}%</span>
        </div>
        <div className="h-1.5 bg-panelAlt rounded-full overflow-hidden">
          <div className="h-full bg-haze rounded-full" style={{ width: `${item.confidence * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const ward = wards[selectedIdx];

  const [constructionRed, setConstructionRed] = useState(0);
  const [wasteRed, setWasteRed] = useState(0);
  const [trafficRed, setTrafficRed] = useState(0);
  const [rain, setRain] = useState(false);

  const shares = useMemo(
    () => Object.fromEntries(ward.attribution.map((a) => [a.source_type, a.confidence])),
    [ward]
  );

  const simResult = useMemo(
    () =>
      simulate(
        ward.aqi,
        shares,
        {
          construction_site: constructionRed,
          waste_burning_zone: wasteRed,
          diesel_generator_cluster: trafficRed * 0.5,
        },
        rain
      ),
    [ward, shares, constructionRed, wasteRed, trafficRed, rain]
  );

  const forecastData = [
    { name: "Now", aqi: ward.aqi },
    { name: "+24h", aqi: ward.forecast_24h.predicted_aqi },
    { name: "+72h", aqi: ward.forecast_72h.predicted_aqi },
  ];

  const relevantActions = enforcementQueue.filter((a) => a.station === ward.station);

  return (
    <div className="min-h-screen bg-bg text-ink font-body p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-borderc">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">AirOS <span className="text-haze">Command</span></h1>
          <p className="text-inkMuted text-xs font-mono mt-0.5">Urban Air Quality Intelligence — Delhi NCR</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone="haze">Sample data · replace with live WAQI feed</Badge>
          <div className="flex items-center gap-1.5 text-xs font-mono text-clean">
            <Radio size={13} className="animate-pulse" /> {wards.length} STATIONS
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left: ward list */}
        <div className="col-span-3 bg-panel border border-borderc rounded-lg p-3">
          <h2 className="font-display text-xs uppercase tracking-wider text-inkMuted mb-3">Hotspots</h2>
          <div className="flex flex-col gap-2">
            {wards.map((w, i) => {
              const cat = categoryFor(w.aqi);
              return (
                <button
                  key={w.station}
                  onClick={() => setSelectedIdx(i)}
                  className={`text-left p-2.5 rounded border transition-colors ${
                    i === selectedIdx ? "bg-panelAlt border-haze" : "border-borderc hover:border-inkMuted"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-body text-sm">{w.station}</span>
                    <span className="font-mono text-sm font-semibold" style={{ color: cat.color }}>{w.aqi}</span>
                  </div>
                  <div className="text-[10px] font-mono text-inkMuted mt-0.5">{cat.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: gauge + attribution */}
        <div className="col-span-5 bg-panel border border-borderc rounded-lg p-4">
          <h2 className="font-display text-xs uppercase tracking-wider text-inkMuted mb-2">{ward.station} — Source Attribution</h2>
          <div className="flex items-start gap-4">
            <AQIGauge value={ward.aqi} size={160} />
            <div className="flex-1 pt-2">
              {ward.attribution.map((a) => (
                <AttributionBar key={a.source_type} item={a} />
              ))}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-borderc">
            <h3 className="font-display text-[10px] uppercase tracking-wider text-inkMuted mb-2">Evidence</h3>
            <div className="flex flex-col gap-1.5">
              {ward.evidence.map((e) => (
                <div key={e.source_id} className="flex justify-between text-[11px] font-mono text-inkMuted">
                  <span>{e.source_id} · {SOURCE_META[e.source_type]?.label}</span>
                  <span>{e.distance_km} km away</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: forecast + enforcement */}
        <div className="col-span-4 flex flex-col gap-4">
          <div className="bg-panel border border-borderc rounded-lg p-4">
            <h2 className="font-display text-xs uppercase tracking-wider text-inkMuted mb-2">Forecast</h2>
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={forecastData}>
                <XAxis dataKey="name" tick={{ fill: "#8993a1", fontSize: 11 }} axisLine={{ stroke: "#2b333d" }} tickLine={false} />
                <YAxis hide domain={[0, 500]} />
                <Tooltip contentStyle={{ background: "#1a2028", border: "1px solid #2b333d", fontSize: 12 }} />
                <Bar dataKey="aqi" radius={[3, 3, 0, 0]}>
                  {forecastData.map((d, i) => (
                    <Cell key={i} fill={categoryFor(d.aqi).color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-between text-[10px] font-mono text-inkMuted mt-1">
              <span>24h confidence {Math.round(ward.forecast_24h.confidence * 100)}%</span>
              <span>72h confidence {Math.round(ward.forecast_72h.confidence * 100)}%</span>
            </div>
          </div>

          <div className="bg-panel border border-borderc rounded-lg p-4 flex-1">
            <h2 className="font-display text-xs uppercase tracking-wider text-inkMuted mb-2 flex items-center gap-1.5">
              <ShieldAlert size={13} className="text-haze" /> Enforcement Queue
            </h2>
            <div className="flex flex-col gap-2">
              {(relevantActions.length ? relevantActions : enforcementQueue.slice(0, 3)).map((a, i) => (
                <div key={i} className="p-2 rounded bg-panelAlt border border-borderc">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-body">{a.action}</span>
                    <Badge tone={a.permit_status !== "valid" ? "danger" : "muted"}>{a.permit_status}</Badge>
                  </div>
                  <div className="text-[10px] font-mono text-clean mt-1">
                    est. {a.expected_aqi_improvement_pct}% improvement → AQI {a.projected_aqi_if_actioned}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom: simulation */}
        <div className="col-span-12 bg-panel border border-borderc rounded-lg p-4">
          <h2 className="font-display text-xs uppercase tracking-wider text-inkMuted mb-3">Simulation — What If</h2>
          <div className="grid grid-cols-12 gap-6 items-center">
            <div className="col-span-7 flex flex-col gap-4">
              <SimSlider label="Construction reduction" icon={HardHat} value={constructionRed} onChange={setConstructionRed} />
              <SimSlider label="Waste-burning enforcement" icon={Flame} value={wasteRed} onChange={setWasteRed} />
              <SimSlider label="Traffic/generator reduction" icon={Fuel} value={trafficRed} onChange={setTrafficRed} />
              <button
                onClick={() => setRain((r) => !r)}
                className={`flex items-center gap-2 w-fit px-3 py-1.5 rounded border text-xs font-mono transition-colors ${
                  rain ? "bg-clean/15 border-clean text-clean" : "border-borderc text-inkMuted"
                }`}
              >
                <CloudRain size={14} /> Rain forecast tomorrow {rain ? "(ON)" : "(OFF)"}
              </button>
            </div>
            <div className="col-span-5 flex items-center justify-around border-l border-borderc pl-6">
              <AQIGauge value={ward.aqi} label="Current" size={130} />
              <div className="text-2xl text-inkMuted font-display">→</div>
              <AQIGauge value={simResult.projectedAqi} label="Projected" size={130} />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-borderc text-xs font-mono text-clean">
            {simResult.improvementPct}% projected improvement · {simResult.breakdown.length} intervention{simResult.breakdown.length !== 1 ? "s" : ""} applied
          </div>
        </div>
      </div>
    </div>
  );
}

function SimSlider({ label, icon: Icon, value, onChange }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-body text-ink flex items-center gap-1.5"><Icon size={13} className="text-haze" /> {label}</span>
        <span className="text-xs font-mono text-haze">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-haze"
      />
    </div>
  );
}
