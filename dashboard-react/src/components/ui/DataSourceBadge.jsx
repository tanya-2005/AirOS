import Badge from "./Badge";

// Every backend envelope is tagged live_pipeline | cached_run | empty | synthetic
// (see backend/schemas.py). This renders that honestly instead of presenting
// every number the same way regardless of freshness.
const COPY = {
  live_pipeline: { label: "Live pipeline", tone: "success" },
  cached_run: { label: "Cached run", tone: "warning" },
  synthetic: { label: "Simulated registry", tone: "muted" },
  empty: { label: "No data yet", tone: "danger" },
};

export default function DataSourceBadge({ source, className }) {
  const copy = COPY[source] || COPY.empty;
  return (
    <Badge tone={copy.tone} className={className}>
      {copy.label}
    </Badge>
  );
}
