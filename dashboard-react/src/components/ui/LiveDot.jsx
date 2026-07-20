import { cn } from "../../lib/utils/cn";

/** Small pulsing dot + optional label — signals "this is live, not static" throughout the app. */
export default function LiveDot({ label, tone = "accent", fast = false, className }) {
  const dotTone = { accent: "bg-accent", panelAccent: "bg-panel-accent", success: "bg-success" }[tone];
  const textTone = { accent: "text-muted-1", panelAccent: "text-panel-accent", success: "text-success" }[tone];
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn("w-[6px] h-[6px] rounded-full", dotTone, fast ? "animate-livedotFast" : "animate-livedot")} />
      {label && <span className={cn("font-mono text-[11px] uppercase tracking-wider", textTone)}>{label}</span>}
    </div>
  );
}
