import { Sparkles } from "lucide-react";
import Card from "../ui/Card";
import SectionHeading from "../ui/SectionHeading";
import { buildInvestigation } from "../../lib/incidents";

const SECTIONS = [
  { key: "why", label: "Why was this incident created?" },
  { key: "evidence", label: "Evidence supporting the conclusion" },
  { key: "dominantSources", label: "Dominant pollution sources" },
  { key: "weatherContribution", label: "Weather contribution" },
  { key: "forecastRisk", label: "Forecast risk" },
  { key: "confidence", label: "Confidence" },
  { key: "inspectionArea", label: "Recommended inspection area" },
];

/** Deterministic structured investigation — see lib/incidents.js::buildInvestigation. Every value here quotes a real field from live attribution/forecast/weather data already fetched by the detail page; nothing is generated separately. */
export default function AIInvestigationPanel({ incident, station, forecast, weather }) {
  const investigation = buildInvestigation(incident, station, forecast, weather);
  return (
    <Card padding="p-7" hover={false}>
      <SectionHeading
        eyebrow="AI INVESTIGATION"
        title="Structured investigation"
        description="Deterministic — every line below quotes a real field from live attribution, forecast, and weather data, not a generated claim."
        className="mb-6"
      />
      <div className="flex flex-col gap-5">
        {SECTIONS.map((s) => (
          <div key={s.key}>
            <div className="font-mono text-[10.5px] tracking-[.08em] text-muted-3 uppercase flex items-center gap-1.5">
              <Sparkles size={11} className="text-accent shrink-0" /> {s.label}
            </div>
            <p className="text-[14px] text-ink leading-[1.6] mt-1.5">{investigation[s.key]}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
