import { History, ArrowRight, GraduationCap } from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import { categoryFor } from "../../lib/aqi";

/**
 * Prediction at Incident Creation vs. Actual Conditions vs. Prediction
 * Error vs. Lessons Learned — backend/pipeline.py::get_incident_prediction_review.
 * `review` is null while loading; `review.actual_conditions` is null when
 * the 24h forecast horizon hasn't elapsed yet or no ingestion run has
 * logged the station since — rendered as an honest pending state, not a
 * guessed error.
 */
export default function IncidentPredictionReview({ review, isLoading }) {
  if (isLoading) return null;
  if (!review) return null;

  const { prediction_at_creation, actual_conditions, prediction_error, lessons_learned } = review;
  const predictedCat = categoryFor(prediction_at_creation.forecast_24h_aqi ?? prediction_at_creation.aqi);

  return (
    <Card padding="p-7" hover={false}>
      <div className="flex items-center gap-2">
        <History size={16} className="text-accent" strokeWidth={1.8} />
        <span className="font-mono text-[10.5px] tracking-[.1em] text-muted-3 uppercase">Prediction review</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-5">
        <div>
          <div className="font-mono text-[10px] text-muted-3 uppercase">At creation</div>
          <div className="font-display text-[26px] text-ink mt-1">{Math.round(prediction_at_creation.aqi)}</div>
          <div className="text-[11.5px] text-muted-2 mt-0.5">Current AQI</div>
        </div>
        <div>
          <div className="font-mono text-[10px] text-muted-3 uppercase">24h forecast made then</div>
          <div className="font-display text-[26px] mt-1" style={{ color: predictedCat.color }}>
            {prediction_at_creation.forecast_24h_aqi != null ? Math.round(prediction_at_creation.forecast_24h_aqi) : "—"}
          </div>
          <div className="text-[11.5px] text-muted-2 mt-0.5">Predicted AQI</div>
        </div>
        <div>
          <div className="font-mono text-[10px] text-muted-3 uppercase">Actual conditions</div>
          <div className="font-display text-[26px] text-ink mt-1">
            {actual_conditions ? Math.round(actual_conditions.aqi) : "—"}
          </div>
          <div className="text-[11.5px] text-muted-2 mt-0.5">
            {actual_conditions ? `Logged ${new Date(actual_conditions.fetched_at).toLocaleString()}` : "Not yet available"}
          </div>
        </div>
      </div>

      {prediction_error && (
        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border-divider flex-wrap">
          <Badge tone={prediction_error.absolute_error <= 15 ? "success" : prediction_error.absolute_error <= 40 ? "warning" : "danger"}>
            {prediction_error.absolute_error} AQI pts off ({prediction_error.direction})
          </Badge>
          {prediction_error.pct_error != null && (
            <span className="text-[12px] font-mono text-muted-2">{prediction_error.pct_error}% error</span>
          )}
        </div>
      )}

      <div className="flex items-start gap-2.5 mt-4 pt-4 border-t border-border-divider text-[13px] text-ink leading-[1.6]">
        <GraduationCap size={15} className="text-accent shrink-0 mt-0.5" strokeWidth={1.8} />
        <div>
          <span className="font-medium">Lessons learned: </span>
          {lessons_learned}
        </div>
      </div>

      {!actual_conditions && (
        <div className="flex items-center gap-1.5 mt-3 text-[11.5px] text-muted-3">
          <ArrowRight size={11} /> This section fills in automatically once ingestion logs data past the 24h mark.
        </div>
      )}
    </Card>
  );
}
