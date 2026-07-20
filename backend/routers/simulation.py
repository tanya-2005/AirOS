from fastapi import APIRouter, HTTPException
from .. import pipeline
from ..schemas import SimulateRequest, SimulateResponse

router = APIRouter(prefix="/api", tags=["simulation"])


@router.post("/simulate", response_model=SimulateResponse)
def simulate(payload: SimulateRequest):
    """
    Looks up the station's current AQI + attribution shares (live or cached,
    see pipeline.get_attribution), then calls simulation_agent.simulate()
    unmodified with the requested reductions/rain flag. This is the one
    endpoint that is always a real computation, never a cached read — every
    Scenario Lab slider drag hits this.
    """
    current_aqi, shares, source = pipeline.find_station_attribution(payload.station)
    if current_aqi is None:
        raise HTTPException(
            status_code=404,
            detail=f"No attribution data for station '{payload.station}'. "
            f"Check /api/attribution for valid station names.",
        )

    result = pipeline.run_simulation(current_aqi, shares, payload.reductions, payload.rain)
    return SimulateResponse(**result, data_source=source)
