from fastapi import APIRouter, HTTPException, Query
from .. import pipeline
from ..schemas import Envelope

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
