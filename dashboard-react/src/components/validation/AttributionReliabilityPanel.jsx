import { Microscope, Info } from "lucide-react";
import Card from "../ui/Card";
import StatTile from "../ui/StatTile";
import Badge from "../ui/Badge";
import { CONFIDENCE_BAND_TONE } from "../../lib/validation";

/**
 * Evidence-completeness signal over the current attribution results — NOT
 * an accuracy score (see agents/validation_agent.py::attribution_reliability's
 * docstring for why: there's no ground-truth "the pollution really did come
 * from source X" label to check against). methodology_note below is the
 * same disclosure text the backend returns, rendered verbatim so this
 * distinction is never lost on the way to the UI.
 */
export default function AttributionReliabilityPanel({ summary }) {
  if (!summary) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatTile
          icon={<Microscope size={18} className="text-accent" strokeWidth={1.8} />}
          value={summary.stations_with_evidence_pct}
          suffix="%"
          decimals={0}
          label="Stations with nearby evidence"
        />
        <StatTile value={summary.wind_aware_pct} suffix="%" decimals={0} label="Wind-aware scoring active" />
        <StatTile value={summary.avg_evidence_count} decimals={1} label="Avg. evidence points per station" />
        <StatTile
          value={summary.avg_top_confidence != null ? summary.avg_top_confidence * 100 : 0}
          suffix="%"
          decimals={0}
          label="Avg. top-source confidence"
        />
      </div>

      <Card padding="p-6" hover={false}>
        <div className="font-mono text-[10.5px] tracking-[.08em] text-muted-3 uppercase mb-3">
          Confidence band distribution
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {Object.entries(summary.confidence_band_counts).map(([band, count]) => (
            <Badge key={band} tone={CONFIDENCE_BAND_TONE[band]}>
              {band}: {count} station{count === 1 ? "" : "s"}
            </Badge>
          ))}
        </div>
      </Card>

      <Card padding="p-5" hover={false} className="bg-search/40 border-dashed">
        <div className="flex items-start gap-2.5 text-[13px] text-muted-1 leading-[1.6]">
          <Info size={15} className="text-muted-3 shrink-0 mt-0.5" strokeWidth={1.8} />
          {summary.methodology_note}
        </div>
      </Card>
    </div>
  );
}
