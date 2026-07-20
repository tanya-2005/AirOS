import Card from "./Card";
import { cn } from "../../lib/utils/cn";

/** Same visual footprint as StatTile, for insights whose value is a short label rather than a number (e.g. "Top pollution driver: Industrial stack") — StatTile always animates a number via AnimatedNumber, which doesn't apply here. */
export default function InsightTile({ icon, value, label, className }) {
  return (
    <Card padding="p-6" className={cn("flex flex-col", className)}>
      {icon}
      <div className="font-display text-[22px] leading-tight text-ink mt-3.5 line-clamp-1">{value}</div>
      <div className="text-[13px] text-muted-1 mt-1.5">{label}</div>
    </Card>
  );
}
