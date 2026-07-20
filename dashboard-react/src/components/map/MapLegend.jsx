import { CPCB_CATEGORIES } from "../../lib/aqi";

const SOURCE_SWATCHES = [
  { label: "Industrial zone", color: "#B7502C" },
  { label: "Landfill", color: "#9A2F41" },
  { label: "Road", color: "#1F7A85" },
];

/** Floating legend overlay — AQI category key, source-layer swatches, and what the heat layer represents. */
export default function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm border border-border rounded-cardsm shadow-lift px-4 py-3.5 max-w-[220px]">
      <div className="font-mono text-[10px] tracking-[.08em] text-muted-3 uppercase mb-2">AQI category</div>
      <div className="flex flex-col gap-1.5">
        {CPCB_CATEGORIES.map((c) => (
          <div key={c.label} className="flex items-center gap-2 text-[12px] text-muted-1">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
            {c.label}
          </div>
        ))}
      </div>
      <div className="font-mono text-[10px] tracking-[.08em] text-muted-3 uppercase mb-2 mt-3.5 pt-3 border-t border-border-divider">
        Source layers
      </div>
      <div className="flex flex-col gap-1.5">
        {SOURCE_SWATCHES.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-[12px] text-muted-1">
            <span className="w-2.5 h-2.5 rounded-full shrink-0 border-2 border-white" style={{ background: s.color, boxShadow: "0 0 0 1px " + s.color }} />
            {s.label}
          </div>
        ))}
      </div>
      <div className="border-t border-border-divider mt-3 pt-2.5 text-[11px] text-muted-3 leading-snug">
        Heat overlay shows registered emission-source density, not AQI. Arrows show current wind direction (blowing toward the arrow tip).
      </div>
    </div>
  );
}
