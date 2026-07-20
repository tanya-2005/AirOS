import { Wind, Droplets, Thermometer, CloudRain } from "lucide-react";
import Card from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";

function Stat({ icon, label, value, unit }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-chip bg-accent-tint flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[18px] font-display text-ink leading-none tabular-nums">
          {value != null ? `${value}${unit}` : "—"}
        </div>
        <div className="text-[11px] text-muted-3 mt-1">{label}</div>
      </div>
    </div>
  );
}

/** Current wind/humidity/temperature/rainfall for the selected station — the raw inputs behind forecast_agent's weather_effects. */
export default function CurrentWeatherPanel({ weather, isLoading }) {
  if (isLoading) {
    return (
      <Card padding="p-6" hover={false}>
        <Skeleton className="h-3 w-28 mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </Card>
    );
  }

  if (!weather) {
    return (
      <Card padding="p-6" hover={false} className="text-[13px] text-muted-3 text-center">
        No live weather data for this station yet — run ingestion/fetch_weather.py.
      </Card>
    );
  }

  return (
    <Card padding="p-6" hover={false}>
      <div className="font-mono text-[10.5px] tracking-[.1em] text-muted-3 uppercase mb-4">
        Current weather
      </div>
      <div className="grid grid-cols-2 gap-y-4 gap-x-3">
        <Stat icon={<Wind size={16} className="text-accent" strokeWidth={1.8} />} label="Wind speed" value={weather.wind_speed} unit=" km/h" />
        <Stat icon={<Droplets size={16} className="text-accent" strokeWidth={1.8} />} label="Humidity" value={weather.humidity} unit="%" />
        <Stat icon={<Thermometer size={16} className="text-accent" strokeWidth={1.8} />} label="Temperature" value={weather.temperature} unit="°C" />
        <Stat icon={<CloudRain size={16} className="text-accent" strokeWidth={1.8} />} label="Rainfall" value={weather.precipitation} unit=" mm" />
      </div>
    </Card>
  );
}
