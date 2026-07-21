import Badge from "../ui/Badge";
import { EMERGENCY_TONE } from "../../lib/healthAdvisory";

export default function EmergencyLevelBadge({ level, className }) {
  return (
    <Badge tone={EMERGENCY_TONE[level] || "muted"} className={className}>
      {level}
    </Badge>
  );
}
