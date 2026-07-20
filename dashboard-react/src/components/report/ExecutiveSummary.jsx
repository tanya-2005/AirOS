import { Sparkles } from "lucide-react";
import Card from "../ui/Card";
import AnimatedNumber from "../ui/AnimatedNumber";

function Stat({ label, value, accent = false }) {
  return (
    <div className="bg-panel-nested rounded-[12px] p-4">
      <div className="font-mono text-[10px] text-panel-muted uppercase tracking-wide">{label}</div>
      <div className={`font-display text-[26px] mt-1.5 ${accent ? "text-panel-accent" : "text-white"}`}>{value}</div>
    </div>
  );
}

export default function ExecutiveSummary({ summary }) {
  if (!summary) return null;
  const { avgAqi, avgCategory, worst, worstCategory, topSource, direction, activeGaps, stationCount } = summary;

  const directionText =
    direction === "worsen"
      ? "expected to worsen over the next 24 hours"
      : direction === "improve"
        ? "expected to ease over the next 24 hours"
        : "expected to hold roughly steady over the next 24 hours";

  return (
    <Card dark hover={false} padding="p-9">
      <div className="flex items-center gap-2.5">
        <Sparkles size={18} className="text-panel-accent" strokeWidth={1.6} />
        <span className="font-mono text-[11px] tracking-[.08em] text-panel-muted">EXECUTIVE SUMMARY</span>
      </div>
      <p className="font-display text-[24px] md:text-[28px] leading-[1.35] mt-4 text-white max-w-[820px]">
        Across {stationCount} monitored stations, the city averages AQI{" "}
        <span className="text-panel-accent">{avgAqi}</span> ({avgCategory.label.toLowerCase()}), with{" "}
        <strong className="font-medium">{worst.station}</strong> the most severe at {Math.round(worst.aqi)} (
        {worstCategory.label.toLowerCase()}). {topSource && (
          <>
            The single largest attributed contributor city-wide is{" "}
            <strong className="font-medium">{topSource.label.toLowerCase()}</strong>.{" "}
          </>
        )}
        Air quality is {directionText}, and {activeGaps} enforcement gap{activeGaps === 1 ? "" : "s"} against
        active, unaddressed sources remain queued for action.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-7">
        <Stat label="City average AQI" value={<AnimatedNumber value={avgAqi} />} accent />
        <Stat label="Peak severity" value={<AnimatedNumber value={Math.round(worst.aqi)} />} />
        <Stat label="Stations tracked" value={stationCount} />
        <Stat label="Active enforcement gaps" value={activeGaps} />
      </div>
    </Card>
  );
}
