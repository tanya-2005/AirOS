from fastapi import APIRouter
from .. import pipeline
from ..schemas import Envelope

router = APIRouter(prefix="/api", tags=["geo"])


@router.get("/geo/roads", response_model=Envelope)
def read_roads():
    """GeoJSON FeatureCollection of major roads (OpenStreetMap) for the Map page's roads layer."""
    data, source = pipeline.get_roads()
    return Envelope(data=data, data_source=source, count=len(data.get("features", [])))
