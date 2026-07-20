from fastapi import APIRouter
from .. import pipeline
from ..schemas import Envelope

router = APIRouter(prefix="/api", tags=["attribution"])


@router.get("/attribution", response_model=Envelope)
def read_attribution():
    data, source = pipeline.get_attribution()
    return Envelope(data=data, data_source=source, count=len(data))


@router.get("/registry", response_model=Envelope)
def read_registry():
    data = pipeline.get_registry()
    return Envelope(data=data, data_source="synthetic", count=len(data))
