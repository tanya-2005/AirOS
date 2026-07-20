import { CloudOff } from "lucide-react";
import { categoryFor } from "../../lib/aqi";

/** Degraded state when the CARTO tile CDN is unreachable — never a blank map. */
export default function MapErrorFallback({ stations }) {
  return (
    <div className="w-full h-full rounded-card bg-search flex flex-col items-center justify-center text-center p-8">
      <CloudOff size={26} className="text-muted-3" strokeWidth={1.6} />
      <div className="text-[15px] text-ink font-medium mt-3">Map tiles unreachable</div>
      <p className="text-[13px] text-muted-2 mt-1.5 max-w-[360px]">
        The basemap CDN didn't respond. Station data is still live — here's the ranking without the map.
      </p>
      <div className="flex flex-wrap justify-center gap-2 mt-5">
        {stations.map((s) => {
          const cat = categoryFor(s.aqi);
          return (
            <span
              key={s.station}
              className="text-[12.5px] font-medium px-3 py-1.5 rounded-full border border-border bg-white flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
              {s.station} · {Math.round(s.aqi)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
