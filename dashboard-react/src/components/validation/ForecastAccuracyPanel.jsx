import { Target, Info } from "lucide-react";
import Card from "../ui/Card";
import StatTile from "../ui/StatTile";
import { METRIC_EXPLANATIONS } from "../../lib/validation";

function MetricTile({ metricKey, value, suffix, decimals = 1 }) {
  const meta = METRIC_EXPLANATIONS[metricKey];
  return (
    <div className="flex flex-col gap-2">
      <StatTile value={value} decimals={decimals} suffix={suffix} label={meta.label} />
      <p className="text-[11.5px] leading-[1.5] text-muted-3 px-1">{meta.plain}</p>
    </div>
  );
}

/**
 * Forecast Accuracy — MAE/RMSE/Mean Bias/Average Confidence/Coverage, each
 * with a plain-English explanation for non-technical officers underneath
 * (lib/validation.js::METRIC_EXPLANATIONS documents the exact same formula
 * agents/validation_agent.py::compute_metrics computes — nothing here
 * recalculates anything). `metrics` is null when there isn't enough logged
 * history to backtest yet — that empty state is handled by the caller via
 * QueryState/EmptyState, not silently rendered as zeros here.
 */
export default function ForecastAccuracyPanel({ metrics, pairs }) {
  if (!metrics) return null;
  const recent = [...pairs].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 8);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <MetricTile metricKey="mae" value={metrics.mae} suffix=" pts" />
        <MetricTile metricKey="rmse" value={metrics.rmse} suffix=" pts" />
        <MetricTile metricKey="mean_bias" value={metrics.mean_bias} suffix=" pts" />
        <MetricTile metricKey="avg_confidence" value={metrics.avg_confidence * 100} suffix="%" decimals={0} />
        <MetricTile metricKey="coverage_pct" value={metrics.coverage_pct ?? 0} suffix="%" decimals={0} />
        <div className="flex flex-col gap-2">
          <StatTile value={metrics.sample_size} label="Validated Predictions" />
          <p className="text-[11.5px] leading-[1.5] text-muted-3 px-1">
            Total (predicted, actual) pairs this backtest checked, across {metrics.stations_validated} station(s).
          </p>
        </div>
      </div>

      <Card padding="p-5" hover={false} className="bg-search/40 border-dashed">
        <div className="flex items-start gap-2.5 text-[13px] text-muted-1 leading-[1.6]">
          <Info size={15} className="text-muted-3 shrink-0 mt-0.5" strokeWidth={1.8} />
          <span>
            RMSE vs. a plain persistence baseline (predicting "no change"): model {metrics.rmse} pts vs. persistence{" "}
            {metrics.persistence_rmse} pts —{" "}
            {metrics.improvement_over_persistence_pct >= 0
              ? `${metrics.improvement_over_persistence_pct}% better than just assuming AQI stays flat.`
              : `currently ${Math.abs(metrics.improvement_over_persistence_pct)}% worse than just assuming AQI stays flat — the weather/trend adjustments moved the prediction away from a good baseline more often than toward one, over this sample.`}
            {" "}Bias: the model {metrics.bias_direction} by {Math.abs(metrics.mean_bias)} pts on average.
          </span>
        </div>
      </Card>

      {recent.length > 0 && (
        <Card padding="p-0" hover={false} className="overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border-divider bg-search/50">
            <Target size={14} className="text-accent" strokeWidth={1.8} />
            <span className="font-mono text-[10.5px] tracking-[.08em] text-muted-2 uppercase">
              Recent validated predictions
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-border-divider bg-search/30">
                  {["Station", "Horizon", "Predicted", "Actual", "Abs. Error", "Confidence"].map((h) => (
                    <th key={h} className="px-5 py-2.5 text-[10px] font-mono uppercase tracking-wider text-muted-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((p, i) => (
                  <tr key={`${p.station}-${p.at}`} className={i === recent.length - 1 ? "" : "border-b border-border-divider"}>
                    <td className="px-5 py-3 text-[13px] text-ink font-medium truncate max-w-[220px]">{p.station}</td>
                    <td className="px-5 py-3 text-[12px] font-mono text-muted-2">{p.horizon_hours}h</td>
                    <td className="px-5 py-3 text-[12.5px] font-mono text-ink">{p.predicted_aqi}</td>
                    <td className="px-5 py-3 text-[12.5px] font-mono text-ink">{p.actual_aqi}</td>
                    <td className="px-5 py-3 text-[12.5px] font-mono text-muted-1">{p.absolute_error}</td>
                    <td className="px-5 py-3 text-[12.5px] font-mono text-muted-2">{Math.round(p.confidence * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
