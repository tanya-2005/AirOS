from fastapi import APIRouter
from .. import pipeline
from ..schemas import Envelope

router = APIRouter(prefix="/api", tags=["forecast"])


@router.get("/forecast", response_model=Envelope)
def read_forecast():
    data, source = pipeline.get_forecast()
    return Envelope(data=data, data_source=source, count=len(data))
