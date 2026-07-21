import { ShieldCheck, Trophy, AlertOctagon, Lightbulb } from "lucide-react";
import SectionHeading from "../ui/SectionHeading";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import { CONFIDENCE_BAND_TONE } from "../../lib/validation";

/**
 * Report page's AI Validation section — Forecast Accuracy Summary,
 * Most/Least Accurate Cities, Model Confidence Distribution, Key Learnings.
 * Reuses backend/pipeline.py::get_validation_report (the same cross-city
 * backtest the AI Validation & Performance page's data comes from), not a
 * separate calculation for the report.
 */
export default function AIValidationSection({ report }) {
  if (!report) return null;
  const { per_city, most_accurate_city, least_accurate_city, confidence_distribution, key_learnings } = report;

  if (!per_city?.length) {
    return (
      <section className="mt-16 print:break-inside-avoid">
        <SectionHeading eyebrow="TRUST & RELIABILITY" title="Forecast accuracy across cities" className="mb-6" />
        <Card padding="p-7" hover={false} className="text-center text-[13.5px] text-muted-2">
          No city has enough logged AQI history yet to backtest forecast accuracy — this section fills in as
          ingestion keeps running.
        </Card>
      </section>
    );
  }

  return (
    <section className="mt-16 print:break-inside-avoid">
      <SectionHeading
        eyebrow="TRUST & RELIABILITY"
        title="Forecast accuracy across cities"
        description="Backtested against real logged AQI history, not asserted — see the Trust & Reliability page for the full methodology."
        className="mb-6"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {most_accurate_city && (
          <Card padding="p-6" hover={false}>
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-success" strokeWidth={1.8} />
              <span className="font-mono text-[10.5px] tracking-[.08em] text-muted-3 uppercase">Most accurate city</span>
            </div>
            <div className="font-display text-[24px] text-ink mt-2.5">{most_accurate_city.label}</div>
            <div className="text-[13px] text-muted-2 mt-1">
              MAE {most_accurate_city.metrics.mae} AQI points · {most_accurate_city.metrics.sample_size} validated predictions
            </div>
          </Card>
        )}
        {least_accurate_city && least_accurate_city.city !== most_accurate_city?.city && (
          <Card padding="p-6" hover={false}>
            <div className="flex items-center gap-2">
              <AlertOctagon size={16} className="text-danger" strokeWidth={1.8} />
              <span className="font-mono text-[10.5px] tracking-[.08em] text-muted-3 uppercase">Least accurate city</span>
            </div>
            <div className="font-display text-[24px] text-ink mt-2.5">{least_accurate_city.label}</div>
            <div className="text-[13px] text-muted-2 mt-1">
              MAE {least_accurate_city.metrics.mae} AQI points · {least_accurate_city.metrics.sample_size} validated predictions
            </div>
          </Card>
        )}
      </div>

      <Card padding="p-6" hover={false} className="mt-5">
        <div className="flex items-center gap-2 mb-3.5">
          <ShieldCheck size={15} className="text-accent" strokeWidth={1.8} />
          <span className="font-mono text-[10.5px] tracking-[.08em] text-muted-3 uppercase">Model confidence distribution, by city</span>
        </div>
        <div className="flex flex-col gap-2">
          {confidence_distribution.map((c) => (
            <div key={c.city} className="flex items-center justify-between gap-3 text-[13.5px]">
              <span className="text-ink">{c.label}</span>
              <Badge tone={c.avg_confidence >= 0.6 ? CONFIDENCE_BAND_TONE.High : c.avg_confidence >= 0.35 ? CONFIDENCE_BAND_TONE.Medium : CONFIDENCE_BAND_TONE.Low}>
                {Math.round(c.avg_confidence * 100)}% avg. confidence
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card padding="p-6" hover={false} className="mt-5">
        <div className="flex items-center gap-2 mb-3.5">
          <Lightbulb size={15} className="text-accent" strokeWidth={1.8} />
          <span className="font-mono text-[10.5px] tracking-[.08em] text-muted-3 uppercase">Key learnings</span>
        </div>
        <ul className="flex flex-col gap-2">
          {key_learnings.map((l, i) => (
            <li key={i} className="text-[13.5px] text-ink leading-[1.6] flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-[7px] shrink-0" />
              {l}
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
