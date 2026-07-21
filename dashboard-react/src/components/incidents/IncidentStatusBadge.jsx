import Badge from "../ui/Badge";
import { STATUS_TONE } from "../../lib/incidents";

export default function IncidentStatusBadge({ status, className }) {
  return (
    <Badge tone={STATUS_TONE[status] || "muted"} className={className}>
      {status}
    </Badge>
  );
}
