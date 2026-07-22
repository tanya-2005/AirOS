from fastapi import APIRouter, HTTPException, Query
from .. import pipeline
from ..schemas import Envelope, TranslateRequest

# Prefix is /api/health-advisory, NOT /api/health -- main.py already has a
# plain, unauthenticated /api/health liveness check; this stays distinct
# from it (and sits behind the normal auth dependency like every other
# router).
router = APIRouter(prefix="/api/health-advisory", tags=["health-advisory"])


@router.get("/city", response_model=Envelope)
def read_city_health(city: str = Query("delhi", description="City id, e.g. delhi/mumbai/bengaluru")):
    data, source = pipeline.get_city_health(city)
    if data is None:
        return Envelope(data=None, data_source=source, count=0)
    return Envelope(data=data, data_source=source, count=1)


@router.get("/station/{station_name}", response_model=Envelope)
def read_station_health(
    station_name: str, city: str = Query("delhi", description="City id, e.g. delhi/mumbai/bengaluru")
):
    data, source = pipeline.get_station_health(station_name, city)
    if data is None:
        raise HTTPException(status_code=404, detail=f"No live health advisory available for '{station_name}'.")
    return Envelope(data=data, data_source=source, count=1)


@router.get("/languages")
def read_supported_languages():
    """Static registry, not city/station-scoped — lets the frontend stay
    in sync with agents/translation_agent.py::SUPPORTED_LANGUAGES without
    hand-duplicating the list (still mirrored in
    dashboard-react/src/lib/languages.js for zero-latency initial render,
    same convention as EMERGENCY_LEVELS/GROUP_ORDER elsewhere in this app —
    this endpoint is the source of truth either side can reconcile against)."""
    return {"languages": pipeline.translation_agent.SUPPORTED_LANGUAGES}


@router.post("/station/{station_name}/translate", response_model=Envelope)
def translate_station_health(
    station_name: str,
    payload: TranslateRequest,
    city: str = Query("delhi", description="City id, e.g. delhi/mumbai/bengaluru"),
):
    """Translates the SAME advisory /station/{station_name} already
    returns — never a second computation. English is served with zero LLM
    involvement; every other language goes through the content-addressed
    cache first, then a live LLM call on a cache miss (see
    pipeline.translate_station_health). On any translation failure this
    still returns 200 with the original English content and
    `translated: false` — a translation outage is never a UI-breaking
    error, per the fallback contract in translation_agent.py."""
    if payload.language not in pipeline.translation_agent.SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language: '{payload.language}'.")
    advisories, translated, source = pipeline.translate_station_health(station_name, city, payload.language)
    if advisories is None:
        raise HTTPException(status_code=404, detail=f"No live health advisory available for '{station_name}'.")
    return Envelope(
        data={"language": payload.language, "translated": translated, "advisories": advisories},
        data_source=source,
        count=1,
    )
