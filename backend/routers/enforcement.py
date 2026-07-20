from fastapi import APIRouter
from .. import pipeline
from ..schemas import Envelope

router = APIRouter(prefix="/api", tags=["enforcement"])


@router.get("/enforcement", response_model=Envelope)
def read_enforcement():
    data, source = pipeline.get_enforcement()
    return Envelope(data=data, data_source=source, count=len(data))
