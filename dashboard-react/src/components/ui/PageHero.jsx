import { motion } from "framer-motion";
import LiveDot from "./LiveDot";
import LinkButton from "./LinkButton";
import Button from "./Button";
import AnimatedNumber from "./AnimatedNumber";
import { fadeUp } from "../../lib/motion";
import { cn } from "../../lib/utils/cn";

/**
 * The one hero pattern every major page shares — replaces the old
 * per-page "LiveDot + h1 + 2-3 sentence paragraph + icon box" block that
 * was hand-duplicated across a dozen pages with slightly different
 * spacing each time. Consistency here is the point: a Pollution Control
 * Board officer should be able to jump from Forecast to Incidents to AI
 * Validation and already know where the headline number, the KPIs, and
 * the one thing to do next all live.
 *
 * kpis: 2-4 {icon, label, value, decimals?, prefix?, suffix?, tone?} — tone
 * colors the value text (danger/warning/success/accent/ink), value can be
 * a number (animates) or a string/node (renders as-is, e.g. a badge).
 * primaryAction: {label, to, icon} for a plain navigation, or {label, onClick,
 * icon} for one that needs to change app state first (e.g. switch the
 * selected city) before navigating — the ONE call to action for this page.
 * icon/mood: the page-identity chip — a small colored icon badge next to
 * the title so Forecast, Incidents, Citizen Advisory etc. read as
 * distinct "rooms" in the same building rather than identical templates,
 * without touching layout, spacing, or the KPI grid those pages share.
 */
export default function PageHero({ liveLabel, title, tagline, kpis = [], primaryAction, secondarySlot, extra, className, icon, mood = "ink" }) {
  return (
    <motion.section initial="hidden" animate="show" variants={fadeUp} className={cn("pt-12 pb-2", className)}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4 min-w-0">
          {icon && (
            <div className={cn("shrink-0 w-11 h-11 rounded-[12px] flex items-center justify-center mt-1", MOOD_CHIP[mood] || MOOD_CHIP.ink)}>
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <LiveDot label={liveLabel} />
            <h1 className="font-display font-normal text-[40px] md:text-[56px] leading-[1.02] tracking-[-.02em] mt-3 text-ink">
              {title}
            </h1>
            {tagline && <p className="text-[15px] text-muted-1 mt-2.5 max-w-[560px] leading-[1.5]">{tagline}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2.5 mt-2 print:hidden shrink-0">
          {secondarySlot}
          {primaryAction &&
            (primaryAction.onClick ? (
              <Button variant="primary" size="md" icon={primaryAction.icon} onClick={primaryAction.onClick}>
                {primaryAction.label}
              </Button>
            ) : (
              <LinkButton to={primaryAction.to} variant="primary" size="md" icon={primaryAction.icon}>
                {primaryAction.label}
              </LinkButton>
            ))}
        </div>
      </div>

      {kpis.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-card overflow-hidden border border-border mt-7">
          {kpis.map((kpi, i) => (
            <div key={i} className="bg-surface px-5 py-4 flex flex-col gap-1.5 min-w-0">
              <div className="flex items-center gap-1.5 text-muted-3">
                {kpi.icon}
                <span className="font-mono text-[10.5px] uppercase tracking-wider truncate">{kpi.label}</span>
              </div>
              <div
                className={cn(
                  "font-display text-[30px] md:text-[34px] leading-none tabular-nums truncate",
                  !kpi.color && (TONE_TEXT[kpi.tone] || "text-ink")
                )}
                style={kpi.color ? { color: kpi.color } : undefined}
              >
                {typeof kpi.value === "number" ? (
                  <AnimatedNumber value={kpi.value} decimals={kpi.decimals ?? 0} prefix={kpi.prefix} suffix={kpi.suffix} />
                ) : (
                  kpi.value
                )}
              </div>
              {kpi.sub && <div className="text-[11.5px] text-muted-3 truncate">{kpi.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {extra && <div className="mt-4">{extra}</div>}
    </motion.section>
  );
}

const TONE_TEXT = {
  danger: "text-danger",
  warning: "text-warning",
  success: "text-success",
  hazard: "text-hazard",
  emergency: "text-hazard",
  accent: "text-accent",
  ink: "text-ink",
};

const MOOD_CHIP = {
  ink: "bg-ink text-panel-accent",
  danger: "bg-danger-bg text-danger",
  warning: "bg-warning-bg text-warning",
  success: "bg-success-bg text-success",
  hazard: "bg-hazard-bg text-hazard",
  accent: "bg-accent-tint text-accent",
};
