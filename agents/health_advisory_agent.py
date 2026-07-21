"""
Health Advisory Engine
-----------------------
Deterministic, explainable citizen health guidance derived from live AQI +
forecast + attribution data — CPCB/WHO-style AQI action-guide language, no
LLM, no invented numbers. Every recommendation traces back to a real field
(current AQI, forecast trend, dominant attributed source) run through an
authored, disclosed rule table — the same "auditable math over black-box
precision" standard as attribution_agent.py's scoring model.

Decision logic, in order:
  1. category_for(aqi) (imported from incident_agent.py, not re-derived)
     maps AQI onto the CPCB Good..Severe scale.
  2. CATEGORY_TO_EMERGENCY collapses that onto a coarser, health-specific
     5-tier scale: Normal/Moderate/High/Severe/Emergency. This is a
     DIFFERENT vocabulary from incident_agent.py's own Low/Medium/High/
     Critical incident severity — deliberately: incident severity is about
     operational urgency for a PCB officer, this Emergency Level is about
     citizen health risk. Two legitimately different classifications for
     two different audiences, not a renamed duplicate of the other.
  3. Each of the 10 target groups (GROUPS below) applies a SENSITIVITY
     shift (0-2 tiers) on top of that general-public level, reflecting
     real, documented differences in physiological sensitivity (children,
     elderly, pregnant women, and respiratory/cardiac patients are exactly
     the groups WHO's own air quality guidance calls out as more
     vulnerable) or exposure duration (outdoor workers, traffic police,
     and construction workers spend prolonged hours directly exposed).
     This is an authored rule, disclosed as such here and in the closing
     report — same standard as attribution_agent.py's SOURCE_WEIGHTS.
  4. The shifted tier reads from ONE shared BAND_GUIDANCE table (outdoor
     activity guidance / mask recommendation / emergency action / base
     actions) — kept in exactly one place rather than duplicated per
     group; each group only adds a handful of group-specific action items
     (e.g. Schools -> suspend outdoor sports) plus its own reason sentence.

GRAP (the Graded Response Action Plan) stage references below use the
real, published CAQM thresholds (Stage I at Poor/201, Stage II at Very
Poor/301, Stage III at 401, Stage IV at 451) — not invented boundaries.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from incident_agent import category_for  # noqa: E402 -- reuse, don't re-derive the CPCB bands
from attribution_agent import RADIUS_KM  # noqa: E402 -- same 3km radius already used for source scoring

EMERGENCY_LEVELS = ["Normal", "Moderate", "High", "Severe", "Emergency"]

CATEGORY_TO_EMERGENCY = {
    "Good": "Normal",
    "Satisfactory": "Normal",
    "Moderate": "Moderate",
    "Poor": "High",
    "Very Poor": "Severe",
    "Severe": "Emergency",
}

BAND_GUIDANCE = {
    "Normal": {
        "outdoor_activity": "Normal outdoor activity is safe.",
        "mask": "No mask required.",
        "emergency_action": "No emergency action needed.",
        "base_actions": ["Continue normal outdoor activities.", "No special precautions required."],
    },
    "Moderate": {
        "outdoor_activity": "Reduce prolonged or heavy outdoor exertion if you notice symptoms.",
        "mask": "Not required for most; sensitive individuals may consider one during extended outdoor exposure.",
        "emergency_action": "No emergency action needed — monitor symptoms.",
        "base_actions": ["Limit prolonged outdoor exertion if you notice symptoms.", "Ventilation and light outdoor activity are still fine."],
    },
    "High": {
        "outdoor_activity": "Avoid prolonged or heavy outdoor exertion.",
        "mask": "N95/N99 mask recommended for outdoor exposure.",
        "emergency_action": "Seek medical attention for breathing difficulty, chest pain, or a persistent cough.",
        "base_actions": ["Avoid outdoor exercise and heavy exertion.", "Keep windows closed during peak traffic hours.", "Use an air purifier indoors if available."],
    },
    "Severe": {
        "outdoor_activity": "Avoid outdoor activity; stay indoors as much as possible.",
        "mask": "N95/N99 mask mandatory for any outdoor exposure.",
        "emergency_action": "Seek immediate medical attention for breathing difficulty, chest tightness, or dizziness.",
        "base_actions": ["Stay indoors with windows and doors closed.", "Run air purifiers on high indoors.", "Postpone non-essential outdoor errands and travel."],
    },
    "Emergency": {
        "outdoor_activity": "Remain indoors. Avoid all outdoor activity.",
        "mask": "N99/N100 mask mandatory if outdoor exposure is unavoidable.",
        "emergency_action": "Treat any breathing difficulty as a medical emergency — seek immediate care.",
        "base_actions": ["Remain indoors at all times.", "Seal windows/doors and run air purifiers continuously.", "Cancel outdoor events, school sports, and non-essential travel."],
    },
}

# label, sensitivity shift (tiers added on top of the general-public level),
# and 1-3 group-specific action items layered on top of BAND_GUIDANCE's
# base_actions. Shift rationale is documented per group; nothing here is
# derived from a dataset — it's an authored, disclosed rule, same standard
# as ACTION_TEMPLATES in enforcement_agent.py.
GROUPS = {
    "general_public": {"label": "General Public", "shift": 0, "extra_actions": []},
    "children": {
        "label": "Children",
        "shift": 1,  # developing lungs, higher breathing rate relative to body weight (WHO)
        "extra_actions": [
            "Keep children indoors during recess/play hours once the advisory reaches High or above.",
            "Watch for coughing, wheezing, or unusual fatigue.",
        ],
    },
    "senior_citizens": {
        "label": "Senior Citizens",
        "shift": 1,  # reduced cardiopulmonary reserve
        "extra_actions": [
            "Avoid early-morning walks when pollution is typically highest.",
            "Keep prescribed medication accessible.",
        ],
    },
    "pregnant_women": {
        "label": "Pregnant Women",
        "shift": 1,  # documented maternal/fetal exposure risk (WHO)
        "extra_actions": [
            "Avoid outdoor exposure during high-traffic hours.",
            "Consult a physician if experiencing breathlessness.",
        ],
    },
    "asthma_copd": {
        "label": "People with Asthma/COPD",
        "shift": 2,  # most sensitive population at every band per CPCB/WHO guidance
        "extra_actions": [
            "Keep rescue inhaler/medication accessible at all times.",
            "Avoid known personal triggers in combination with outdoor pollution.",
        ],
    },
    "outdoor_workers": {
        "label": "Outdoor Workers",
        "shift": 1,  # exposure-duration based, not physiological
        "extra_actions": [
            "Take frequent indoor breaks during work hours.",
            "Employers should provide masks and reschedule heavy outdoor tasks.",
        ],
    },
    "schools": {
        "label": "Schools",
        "shift": 1,  # institutional proxy for concentrated children outdoors
        "extra_actions": [
            "Suspend outdoor sports, assemblies, and recess once the advisory reaches High or above.",
            "Shift physical education indoors.",
        ],
    },
    "hospitals": {
        "label": "Hospitals",
        "shift": 1,  # institutional proxy for concentrated respiratory/cardiac/elderly patients
        "extra_actions": [
            "Increase indoor air filtration in wards.",
            "Prepare for a rise in respiratory and cardiac admissions.",
            "Advise sensitive outpatients to reschedule non-urgent visits at Severe/Emergency levels.",
        ],
    },
    "traffic_police": {
        "label": "Traffic Police",
        "shift": 2,  # continuous street-level exposure at highest-emission points
        "extra_actions": [
            "Rotate personnel shifts to limit continuous exposure at high-traffic junctions.",
            "Provide N95/N99 masks for all on-duty personnel.",
        ],
    },
    "construction_workers": {
        "label": "Construction Workers",
        "shift": 1,  # prolonged outdoor exertion plus site-level dust
        "extra_actions": [
            "Enforce dust suppression (water sprinkling) at the site.",
            "Limit heavy-exertion tasks during peak pollution hours.",
            "Provide masks to all on-site workers.",
        ],
    },
}

GROUP_ORDER = [
    "general_public", "children", "senior_citizens", "pregnant_women", "asthma_copd",
    "outdoor_workers", "schools", "hospitals", "traffic_police", "construction_workers",
]

# Real, published CAQM Graded Response Action Plan AQI thresholds for
# Delhi-NCR — not invented boundaries.
GRAP_STAGES = [(0, 200, None), (201, 300, "GRAP Stage I"), (301, 400, "GRAP Stage II"),
               (401, 450, "GRAP Stage III"), (451, 10_000, "GRAP Stage IV")]

# Disclosed, flat model — NOT a hyperlocal/measured figure. Delhi NCT's
# published average population density is on this order (Census-derived);
# applying it uniformly to the same 3km attribution radius used elsewhere
# gives an honest, labeled order-of-magnitude estimate, not a per-ward count.
POPULATION_DENSITY_PER_KM2 = 14_000


def emergency_level_for_aqi(aqi):
    return CATEGORY_TO_EMERGENCY[category_for(aqi)]


def _shift_level(level, shift):
    idx = max(0, min(EMERGENCY_LEVELS.index(level) + shift, len(EMERGENCY_LEVELS) - 1))
    return EMERGENCY_LEVELS[idx]


def grap_stage_for(aqi):
    for lo, hi, stage in GRAP_STAGES:
        if lo <= aqi <= hi:
            return stage
    return "GRAP Stage IV"


def affected_population_estimate(radius_km=RADIUS_KM):
    return round(math.pi * radius_km**2 * POPULATION_DENSITY_PER_KM2)


def expected_duration(current_aqi, forecast_24h_aqi, forecast_72h_aqi=None):
    """Templated from forecast_agent.py's real predicted_aqi values — never a separate prediction."""
    if forecast_24h_aqi is None:
        return "No forecast available to estimate duration."
    idx_now = EMERGENCY_LEVELS.index(emergency_level_for_aqi(current_aqi))
    idx_24 = EMERGENCY_LEVELS.index(emergency_level_for_aqi(forecast_24h_aqi))
    idx_72 = EMERGENCY_LEVELS.index(emergency_level_for_aqi(forecast_72h_aqi)) if forecast_72h_aqi is not None else idx_24

    if idx_24 < idx_now:
        return "Expected to improve within the next 24 hours, based on the live forecast."
    if idx_72 < idx_now:
        return "Expected to improve within 24-72 hours, based on the live forecast."
    if idx_24 > idx_now or idx_72 > idx_now:
        return "Expected to persist or worsen over the next 24-72 hours — this advisory may escalate."
    return "Expected to persist at this level for the next 24-72 hours."


