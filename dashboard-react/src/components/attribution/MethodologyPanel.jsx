import { FlaskConical } from "lucide-react";
import Card from "../ui/Card";
import { sourceMeta } from "../../lib/sources";

// Mirrors agents/attribution_agent.py's RADIUS_KM / SOURCE_WEIGHTS constants
// verbatim — this is documentation of the real scoring model, not a
// separate guess. Update both places together if the model changes.
const RADIUS_KM = 3.0;
const SOURCE_WEIGHTS = {
  industrial_stack: 1.6,
  waste_burning_zone: 1.3,
  construction_site: 1.0,
  diesel_generator_cluster: 0.9,
};

export default function MethodologyPanel() {
  return (
    <Card dark hover={false} padding="p-9">
      <div className="flex items-center gap-2.5">
        <FlaskConical size={18} className="text-panel-accent" strokeWidth={1.6} />
        <span className="font-mono text-[11px] tracking-[.08em] text-panel-muted">HOW THIS IS COMPUTED</span>
      </div>
      <h3 className="font-display text-[26px] leading-[1.2] mt-4 text-white max-w-[640px]">
        Auditable math, not a black box — every confidence score traces back to a formula you can check.
      </h3>
      <p className="text-[15px] leading-[1.6] text-[#9AA5AA] mt-4 max-w-[680px]">
        For each station, every registry source within <strong className="text-white font-medium">{RADIUS_KM}km</strong> contributes{" "}
        <span className="font-mono text-panel-accent">weight × proximity_decay(distance) × active_bonus</span>. Scores per
        source type are summed, then normalized into the confidence shares shown alongside each station — a statistical
        share, not a certainty. Closer and currently-active sources count for more; sources beyond {RADIUS_KM}km aren't
        considered at all.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-6">
        {Object.entries(SOURCE_WEIGHTS).map(([type, weight]) => {
          const meta = sourceMeta(type);
          const Icon = meta.Icon;
          return (
            <div key={type} className="bg-panel-nested rounded-xl px-4 py-3.5">
              <Icon size={15} className="text-panel-accent" strokeWidth={1.8} />
              <div className="text-[12.5px] text-[#D8DADE] mt-2 leading-tight">{meta.label}</div>
              <div className="font-mono text-[18px] text-white mt-1">×{weight.toFixed(1)}</div>
              <div className="text-[10px] text-panel-muted mt-0.5">emission weight</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
