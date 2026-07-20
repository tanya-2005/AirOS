import { Sparkles } from "lucide-react";
import Card from "../ui/Card";

/** Renders forecast_agent's own weather_effects strings — generated from the same numbers as the prediction, never a separate narrative. */
export default function WeatherEffectsList({ effects }) {
  if (!effects?.length) return null;

  return (
    <Card padding="p-6" hover={false}>
      <div className="flex items-center gap-2 mb-3.5">
        <Sparkles size={15} className="text-accent" strokeWidth={1.8} />
        <div className="font-mono text-[10.5px] tracking-[.1em] text-muted-3 uppercase">
          Why this forecast
        </div>
      </div>
      <ul className="flex flex-col gap-2.5">
        {effects.map((effect, i) => (
          <li key={i} className="text-[13.5px] text-ink leading-[1.5] flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent mt-[7px] shrink-0" />
            {effect}
          </li>
        ))}
      </ul>
    </Card>
  );
}
