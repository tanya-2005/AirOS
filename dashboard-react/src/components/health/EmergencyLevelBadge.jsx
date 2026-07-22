import Badge from "../ui/Badge";
import { EMERGENCY_TONE } from "../../lib/healthAdvisory";

/** `displayLabel` (e.g. a translated severity word) overrides what text renders, but tone always keys off the untranslated English `level` — the enum stays the one thing every language agrees on internally. */
export default function EmergencyLevelBadge({ level, displayLabel, className }) {
  return (
    <Badge tone={EMERGENCY_TONE[level] || "muted"} className={className}>
      {displayLabel || level}
    </Badge>
  );
}
