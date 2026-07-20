import Card from "./Card";
import { cn } from "../../lib/utils/cn";

/**
 * Shared "no data yet" card — every page's QueryState empty branch rendered
 * the same title+description card inline before this was extracted; this is
 * that one definition instead of five near-identical copies.
 */
export default function EmptyState({ title, description, className }) {
  return (
    <Card padding="p-9" hover={false} className={cn("mt-10 text-center", className)}>
      <div className="font-display text-[22px] text-ink">{title}</div>
      {description && <p className="text-[14px] text-muted-2 mt-2 max-w-[480px] mx-auto">{description}</p>}
    </Card>
  );
}
