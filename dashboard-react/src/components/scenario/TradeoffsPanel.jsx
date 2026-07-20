import SectionHeading from "../ui/SectionHeading";
import Card from "../ui/Card";
import AnimatedNumber from "../ui/AnimatedNumber";

function Cell({ label, value, note, last = false }) {
  return (
    <div className={`p-6 ${!last ? "border-r border-border-divider" : ""}`}>
      <div className="font-mono text-[11px] tracking-[.06em] text-muted-3">{label}</div>
      <div className="font-display text-[30px] text-ink mt-3">{value}</div>
      <div className="text-[12.5px] text-muted-4 mt-1">{note}</div>
    </div>
  );
}

export default function TradeoffsPanel({ costCr, timeToImprove, resources, confidence, difficulty, difficultyNote, hasReduction }) {
  return (
    <section className="mt-16">
      <SectionHeading eyebrow="07 · TRADE-OFFS" title="Every decision has a cost" />
      <Card padding="p-0 md:px-2" className="mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          <Cell label="DAILY COST" value={<>₹<AnimatedNumber value={costCr} />L</>} note="operating estimate" />
          <Cell label="TIME TO EFFECT" value={hasReduction ? `${timeToImprove}h` : "—"} note="until AQI responds" />
          <Cell label="RESOURCES" value={<AnimatedNumber value={resources} />} note="field teams needed" />
          <Cell label="CONFIDENCE" value={<><AnimatedNumber value={confidence} />%</>} note="in this outcome" />
          <Cell label="DIFFICULTY" value={difficulty} note={difficultyNote} last />
        </div>
      </Card>
    </section>
  );
}
