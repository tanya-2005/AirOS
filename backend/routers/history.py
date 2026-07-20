from fastapi import APIRouter, Query
from .. import pipeline
from ..schemas import Envelope

router = APIRouter(prefix="/api", tags=["history"])


@router.get("/history/station/{station_name}", response_model=Envelope)
def read_station_history(
    station_name: str,
    hours: int = Query(24, ge=1, le=24 * 7, description="Window size, 1-168 hours"),
):
    """
    station_name is the station's display name (e.g. "Wazirpur"), matching
    every other station-scoped part of this API (?station= query params
    elsewhere in the frontend) — not a separate numeric ID, since nothing
    else in the pipeline assigns one. URL-encode it same as any path segment.
    Returns [] / data_source "empty" rather than 404 if the station simply
    hasn't accumulated any history yet — that's an expected early state,
    not a client error.
    """
    data, source = pipeline.get_station_history(station_name, hours=hours)
    return Envelope(data=data, data_source=source, count=len(data))


@router.get("/history/city", response_model=Envelope)
def read_city_history(hours: int = Query(24, ge=1, le=24 * 7, description="Window size, 1-168 hours")):
    data, source = pipeline.get_city_history(hours=hours)
    return Envelope(data=data, data_source=source, count=len(data))
