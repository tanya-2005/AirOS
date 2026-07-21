// Citizen Health Advisory — shared frontend types/utilities. Group keys and
// the emergency-level vocabulary here MUST match agents/health_advisory_agent.py
// exactly (GROUP_ORDER / EMERGENCY_LEVELS) since they key straight off the
// live API response — this file adds no computation the backend hasn't
// already done, except the two clearly-labeled Simulation "Model Estimate"
// functions at the bottom, which derive from the real /api/simulate result.
import { Users, Baby, Armchair, HeartPulse, Stethoscope, HardHat, GraduationCap, Building2, Siren, Construction } from "lucide-react";

export const EMERGENCY_LEVELS = ["Normal", "Moderate", "High", "Severe", "Emergency"];

export const EMERGENCY_TONE = {
  Normal: "success",
  Moderate: "warning",
  High: "danger",
  Severe: "hazard",
  Emergency: "emergency",
};

// Order matches agents/health_advisory_agent.py::GROUP_ORDER.
export const GROUP_META = {
  general_public: { label: "General Public", Icon: Users },
  children: { label: "Children", Icon: Baby },
  senior_citizens: { label: "Senior Citizens", Icon: Armchair },
  pregnant_women: { label: "Pregnant Women", Icon: HeartPulse },
  asthma_copd: { label: "People with Asthma/COPD", Icon: Stethoscope },
  outdoor_workers: { label: "Outdoor Workers", Icon: HardHat },
  schools: { label: "Schools", Icon: GraduationCap },
  hospitals: { label: "Hospitals", Icon: Building2 },
  traffic_police: { label: "Traffic Police", Icon: Siren },
  construction_workers: { label: "Construction Workers", Icon: Construction },
};

export const GROUP_ORDER = [
  "general_public", "children", "senior_citizens", "pregnant_women", "asthma_copd",
  "outdoor_workers", "schools", "hospitals", "traffic_police", "construction_workers",
];

export function groupMeta(key) {
  return GROUP_META[key] || { label: key, Icon: Users };
}

/** Group labels whose risk_level is strictly worse than the general public's — the Map's "Affected Population Groups" field. */
export function elevatedGroupLabels(advisories) {
  if (!advisories) return [];
  const baseIdx = EMERGENCY_LEVELS.indexOf(advisories.general_public?.risk_level);
  return GROUP_ORDER.filter((k) => k !== "general_public")
    .filter((k) => EMERGENCY_LEVELS.indexOf(advisories[k]?.risk_level) > baseIdx)
    .map((k) => advisories[k].group_label);
}

// ---- Simulation panel "Model Estimates" ----
// Everything below is derived client-side from the real, live
// /api/simulate result (current_aqi -> projected_aqi) — never a second
// backend call, and always explicitly labeled "Model Estimate" in the UI
// per the milestone's explicit requirement.

/** How many Emergency Level tiers a policy combination is projected to move the general public down. */
export function estimateHealthRiskImprovement(currentAqi, projectedAqi) {
  if (currentAqi == null || projectedAqi == null) return null;
  const levelFor = (aqi) => {
    if (aqi <= 100) return 0; // Normal
    if (aqi <= 200) return 1; // Moderate
    if (aqi <= 300) return 2; // High
    if (aqi <= 400) return 3; // Severe
    return 4; // Emergency
  };
  const before = levelFor(currentAqi);
  const after = levelFor(projectedAqi);
  return {
    beforeLevel: EMERGENCY_LEVELS[before],
    afterLevel: EMERGENCY_LEVELS[after],
    tiersImproved: Math.max(0, before - after),
  };
}

/** AQI reduction as a % of baseline — a disclosed proxy for population-wide exposure reduction, not a measured dose figure. */
export function estimateExposureReduction(currentAqi, projectedAqi) {
  if (!currentAqi) return 0;
  return Math.max(0, Math.round(((currentAqi - projectedAqi) / currentAqi) * 1000) / 10);
}

// Same disclosed density-proxy formula the pre-Phase-9 Impact Assessment
// panel already used inline (Milestone 5) — moved here so it's defined in
// exactly one place instead of duplicated across Scenario Lab and the new
// Health Advisory Simulation panel.
export function estimatePopulationBenefit(aqiReduced) {
  return Math.round(Math.max(0, aqiReduced ?? 0) * 12400);
}
