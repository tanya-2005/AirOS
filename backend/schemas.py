"""
Pydantic models. Response bodies from the agents are already well-formed
JSON-serializable dicts (see agents/*.py) — rather than re-declare every
nested field (and drift out of sync as agent output evolves), each envelope
below wraps the raw agent payload in `data` and adds the one field the
frontend actually needs to make a UX decision on: `data_source`, so a page
can show "live" vs "last computed run" instead of presenting both the same way.
"""
from typing import Any, Literal
from pydantic import BaseModel, Field

DataSource = Literal["live_pipeline", "cached_run", "empty", "synthetic"]
IncidentStatus = Literal["Open", "Assigned", "In Progress", "Resolved"]


class Envelope(BaseModel):
    data: Any
    data_source: DataSource
    count: int = 0


class SimulateRequest(BaseModel):
    station: str = Field(..., description="Station name, must match an attribution result")
    city: str = Field("delhi", description="City id the station belongs to, e.g. delhi/mumbai/bengaluru")
    reductions: dict[str, float] = Field(
        default_factory=dict,
        description="source_type -> reduction percentage 0-100, e.g. {'construction_site': 50}",
    )
    rain: bool = False


class SimulateResponse(BaseModel):
    current_aqi: float
    projected_aqi: float
    improvement_pct: float
    breakdown: list[dict]
    scenario: dict
    data_source: DataSource


class IncidentUpdate(BaseModel):
    """PATCH /api/incidents/{id} body — both fields optional so the
    resolution-notes textarea can save independently of a status change."""
    status: IncidentStatus | None = None
    resolution_notes: str | None = None


UserRole = Literal["Administrator", "Pollution Control Officer", "Analyst"]
UserStatus = Literal["Available", "Busy", "Offline"]


class LoginRequest(BaseModel):
    email: str
    password: str


class AssignIncidentRequest(BaseModel):
    officer_id: str = Field(..., description="user id of the Pollution Control Officer to assign")
    expected_completion_hours: float | None = Field(
        None, description="Override the priority-derived SLA window; hours from now."
    )


class NoteCreate(BaseModel):
    text: str


class TaskUpdate(BaseModel):
    status: Literal["Pending", "In Progress", "Completed"] | None = None
    assigned_officer_id: str | None = None
