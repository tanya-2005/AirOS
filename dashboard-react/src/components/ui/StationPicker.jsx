import { categoryFor } from "../../lib/aqi";
import { cn } from "../../lib/utils/cn";

/**
 * Horizontal station-selector chip row — shared by every page that lets you
 * drill into one station's data (Scenario Lab, Attribution, Forecast).
 */
export default function StationPicker({ stations, selected, onSelect, label = "Station" }) {
  if (!stations?.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {label && <span className="font-mono text-[11px] uppercase tracking-wider text-muted-4 mr-1">{label}</span>}
      {stations.map((s) => {
        const active = s.station === selected;
        const cat = categoryFor(s.aqi);
        return (
          <button
            key={s.station}
            onClick={() => onSelect(s.station)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-full border text-[13px] transition-colors duration-150 cursor-pointer",
              active ? "border-ink bg-ink text-white" : "border-border bg-white text-muted-1 hover:border-border-hover"
            )}
          >
            <span className="w-[7px] h-[7px] rounded-full" style={{ background: active ? "#7FD0D6" : cat.color }} />
            {s.station}
            <span className="font-mono opacity-70">{Math.round(s.aqi)}</span>
          </button>
        );
      })}
    </div>
  );
}
