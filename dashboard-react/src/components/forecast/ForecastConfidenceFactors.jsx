import { TrendingUp, TrendingDown } from "lucide-react";
import Card from "../ui/Card";

/**
 * Factors Increasing/Reducing Confidence — renders
 * forecast_agent.forecast_station()'s own confidence_factors list, the
 * same explainability treatment as WeatherEffectsList's weather_effects
 * but for WHY the confidence number is what it is, generated from the
 * exact data_completeness/horizon_penalty numbers the confidence formula
 * itself just used (see agents/forecast_agent.py). Never a separate
 * narrative layered on top.
 */
export default function ForecastConfidenceFactors({ factors, confidence }) {
  if (!factors?.length) return null;
  const increasing = factors.filter((f) => f.direction === "increases");
  const reducing = factors.filter((f) => f.direction === "reduces");

  return (
    <Card padding="p-6" hover={false}>
      <div className="flex items-center justify-between mb-3.5">
        <div className="font-mono text-[10.5px] tracking-[.1em] text-muted-3 uppercase">
          Why {Math.round((confidence ?? 0) * 100)}% confidence
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-success mb-2">
            <TrendingUp size={12} strokeWidth={2} /> Increases confidence
          </div>
          {increasing.length ? (
            <ul className="flex flex-col gap-2">
              {increasing.map((f, i) => (
                <li key={i} className="text-[13px] text-ink leading-[1.5] flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-success mt-[6px] shrink-0" />
                  {f.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12.5px] text-muted-3">None currently.</p>
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-danger mb-2">
            <TrendingDown size={12} strokeWidth={2} /> Reduces confidence
          </div>
          {reducing.length ? (
            <ul className="flex flex-col gap-2">
              {reducing.map((f, i) => (
                <li key={i} className="text-[13px] text-ink leading-[1.5] flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-danger mt-[6px] shrink-0" />
                  {f.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12.5px] text-muted-3">None currently.</p>
          )}
        </div>
      </div>
    </Card>
  );
}