def advisory_for_group(group_key, aqi, dominant_source, forecast_entry):
    group = GROUPS[group_key]
    base_level = emergency_level_for_aqi(aqi)
    level = _shift_level(base_level, group["shift"])
    guidance = BAND_GUIDANCE[level]

    forecast24 = forecast_entry["forecast_24h"]["predicted_aqi"] if forecast_entry else None
    forecast72 = forecast_entry["forecast_72h"]["predicted_aqi"] if forecast_entry else None
    duration = expected_duration(aqi, forecast24, forecast72)

    source_label = dominant_source.replace("_", " ") if dominant_source else "no single dominant source"
    shift_note = (
        f" {group['label']} are treated as {group['shift']} tier(s) more sensitive than the general public at this "
        f"AQI, per WHO/CPCB guidance on vulnerable and high-exposure groups."
        if group["shift"] > 0 else ""
    )
    reason = (
        f"AQI is {round(aqi)} ({base_level} for the general public), attributed primarily to {source_label}."
        f"{shift_note}"
    )

    return {
        "group": group_key,
        "group_label": group["label"],
        "risk_level": level,
        "recommended_actions": guidance["base_actions"] + group["extra_actions"],
        "outdoor_activity_guidance": guidance["outdoor_activity"],
        "mask_recommendation": guidance["mask"],
        "emergency_recommendation": guidance["emergency_action"],
        "expected_duration": duration,
        "reason": reason,
    }


