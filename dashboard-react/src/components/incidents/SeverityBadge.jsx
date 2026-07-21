import Badge from "../ui/Badge";
import { SEVERITY_TONE } from "../../lib/incidents";

/** Same Low/Medium/High/Critical vocabulary and tone map as ui/RiskBadge (see lib/incidents.js), just without the " risk" suffix — this badge sits directly next to a "Severity" label, RiskBadge doesn't. */
export default function SeverityBadge({ level, className }) {
  return (
    <Badge tone={SEVERITY_TONE[level] || "muted"} className={className}>
      {level}
    </Badge>
  );
}
