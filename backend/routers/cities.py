from fastapi import APIRouter
from .. import pipeline, city_registry
from ..schemas import Envelope

router = APIRouter(prefix="/api/cities", tags=["cities"])


@router.get("", response_model=Envelope)
def list_cities():
    """The 6 supported cities (backend/city_registry.py) — the frontend's
    city selector and City Comparison page both read from this single list
    instead of hardcoding it a second time."""
    return Envelope(data=city_registry.CITIES, data_source="live_pipeline", count=len(city_registry.CITIES))


@router.get("/compare", response_model=Envelope)
def compare_cities():
    """One row per city — current AQI, forecast AQI, incident count,
    emergency level, dominant source, most vulnerable group — for the City
    Comparison page's rankings and the Report page's national-comparison
    mode. See pipeline.get_city_comparison for how each row is computed
    (reuses get_attribution/get_forecast/get_incidents/get_city_health per
    city, no separate aggregation logic)."""
    data, source = pipeline.get_city_comparison()
    return Envelope(data=data, data_source=source, count=len(data))
