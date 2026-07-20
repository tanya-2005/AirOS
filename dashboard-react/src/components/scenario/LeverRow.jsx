import { HardHat, Truck, Factory, Wind, Droplets, Flame, Bus } from "lucide-react";
import { LEVER_META } from "../../lib/scenario";
import { cn } from "../../lib/utils/cn";

const ICONS = {
  construction: HardHat,
  heavy_vehicle: Truck,
  industrial: Factory,
  street_cleaning: Wind,
  water_spray: Droplets,
  waste_enforce: Flame,
  public_transport: Bus,
};

const TONE_CLASSES = {
  danger: "bg-danger-bg text-danger",
  warning: "bg-warning-bg text-warning",
  neutral: "bg-neutralchip-bg2 text-neutralchip-text2",
  accent: "bg-accent-tint text-accent",
  success: "bg-success-bg text-success",
};

export default function LeverRow({ leverKey, value, onChange, last = false }) {
  const meta = LEVER_META[leverKey];
  const Icon = ICONS[leverKey];

  return (
    <div className={cn("py-[22px]", !last && "border-b border-border-divider")}>
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-[11px]">
          <div className={cn("w-8 h-8 rounded-chip flex items-center justify-center", TONE_CLASSES[meta.iconTone])}>
            <Icon size={16} strokeWidth={1.8} />
          </div>
          <span className="text-[15px] font-medium text-ink">{meta.label}</span>
        </div>
        <span className="font-mono text-[14px] font-medium text-ink tabular-nums">{meta.format(value)}</span>
      </div>
      <input
        type="range"
        className="lever"
        min={0}
        max={100}
        value={value}
        style={{ "--fill": `${value}%` }}
        onChange={(e) => onChange(leverKey, Number(e.target.value))}
        aria-label={meta.label}
      />
      <div className="flex justify-between font-mono text-[10px] text-muted-5 mt-2">
        <span>{meta.minLabel}</span>
        <span>{meta.maxLabel}</span>
      </div>
    </div>
  );
}
