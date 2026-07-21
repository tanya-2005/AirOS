import Card from "./Card";
import LinkButton from "./LinkButton";
import { cn } from "../../lib/utils/cn";

const TONE_CHIP = {
  muted: "bg-search text-muted-3",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
};

/**
 * Shared "no data yet" card — every page's QueryState empty branch rendered
 * the same title+description card inline before this was extracted; this is
 * that one definition instead of five near-identical copies. `icon` gives
 * it a visual anchor instead of a blank white card that reads as broken;
 * `action` (optional {label, to}) turns a passive "nothing here" message
 * into a link to the one place that would actually fix it, where one
 * exists — most empty states here are "run the pipeline," which has no
 * in-app action, so this stays optional rather than forced everywhere.
 */
export default function EmptyState({ title, description, icon, tone = "muted", action, className }) {
  return (
    <Card padding="p-9" hover={false} className={cn("mt-10 text-center flex flex-col items-center", className)}>
      {icon && (
        <div className={cn("w-11 h-11 rounded-full flex items-center justify-center mb-4", TONE_CHIP[tone] || TONE_CHIP.muted)}>
          {icon}
        </div>
      )}
      <div className="font-display text-[22px] text-ink">{title}</div>
      {description && <p className="text-[14px] text-muted-2 mt-2 max-w-[480px] mx-auto">{description}</p>}
      {action && (
        <LinkButton to={action.to} variant="primary" size="sm" className="mt-5">
          {action.label}
        </LinkButton>
      )}
    </Card>
  );
}
