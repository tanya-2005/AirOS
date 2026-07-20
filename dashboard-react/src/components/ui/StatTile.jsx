import Card from "./Card";
import AnimatedNumber from "./AnimatedNumber";
import { cn } from "../../lib/utils/cn";

/**
 * Benefit-strip stat tile — icon, animated big serif number, muted label.
 * Mirrors the "06 · EXPECTED BENEFITS" tiles from the Scenario Lab export.
 */
export default function StatTile({ icon, value, decimals = 0, prefix, suffix, label, className }) {
  return (
    <Card padding="p-6" className={cn("flex flex-col", className)}>
      {icon}
      <div className="font-display text-[40px] leading-none text-ink mt-3.5 tabular-nums">
        <AnimatedNumber value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
      </div>
      <div className="text-[13px] text-muted-1 mt-1.5">{label}</div>
    </Card>
  );
}
