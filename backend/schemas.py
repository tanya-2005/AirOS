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


class Envelope(BaseModel):
    data: Any
    data_source: DataSource
    count: int = 0


class SimulateRequest(BaseModel):
    station: str = Field(..., description="Station name, must match an attribution result")
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
