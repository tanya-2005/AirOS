from fastapi import APIRouter, Query
from .. import pipeline
from ..schemas import Envelope

router = APIRouter(prefix="/api", tags=["weather"])


@router.get("/weather/current", response_model=Envelope)
def read_weather_current(city: str = Query("delhi", description="City id, e.g. delhi/mumbai/bengaluru")):
    data, source = pipeline.get_weather_current(city)
    return Envelope(data=data, data_source=source, count=len(data))


@router.get("/weather/history", response_model=Envelope)
def read_weather_history(
    city: str = Query("delhi", description="City id, e.g. delhi/mumbai/bengaluru"),
    hours: int = Query(24, ge=1, le=24 * 7, description="Window size, 1-168 hours"),
):
    data, source = pipeline.get_weather_history(city, hours=hours)
    return Envelope(data=data, data_source=source, count=len(data))
