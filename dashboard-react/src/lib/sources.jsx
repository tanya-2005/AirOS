import { Construction, Fuel, Factory, Flame, HelpCircle } from "lucide-react";

// Registry source_type -> display metadata, shared by every page that
// renders attribution/evidence/enforcement data (Command Center, Attribution,
// Scenario Lab evidence). Keeps the label/tone/icon mapping in one place
// instead of re-deriving it per page.
export const SOURCE_META = {
  construction_site: { label: "Construction site", tone: "warning", Icon: Construction },
  diesel_generator_cluster: { label: "Diesel generator cluster", tone: "hazard", Icon: Fuel },
  industrial_stack: { label: "Industrial stack", tone: "danger", Icon: Factory },
  waste_burning_zone: { label: "Waste burning zone", tone: "hazard", Icon: Flame },
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
};
