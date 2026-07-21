from fastapi import APIRouter, Query
from .. import pipeline
from ..schemas import Envelope

router = APIRouter(prefix="/api", tags=["geo"])


@router.get("/geo/roads", response_model=Envelope)
def read_roads(city: str = Query("delhi", description="City id, e.g. delhi/mumbai/bengaluru")):
    """GeoJSON FeatureCollection of major roads (OpenStreetMap) for the Map page's roads layer."""
    data, source = pipeline.get_roads(city)
    return Envelope(data=data, data_source=source, count=len(data.get("features", [])))
