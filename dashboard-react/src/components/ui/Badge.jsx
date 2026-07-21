import { cn } from "../../lib/utils/cn";

const TONES = {
  muted: "bg-search text-muted-2 border-border",
  accent: "bg-accent-tint text-accent border-accent/30",
  success: "bg-success-bg text-success border-success/30",
  warning: "bg-warning-bg text-warning border-warning/30",
  danger: "bg-danger-bg text-danger border-danger/30",
  hazard: "bg-hazard-bg text-hazard border-hazard/30",
  // Solid, not outlined — one tier more alarming than "hazard" for the
  // Health Advisory Engine's top Emergency Level, so it reads as visually
  // distinct at a glance (see components/health/EmergencyLevelBadge.jsx).
  emergency: "bg-hazard text-white border-hazard",
};

export default function Badge({ tone = "muted", children, className, mono = true }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border",
        mono && "font-mono uppercase tracking-wider",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
