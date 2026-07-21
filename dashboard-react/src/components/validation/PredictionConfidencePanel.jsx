import { Gauge } from "lucide-react";
import Card from "../ui/Card";
import StatTile from "../ui/StatTile";
import Badge from "../ui/Badge";
import { CONFIDENCE_BAND_TONE, confidenceBandDistribution } from "../../lib/validation";

/** Average model-reported confidence + how validated predictions distribute across High/Medium/Low confidence bands. */
export default function PredictionConfidencePanel({ metrics, pairs }) {
  if (!metrics) return null;
  const bands = confidenceBandDistribution(pairs);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5 items-stretch">
      <StatTile
        icon={<Gauge size={18} className="text-accent" strokeWidth={1.8} />}
        value={metrics.avg_confidence * 100}
        decimals={0}
        suffix="%"
        label="Average prediction confidence"
      />
      <Card padding="p-6" hover={false}>
        <div className="font-mono text-[10.5px] tracking-[.08em] text-muted-3 uppercase mb-3">
          Confidence distribution across validated predictions
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {Object.entries(bands).map(([band, count]) => (
            <Badge key={band} tone={CONFIDENCE_BAND_TONE[band]}>
              {band}: {count} prediction{count === 1 ? "" : "s"}
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}