def all_advisories_for_station(station_result, forecast_entry=None):
    aqi = station_result["aqi"]
    dominant = station_result["attribution"][0]["source_type"] if station_result.get("attribution") else None
    return {g: advisory_for_group(g, aqi, dominant, forecast_entry) for g in GROUP_ORDER}


def station_health_summary(station_result, forecast_entry=None):
    """current_risk and emergency_level are intentionally the same
    underlying value (the general public's tier) — Command Center shows
    both because one reads as a descriptive stat, the other as a formal
    badge; they are not independently computed."""
    advisories = all_advisories_for_station(station_result, forecast_entry)
    most_affected_key = max(GROUP_ORDER, key=lambda g: EMERGENCY_LEVELS.index(advisories[g]["risk_level"]))
    general_level = advisories["general_public"]["risk_level"]
    return {
        "station": station_result["station"],
        "aqi": station_result["aqi"],
        "current_risk": general_level,
        "emergency_level": general_level,
        "most_affected_group": advisories[most_affected_key]["group_label"],
        "most_affected_group_key": most_affected_key,
        "top_recommendation": advisories[most_affected_key]["recommended_actions"][0],
        "advisories": advisories,
    }


def government_response_for(aqi, emergency_level):
    stage = grap_stage_for(aqi)
    if emergency_level in ("Severe", "Emergency"):
        return (
            f"Escalate to {stage} response — restrict construction/demolition, intensify road dust suppression, "
            f"increase public transport frequency, and consider vehicle-restriction measures."
        )
    if emergency_level == "High":
        return (
            f"Escalate to {stage} response — enforce dust-control at construction sites, step up inspection of "
            f"industrial stacks, and issue a public advisory."
        )
    if emergency_level == "Moderate":
        return "Issue a public advisory; no regulatory escalation required yet."
    return "No government action required — AQI within acceptable range."


