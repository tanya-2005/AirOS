import Badge from "../ui/Badge";
import { PRIORITY_TONE } from "../../lib/incidents";

export default function PriorityBadge({ level, className }) {
  return (
    <Badge tone={PRIORITY_TONE[level] || "muted"} className={className}>
      {level}
    </Badge>
  );
}
