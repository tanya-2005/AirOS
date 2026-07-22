"""
Multilingual Citizen Communication — LLM translation layer over the
EXISTING deterministic Health Advisory Engine (health_advisory_agent.py).

This module computes NOTHING about risk. It never decides a severity
level, a recommended action, or a health decision — that stays exactly
what it already was: 100% rule-based, disclosed, zero LLM involvement
(see health_advisory_agent.py's own docstring: "no LLM, no invented
numbers"). English advisories are served straight from that engine and
never touch this module at all.

What this module does is narrow and specific: given an advisory the
health advisory engine already produced, ask an LLM to render the SAME
content — the same severity, the same recommendations, the same
emergency warning — naturally in another language. A translation task,
not a decision task. If the LLM is unavailable, misconfigured, or
returns something we can't validate, translate_advisories() returns the
original English content unchanged and says so — callers always get
something safe to show, never a fabricated or partial result.
"""
import hashlib
import json
import os

try:
    from anthropic import Anthropic
except ImportError:  # pragma: no cover - handled at call time, not import time
    Anthropic = None

MODEL = "claude-sonnet-5"
MAX_TOKENS = 4096

# Single source of truth for which languages this feature supports.
# Adding a language later is exactly one more entry here — nothing else
# in this module, the router, or the cache keys on the concept of a
# fixed language list. The frontend mirrors this exact set (see
# dashboard-react/src/lib/languages.js — same "MUST match" convention
# already used for EMERGENCY_LEVELS/GROUP_ORDER between this codebase's
# Python and JS sides).
SUPPORTED_LANGUAGES = {
    "en": {"label": "English", "native_label": "English"},
    "hi": {"label": "Hindi", "native_label": "हिन्दी"},
    "mr": {"label": "Marathi", "native_label": "मराठी"},
    "ta": {"label": "Tamil", "native_label": "தமிழ்"},
    "bn": {"label": "Bengali", "native_label": "বাংলা"},
}

# The fields translate_advisories() sends to the model and expects back,
# per population group — deliberately the exact same keys
# health_advisory_agent.py already produces (group_label,
# outdoor_activity_guidance, mask_recommendation, emergency_recommendation,
# recommended_actions, expected_duration, reason) plus two presentational
# additions the frontend needs that don't exist as separate fields
# upstream: "headline" (a one-line summary) and "risk_level_label" (a
# natural-language severity word in the target language — risk_level
# itself, e.g. "Severe", stays untranslated everywhere else in the app
# since it's also used as a lookup key for badge color).
_REQUIRED_GROUP_FIELDS = [
    "headline",
    "group_label",
    "risk_level_label",
    "outdoor_activity_guidance",
    "mask_recommendation",
    "emergency_recommendation",
    "recommended_actions",
    "expected_duration",
    "reason",
]

_client = None
_client_checked = False


def _get_client():
    """Lazily constructed, cached across calls in this process. Returns
    None (not an exception) if the SDK isn't installed or no API key is
    configured — both are legitimate "translation unavailable" states,
    not bugs, and the caller falls back to English for either."""
    global _client, _client_checked
    if _client_checked:
        return _client
    _client_checked = True
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if Anthropic is not None and api_key:
        _client = Anthropic(api_key=api_key)
    return _client


def advisory_content_fingerprint(advisories):
    """Stable hash of the English advisory content a translation was made
    from. The cache key is (fingerprint, language) rather than
    (station, language), so a translation is reused only while the
    underlying advisory is unchanged — the moment a fresh AQI reading
    shifts a risk_level, the fingerprint changes and a new translation is
    generated automatically instead of ever serving a stale one."""
    payload = json.dumps(advisories, sort_keys=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:20]


def _build_tool_schema(group_keys):
    group_schema = {
        "type": "object",
        "properties": {
            "headline": {"type": "string", "description": "One-line advisory headline for this group, in the target language."},
            "group_label": {"type": "string", "description": "The population group's name, in the target language."},
            "risk_level_label": {"type": "string", "description": "Natural short severity word for the given risk_level, in the target language."},
            "outdoor_activity_guidance": {"type": "string"},
            "mask_recommendation": {"type": "string"},
            "emergency_recommendation": {"type": "string"},
            "recommended_actions": {"type": "array", "items": {"type": "string"}},
            "expected_duration": {"type": "string"},
            "reason": {"type": "string"},
        },
        "required": _REQUIRED_GROUP_FIELDS,
    }
    return {
        "name": "submit_translated_advisories",
        "description": "Submit the fully translated citizen health advisory, one entry per population group key.",
        "input_schema": {
            "type": "object",
            "properties": {
                "groups": {
                    "type": "object",
                    "properties": {key: group_schema for key in group_keys},
                    "required": list(group_keys),
                }
            },
            "required": ["groups"],
        },
    }


