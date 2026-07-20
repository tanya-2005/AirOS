import { Construction, Fuel, Factory, Flame, Route, HelpCircle } from "lucide-react";

// Registry source_type -> display metadata, shared by every page that
// renders attribution/evidence/enforcement data (Command Center, Attribution,
// Scenario Lab evidence). Keeps the label/tone/icon mapping in one place
// instead of re-deriving it per page.
export const SOURCE_META = {
  construction_site: { label: "Construction site", tone: "warning", Icon: Construction },
  diesel_generator_cluster: { label: "Diesel generator cluster", tone: "hazard", Icon: Fuel },
  industrial_stack: { label: "Industrial stack", tone: "danger", Icon: Factory },
  waste_burning_zone: { label: "Waste burning zone", tone: "hazard", Icon: Flame },
  // Milestone 3 — real OSM highway data, addresses this project's own
  // long-documented gap ("traffic isn't its own attribution source").
  traffic_corridor: { label: "Traffic corridor", tone: "accent", Icon: Route },
};

export function sourceMeta(type) {
  return (
    SOURCE_META[type] || {
      label: type ? type.replace(/_/g, " ") : "Unknown source",
      tone: "muted",
      Icon: HelpCircle,
    }
  );
}

export const PERMIT_TONE = {
  valid: "success",
  expired: "warning",
  unregistered: "danger",
  // Milestone 3 — real OSM-sourced records genuinely don't have permit
  // data (we didn't check, unlike the synthetic registry which invents
  // one) — "unknown" says that honestly instead of implying "unregistered".
  unknown: "muted",
};

// Milestone 3 — real OSM records vs. the original synthetic registry,
// shown as a small badge in RegistryBrowser so real/fallback data is never
// presented identically.
export const RECORD_SOURCE_LABEL = {
  openstreetmap: "OpenStreetMap",
  synthetic_fallback: "Synthetic (fallback)",
  synthetic: "Synthetic",
};
