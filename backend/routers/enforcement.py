from fastapi import APIRouter, Query
from .. import pipeline
from ..schemas import Envelope

router = APIRouter(prefix="/api", tags=["enforcement"])


@router.get("/enforcement", response_model=Envelope)
def read_enforcement(city: str = Query("delhi", description="City id, e.g. delhi/mumbai/bengaluru")):
    data, source = pipeline.get_enforcement(city)
    return Envelope(data=data, data_source=source, count=len(data))