def _system_prompt(language_label):
    return (
        f"You are an official multilingual communication specialist for an Indian Pollution Control "
        f"Board, producing citizen-facing air quality health advisories in {language_label}. Every "
        f"advisory you are given has already been decided by a deterministic health-risk model — your "
        f"only job is to translate it into {language_label}, not to change, soften, or add to its "
        f"meaning.\n\n"
        f"Rules:\n"
        f"1. Preserve urgency exactly. Never soften an emergency warning; never add urgency that isn't "
        f"in the source.\n"
        f"2. Preserve health recommendations, pollution terminology, and an official government tone.\n"
        f"3. Do not translate word-for-word. Produce natural, fluent {language_label} a citizen would "
        f"actually read on a real government notice.\n"
        f"4. Preserve every number (AQI values, distances, hours, percentages) and every place/station "
        f"name exactly as given — do not alter, drop, translate, or invent numeric or place-name "
        f"content.\n"
        f"5. 'risk_level_label' is a short, natural severity word in {language_label} for the English "
        f"risk tier given (Normal/Moderate/High/Severe/Emergency) — a real, understood equivalent term, "
        f"not a transliteration.\n"
        f"6. 'headline' is a short one-line advisory headline in {language_label} summarizing the group "
        f"and severity.\n"
        f"7. 'recommended_actions' must be returned as a list with the same number of items as given, "
        f"each translated.\n\n"
        f"Call submit_translated_advisories with one fully translated entry per group key. Do not omit "
        f"any group."
    )


def _user_prompt(advisories):
    # Only the fields that actually get translated/rendered are sent —
    # risk_level itself is included for context (so risk_level_label is
    # accurate) but is not requested back, since the app keeps that
    # English enum value for badge-tone lookups everywhere.
    trimmed = {
        key: {
            "risk_level": a["risk_level"],
            "group_label": a["group_label"],
            "outdoor_activity_guidance": a["outdoor_activity_guidance"],
            "mask_recommendation": a["mask_recommendation"],
            "emergency_recommendation": a["emergency_recommendation"],
            "recommended_actions": a["recommended_actions"],
            "expected_duration": a["expected_duration"],
            "reason": a["reason"],
        }
        for key, a in advisories.items()
    }
    return (
        "Translate the following citizen health advisory, one entry per population group, using the "
        "submit_translated_advisories tool:\n\n" + json.dumps(trimmed, ensure_ascii=False, indent=2)
    )


def _validate(result, group_keys):
    if not isinstance(result, dict) or "groups" not in result:
        return None
    groups = result["groups"]
    if not isinstance(groups, dict):
        return None
    validated = {}
    for key in group_keys:
        entry = groups.get(key)
        if not isinstance(entry, dict):
            return None
        for field in _REQUIRED_GROUP_FIELDS:
            value = entry.get(field)
            if field == "recommended_actions":
                if not isinstance(value, list) or not value or not all(isinstance(v, str) and v.strip() for v in value):
                    return None
            elif not isinstance(value, str) or not value.strip():
                return None
        validated[key] = entry
    return validated


def translate_advisories(advisories, language):
    """Returns (result_dict, ok). `advisories` is the dict
    health_advisory_agent.py::all_advisories_for_station() already
    produces (one entry per group key). On success, result_dict has the
    same keys, each value merged with the translated fields on top of the
    original (so risk_level, the untranslated enum, is still present for
    badge-tone lookups). On any failure — no API key, network error,
    malformed/incomplete model output — returns (advisories, False): the
    original English content, unchanged, so the caller always has
    something real to render. Never raises."""
    if language == "en" or language not in SUPPORTED_LANGUAGES:
        return advisories, True

    client = _get_client()
    if client is None:
        return advisories, False

    try:
        group_keys = list(advisories.keys())
        message = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=_system_prompt(SUPPORTED_LANGUAGES[language]["label"]),
            tools=[_build_tool_schema(group_keys)],
            tool_choice={"type": "tool", "name": "submit_translated_advisories"},
            messages=[{"role": "user", "content": _user_prompt(advisories)}],
        )
        tool_use = next((b for b in message.content if b.type == "tool_use"), None)
        if tool_use is None:
            return advisories, False
        validated = _validate(tool_use.input, group_keys)
        if validated is None:
            return advisories, False
        merged = {key: {**advisories[key], **validated[key]} for key in group_keys}
        return merged, True
    except Exception:
        # Any SDK/network/parsing failure — the whole point of this
        # try/except is that a translation outage never becomes a UI
        # outage. See health_advisory_agent.py's own "auditable math over
        # black-box precision" standard: when the black box fails, fall
        # back to the deterministic content, don't guess.
        return advisories, False
