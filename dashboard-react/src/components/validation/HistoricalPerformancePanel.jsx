import { TrendingUp, TrendingDown, Minus, History } from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import { TREND_TONE, TREND_LABEL } from "../../lib/validation";

const TREND_ICON = { improving: TrendingDown, degrading: TrendingUp, stable: Minus, insufficient_data: History };

/**
 * Rolling accuracy trend — splits the validated backtest pairs
 * chronologically in half and compares MAE (agents/validation_agent.py::
 * rolling_accuracy_trend). Deliberately two numbers + a direction, not a
 * chart — "avoid excessive charts if a simple visualization communicates
 * better" per this milestone's design brief, and a 2-bucket comparison is
 * honest about how little history currently exists to trend over.
 */
export default function HistoricalPerformancePanel({ trend }) {
  if (!trend) return null;
  const Icon = TREND_ICON[trend.trend] || Minus;

  if (trend.trend === "insufficient_data") {
    return (
      <Card padding="p-7" hover={false} className="text-center">
        <History size={20} className="text-muted-3 mx-auto" strokeWidth={1.6} />
        <p className="text-[13.5px] text-muted-2 mt-3 max-w-[440px] mx-auto">{trend.note}</p>
      </Card>
    );
  }

  return (
    <Card padding="p-7" hover={false}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <Icon size={18} className={trend.trend === "improving" ? "text-success" : trend.trend === "degrading" ? "text-danger" : "text-muted-2"} strokeWidth={1.8} />
          <span className="font-mono text-[11px] tracking-[.08em] text-muted-2 uppercase">Rolling accuracy trend</span>
        </div>
        <Badge tone={TREND_TONE[trend.trend]}>{TREND_LABEL[trend.trend]}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-6 mt-6">
        <div>
          <div className="font-mono text-[10.5px] text-muted-3 uppercase">Earlier half MAE</div>
          <div className="font-display text-[32px] text-ink mt-1">{trend.earlier_mae}</div>
        </div>
        <div>
          <div className="font-mono text-[10.5px] text-muted-3 uppercase">Later half MAE</div>
          <div className="font-display text-[32px] text-ink mt-1">{trend.later_mae}</div>
        </div>
      </div>
      <p className="text-[12.5px] text-muted-3 mt-4">
        {trend.relative_change_pct > 0 ? "+" : ""}
        {trend.relative_change_pct}% change in error, comparing the first half of {trend.sample_size} validated
        predictions to the second half, oldest to newest.
      </p>
    </Card>
  );
}
