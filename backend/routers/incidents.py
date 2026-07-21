from fastapi import APIRouter, Depends, HTTPException, Query
from .. import pipeline, auth
from ..schemas import Envelope, IncidentUpdate, AssignIncidentRequest, NoteCreate

router = APIRouter(prefix="/api", tags=["incidents"])


@router.get("/incidents", response_model=Envelope)
def read_incidents(city: str = Query("delhi", description="City id, e.g. delhi/mumbai/bengaluru")):
    data, source = pipeline.get_incidents(city)
    return Envelope(data=data, data_source=source, count=len(data))


@router.get("/incidents/{incident_id}", response_model=Envelope)
def read_incident(incident_id: str):
    incident, source = pipeline.get_incident(incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail=f"No incident '{incident_id}'.")
    return Envelope(data=incident, data_source=source, count=1)


@router.patch("/incidents/{incident_id}", response_model=Envelope)
def update_incident(incident_id: str, payload: IncidentUpdate):
    """Status transitions and resolution notes — the one incident endpoint
    that's always a real write, same role /api/simulate plays for scenarios."""
    updated = pipeline.update_incident(incident_id, status=payload.status, resolution_notes=payload.resolution_notes)
    if updated is None:
        raise HTTPException(status_code=404, detail=f"No incident '{incident_id}'.")
    return Envelope(data=updated, data_source="live_pipeline", count=1)


@router.post("/incidents/{incident_id}/assign", response_model=Envelope)
def assign_incident(incident_id: str, payload: AssignIncidentRequest, user=Depends(auth.require_roles("Administrator"))):
    """Administrator-only — real role enforcement at the API layer, not just a hidden button in the UI."""
    try:
        updated = pipeline.assign_incident_to_officer(
            incident_id, payload.officer_id, expected_completion_hours=payload.expected_completion_hours
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if updated is None:
        raise HTTPException(status_code=404, detail=f"No incident '{incident_id}'.")
    return Envelope(data=updated, data_source="live_pipeline", count=1)


@router.post("/incidents/{incident_id}/notes", response_model=Envelope)
def add_note(incident_id: str, payload: NoteCreate, user=Depends(auth.get_current_user)):
    updated = pipeline.add_incident_note(incident_id, user["id"], user["name"], payload.text)
    if updated is None:
        raise HTTPException(status_code=404, detail=f"No incident '{incident_id}'.")
    return Envelope(data=updated, data_source="live_pipeline", count=1)
