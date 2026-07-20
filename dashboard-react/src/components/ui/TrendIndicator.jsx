import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "../../lib/utils/cn";

/** Shared trend arrow + signed delta — same visual language CityForecastTable/StationDetailPanel already use for forecast deltas, extracted so the Command Center's "AQI change since previous snapshot" can reuse it instead of a third copy of the same three lines. */
export default function TrendIndicator({ delta, threshold = 2, size = 12, className }) {
  if (delta == null) {
    return <span className={cn("text-muted-4 font-mono text-[12px]", className)}>—</span>;
  }
  const worse = delta > threshold;
  const better = delta < -threshold;
  const Icon = worse ? TrendingUp : better ? TrendingDown : Minus;
  const tone = worse ? "text-danger" : better ? "text-success" : "text-muted-3";
  return (
    <span className={cn("inline-flex items-center gap-1 font-mono", tone, className)}>
      <Icon size={size} strokeWidth={2} />
      {delta > 0 ? "+" : ""}
      {delta}
    </span>
  );
}