def public_advisory_for(emergency_level, most_affected_label):
    guidance = BAND_GUIDANCE[emergency_level]
    return f"{guidance['outdoor_activity']} {most_affected_label} should take additional precautions — {guidance['mask'].lower()}"


def incident_health_summary(incident, station_result=None, forecast_entry=None):
    """The four fields the Incident Detail page needs (Affected Population,
    Recommended Public Advisory, Recommended Government Response, Health
    Impact Summary) — computed fresh from the incident's own real fields
    plus the live station/forecast data, never persisted, so it can never
    drift from the incident's current aqi/dominant_source."""
    if station_result:
        summary = station_health_summary(station_result, forecast_entry)
        emergency_level = summary["emergency_level"]
        most_affected = summary["most_affected_group"]
    else:
        emergency_level = emergency_level_for_aqi(incident["aqi"])
        most_affected = "General Public"

    dominant_label = (incident.get("dominant_source") or "an unidentified source").replace("_", " ")
    population = affected_population_estimate()

    return {
        "emergency_level": emergency_level,
        "most_affected_group": most_affected,
        "affected_population": population,
        "affected_population_note": (
            f"Modeled: a {RADIUS_KM:.0f}km radius around the station (the same radius attribution scoring uses) "
            f"times an average Delhi NCT population-density estimate — a citywide order-of-magnitude figure, not "
            f"a hyperlocal measurement."
        ),
        "recommended_public_advisory": public_advisory_for(emergency_level, most_affected),
        "recommended_government_response": government_response_for(incident["aqi"], emergency_level),
        "health_impact_summary": (
            f"AQI at {incident['station']} is {round(incident['aqi'])} ({emergency_level} health risk), "
            f"attributed primarily to {dominant_label}. {most_affected} face the highest risk at this level."
        ),
    }


def forecast_severe_stations(forecast_results):
    """Stations whose 24h FORECAST crosses into Severe/Emergency even
    though current AQI hasn't yet — a genuinely forward-looking signal,
    distinct from (and not redundant with) the current-state trigger that
    already opens an Incident in incident_agent.py."""
    alerts = []
    for f in forecast_results:
        current_level = emergency_level_for_aqi(f["current_aqi"])
        predicted_level = emergency_level_for_aqi(f["forecast_24h"]["predicted_aqi"])
        if predicted_level in ("Severe", "Emergency") and current_level not in ("Severe", "Emergency"):
            alerts.append({
                "station": f["station"],
                "current_aqi": f["current_aqi"],
                "predicted_aqi": f["forecast_24h"]["predicted_aqi"],
                "level": predicted_level,
            })
    return alerts
