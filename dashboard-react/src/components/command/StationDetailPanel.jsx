import { TrendingUp, TrendingDown, Minus, ArrowRight, FlaskConical } from "lucide-react";
import Card from "../ui/Card";
import ConfidenceBar from "../ui/ConfidenceBar";
import LinkButton from "../ui/LinkButton";
import RiskBadge from "../ui/RiskBadge";
import TrendIndicator from "../ui/TrendIndicator";
import { Skeleton } from "../ui/Skeleton";
import AQIGauge from "../charts/AQIGauge";
import { categoryFor } from "../../lib/aqi";
import { sourceMeta } from "../../lib/sources";
import { riskLevel } from "../../lib/decision";

function ForecastCell({ label, horizon, currentAqi }) {
  if (!horizon) {
    return (
      <div className="bg-search rounded-[12px] p-3.5">
        <Skeleton className="h-3 w-16 mb-2" />
        <Skeleton className="h-6 w-14" />
      </div>
    );
  }
  const delta = horizon.predicted_aqi - currentAqi;
  const worse = delta > 2;
  const better = delta < -2;
  const Icon = worse ? TrendingUp : better ? TrendingDown : Minus;
  const tone = worse ? "text-danger" : better ? "text-success" : "text-muted-3";

  return (
    <div className="bg-search rounded-[12px] p-3.5">
      <div className="font-mono text-[10px] text-muted-3 uppercase tracking-wide">{label}</div>
      <div className="flex items-baseline gap-1.5 mt-1.5">
        <span className="font-display text-[24px] text-ink tabular-nums">{Math.round(horizon.predicted_aqi)}</span>
        <span className={`flex items-center gap-0.5 text-[11px] font-mono ${tone}`}>
          <Icon size={12} strokeWidth={2} />
          {Math.abs(Math.round(delta))}
        </span>
      </div>
      <div className="text-[10.5px] text-muted-4 mt-1">{Math.round(horizon.confidence * 100)}% confidence</div>
    </div>
  );
}

export default function StationDetailPanel({ station, forecast, isLoadingForecast, trendDelta }) {
  if (!station) {
    return (
      <Card padding="p-7" hover={false}>
        <Skeleton className="h-4 w-32 mb-6" />
        <Skeleton className="h-[140px] w-full mb-6" />
        <Skeleton className="h-3 w-full mb-2" />
        <Skeleton className="h-3 w-full mb-2" />
        <Skeleton className="h-3 w-2/3" />
      </Card>
    );
  }

  const cat = categoryFor(station.aqi);

  return (
    <Card padding="p-7" hover={false}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10.5px] tracking-[.1em] text-muted-3 uppercase">Selected station</div>
          <h3 className="font-display text-[22px] text-ink mt-1">{station.station}</h3>
        </div>
        <span
          className="text-[12px] font-medium px-2.5 py-1 rounded-[7px] shrink-0"
          style={{ background: cat.bg, color: cat.color }}
        >
          {cat.label}
        </span>
      </div>

      <div className="flex items-center justify-center gap-2.5 mt-3">
        <RiskBadge level={riskLevel(station.aqi)} />
        {trendDelta !== undefined && (
          <span className="flex items-center gap-1.5 text-[12px] text-muted-3">
            since last snapshot
            <TrendIndicator delta={trendDelta} threshold={1} />
          </span>
        )}
      </div>

      <div className="flex justify-center py-4">
        <AQIGauge value={station.aqi} size={190} />
      </div>

      {station.attribution?.length > 0 && (
        <div className="flex flex-col gap-3.5 border-t border-border-divider mt-1 pt-4">
          <div className="font-mono text-[10.5px] tracking-[.08em] text-muted-3 uppercase">Contributing sources</div>
          {station.attribution.map((a) => {
            const meta = sourceMeta(a.source_type);
            return (
              <ConfidenceBar key={a.source_type} label={meta.label} value={a.confidence} tone={meta.tone} />
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 mt-5 pt-4 border-t border-border-divider">
        {isLoadingForecast ? (
          <>
            <ForecastCell label="NEXT 24H" horizon={null} />
            <ForecastCell label="NEXT 72H" horizon={null} />
          </>
        ) : forecast ? (
          <>
            <ForecastCell label="NEXT 24H" horizon={forecast.forecast_24h} currentAqi={station.aqi} />
            <ForecastCell label="NEXT 72H" horizon={forecast.forecast_72h} currentAqi={station.aqi} />
          </>
        ) : (
          <div className="col-span-2 text-[12.5px] text-muted-3">No forecast available for this station yet.</div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-5">
        <LinkButton
          to={`/attribution?station=${encodeURIComponent(station.station)}`}
          variant="ghost"
          size="sm"
          icon={<ArrowRight size={13} />}
        >
          Full attribution
        </LinkButton>
        <LinkButton
          to={`/forecast?station=${encodeURIComponent(station.station)}`}
          variant="ghost"
          size="sm"
          icon={<ArrowRight size={13} />}
        >
          Forecast trend
        </LinkButton>
        <LinkButton
          to={`/simulate?station=${encodeURIComponent(station.station)}`}
          variant="primary"
          size="sm"
          icon={<FlaskConical size={13} className="text-panel-accent" />}
        >
          Simulate
        </LinkButton>
      </div>
    </Card>
  );
}
