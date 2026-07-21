import { Layers } from "lucide-react";
import { cn } from "../../lib/utils/cn";

const LAYER_OPTIONS = [
  { key: "stations", label: "AQI stations" },
  { key: "heatmap", label: "Source heatmap" },
  { key: "roads", label: "Roads" },
  { key: "industrial", label: "Industrial zones" },
  { key: "landfills", label: "Landfills" },
  { key: "wind", label: "Wind direction" },
];

/** Floating layer-visibility panel — one checkbox per MapLibre layer, all driven by a single `layers` state object in the parent page. */
export default function LayerToggle({ layers, onToggle }) {
  return (
    <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm border border-border rounded-cardsm shadow-lift px-4 py-3.5 w-[190px]">
      <div className="flex items-center gap-2 mb-2.5">
        <Layers size={13} className="text-muted-3" strokeWidth={1.8} />
        <div className="font-mono text-[10px] tracking-[.08em] text-muted-3 uppercase">Layers</div>
      </div>
      <div className="flex flex-col gap-1.5">
        {LAYER_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            role="checkbox"
            aria-checked={layers[opt.key]}
            onClick={() => onToggle(opt.key)}
            className="flex items-center gap-2 -mx-1.5 px-1.5 py-1 rounded-[6px] text-[12.5px] text-ink cursor-pointer select-none hover:bg-search transition-colors duration-150"
          >
            <span
              className={cn(
                "w-[15px] h-[15px] rounded-[4px] border flex items-center justify-center shrink-0 transition-colors duration-150",
                layers[opt.key] ? "bg-ink border-ink" : "border-border-hover bg-white"
              )}
            >
              {layers[opt.key] && <span className="w-[6px] h-[6px] rounded-[1.5px] bg-white" />}
            </span>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
