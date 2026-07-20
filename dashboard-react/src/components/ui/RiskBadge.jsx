import Badge from "./Badge";
import { RISK_TONE } from "../../lib/decision";

/** AQI category relabeled as a risk level (Low/Medium/High/Critical) for the Command Center's narrative framing — same CPCB bands, different vocabulary for a decision-maker audience. */
export default function RiskBadge({ level, className }) {
  return (
    <Badge tone={RISK_TONE[level] || "muted"} className={className}>
      {level} risk
    </Badge>
  );
}
