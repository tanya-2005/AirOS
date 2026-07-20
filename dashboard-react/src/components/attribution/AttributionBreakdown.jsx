import Card from "../ui/Card";
import ConfidenceBar from "../ui/ConfidenceBar";
import { categoryFor } from "../../lib/aqi";
import { sourceMeta } from "../../lib/sources";

export default function AttributionBreakdown({ station }) {
  if (!station) return null;
  const cat = categoryFor(station.aqi);

  return (
    <Card padding="p-7" hover={false}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10.5px] tracking-[.1em] text-muted-3 uppercase">Attribution for</div>
          <h3 className="font-display text-[24px] text-ink mt-1">{station.station}</h3>
        </div>
        <div className="text-right shrink-0">
          <div className="font-display text-[30px] text-ink leading-none tabular-nums">{Math.round(station.aqi)}</div>
          <div className="text-[11px] font-medium mt-1" style={{ color: cat.color }}>{cat.label}</div>
        </div>
      </div>

      {station.attribution?.length > 0 ? (
        <div className="flex flex-col gap-4 mt-6">
          {station.attribution.map((a) => {
            const meta = sourceMeta(a.source_type);
            return (
              <ConfidenceBar
                key={a.source_type}
                label={meta.label}
                value={a.confidence}
                tone={meta.tone}
                sublabel={`raw score ${a.raw_score}`}
              />
            );
          })}
        </div>
      ) : (
        <p className="text-[13.5px] text-muted-3 mt-6">No registry sources within 3km of this station.</p>
      )}
    </Card>
  );
}
