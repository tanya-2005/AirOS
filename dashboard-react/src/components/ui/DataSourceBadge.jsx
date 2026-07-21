import Badge from "./Badge";
import { formatRelativeTime } from "../../lib/incidents";

// Every backend envelope is tagged live_pipeline | cached_run | empty | synthetic
// (see backend/schemas.py). This renders that honestly instead of presenting
// every number the same way regardless of freshness.
const COPY = {
  live_pipeline: { label: "Live pipeline", tone: "success" },
  cached_run: { label: "Cached run", tone: "warning" },
  synthetic: { label: "Simulated registry", tone: "muted" },
  empty: { label: "No data yet", tone: "danger" },
};

/** `updatedAt` (a react-query `dataUpdatedAt` ms timestamp) is optional — when passed, appends real recency ("· 4m ago") so a page communicates when its numbers last changed, not just what kind of source they came from. */
export default function DataSourceBadge({ source, updatedAt, className }) {
  const copy = COPY[source] || COPY.empty;
  return (
    <Badge tone={copy.tone} className={className}>
      {copy.label}
      {updatedAt ? ` · ${formatRelativeTime(new Date(updatedAt).toISOString())}` : ""}
    </Badge>
  );
}
