import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Card from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";
import { cn } from "../../lib/utils/cn";

const WINDOWS = [
  { hours: 24, label: "24H" },
  { hours: 168, label: "7D" },
];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-ink text-white rounded-[10px] px-3.5 py-2.5 shadow-panel">
      <div className="font-mono text-[10px] text-panel-muted">{label}</div>
      <div className="text-[13px] font-mono font-medium mt-1">{Math.round(payload[0].value)} AQI</div>
    </div>
  );
}

/** AQI over time for one station — accumulates as ingestion runs (data/history/aqi_delhi.jsonl), empty until then. */
export default function HistoricalTrendChart({ history, isLoading, hours, onChangeHours }) {
  const shortWindow = hours <= 24;
  const data = (history ?? []).map((h) => ({
    t: new Date(h.fetched_at).toLocaleString(undefined, shortWindow ? { hour: "2-digit", minute: "2-digit" } : { month: "short", day: "numeric" }),
    aqi: h.aqi,
  }));

  return (
    <Card padding="p-7" hover={false}>
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10.5px] tracking-[.1em] text-muted-3 uppercase">Historical AQI trend</div>
        <div className="flex gap-1 bg-search rounded-full p-1">
          {WINDOWS.map((w) => (
            <button
              key={w.hours}
              onClick={() => onChangeHours(w.hours)}
              aria-pressed={hours === w.hours}
              className={cn(
                "px-3 py-1.5 rounded-full text-[12px] font-mono transition-colors duration-150 cursor-pointer",
                hours === w.hours ? "bg-ink text-white" : "text-muted-2 hover:text-ink"
              )}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[220px] mt-5 -ml-3">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[13px] text-muted-3 text-center px-6">
            No history yet for this window — accumulates as ingestion runs over time (every 15 min via
            ingestion/scheduler.py, or manually).
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#F1EFEA" vertical={false} />
              <XAxis
                dataKey="t"
                tick={{ fontSize: 11, fill: "#8A8F96", fontFamily: "IBM Plex Mono" }}
                axisLine={{ stroke: "#E9E7E2" }}
                tickLine={false}
                minTickGap={30}
              />
              <YAxis tick={{ fontSize: 11, fill: "#8A8F96", fontFamily: "IBM Plex Mono" }} axisLine={false} tickLine={false} width={34} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="aqi" stroke="#1F7A85" strokeWidth={2.5} dot={data.length < 40} isAnimationActive />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
