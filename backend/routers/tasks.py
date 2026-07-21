from fastapi import APIRouter, HTTPException
from .. import pipeline
from ..schemas import Envelope, TaskUpdate

router = APIRouter(prefix="/api", tags=["tasks"])


@router.get("/tasks", response_model=Envelope)
def read_tasks(incident_id: str | None = None):
    data, source = pipeline.get_tasks(incident_id=incident_id)
    return Envelope(data=data, data_source=source, count=len(data))


@router.patch("/tasks/{task_id}", response_model=Envelope)
def update_task(task_id: str, payload: TaskUpdate):
    updated = pipeline.update_task(task_id, status=payload.status, assigned_officer_id=payload.assigned_officer_id)
    if updated is None:
        raise HTTPException(status_code=404, detail=f"No task '{task_id}'.")
    return Envelope(data=updated, data_source="live_pipeline", count=1)
