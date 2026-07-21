from fastapi import APIRouter, Query
from .. import pipeline
from ..schemas import Envelope

router = APIRouter(prefix="/api", tags=["attribution"])


@router.get("/attribution", response_model=Envelope)
def read_attribution(city: str = Query("delhi", description="City id, e.g. delhi/mumbai/bengaluru")):
    data, source = pipeline.get_attribution(city)
    return Envelope(data=data, data_source=source, count=len(data))


@router.get("/registry", response_model=Envelope)
def read_registry(city: str = Query("delhi", description="City id, e.g. delhi/mumbai/bengaluru")):
    data, source = pipeline.get_registry(city)
    return Envelope(data=data, data_source=source, count=len(data))
