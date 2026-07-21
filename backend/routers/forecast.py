from fastapi import APIRouter, Query
from .. import pipeline
from ..schemas import Envelope

router = APIRouter(prefix="/api", tags=["forecast"])


@router.get("/forecast", response_model=Envelope)
def read_forecast(city: str = Query("delhi", description="City id, e.g. delhi/mumbai/bengaluru")):
    data, source = pipeline.get_forecast(city)
    return Envelope(data=data, data_source=source, count=len(data))
