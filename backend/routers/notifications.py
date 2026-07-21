from fastapi import APIRouter, Depends, HTTPException
from .. import pipeline, auth
from ..schemas import Envelope

router = APIRouter(prefix="/api", tags=["notifications"])


@router.get("/notifications", response_model=Envelope)
def read_notifications(user=Depends(auth.get_current_user)):
    data, source = pipeline.get_notifications(user["id"])
    return Envelope(data=data, data_source=source, count=len(data))


@router.patch("/notifications/{notification_id}", response_model=Envelope)
def mark_read(notification_id: str, user=Depends(auth.get_current_user)):
    updated = pipeline.mark_notification_read(notification_id, user["id"])
    if updated is None:
        raise HTTPException(status_code=404, detail=f"No notification '{notification_id}'.")
    return Envelope(data=updated, data_source="live_pipeline", count=1)
