from fastapi import APIRouter, Query
from .. import pipeline
from ..schemas import Envelope

router = APIRouter(prefix="/api/validation", tags=["validation"])


@router.get("/forecast", response_model=Envelope)
def read_forecast_validation(
    city: str = Query("delhi", description="City id, e.g. delhi/mumbai/bengaluru"),
    station: str | None = Query(None, description="Optional station name to filter backtest pairs to"),
):
    """Backtested forecast accuracy (MAE/RMSE/bias/coverage/rolling trend) —
    see pipeline.get_forecast_validation / agents/validation_agent.py."""
    data, source = pipeline.get_forecast_validation(city, station)
    return Envelope(data=data, data_source=source, count=len(data["pairs"]))


@router.get("/attribution", response_model=Envelope)
def read_attribution_reliability(city: str = Query("delhi", description="City id")):
    """Evidence-completeness reliability signal for this city's current
    attribution results — not an accuracy score, see
    validation_agent.attribution_reliability's docstring."""
    data, source = pipeline.get_attribution_reliability(city)
    return Envelope(data=data, data_source=source, count=1 if data else 0)


@router.get("/reliability", response_model=Envelope)
def read_model_reliability(city: str = Query("delhi", description="City id")):
    """Combined forecast + attribution reliability verdict for this city."""
    data, source = pipeline.get_model_reliability(city)
    return Envelope(data=data, data_source=source, count=1 if data else 0)


@router.get("/system-health", response_model=Envelope)
def read_system_health():
    """Last AQI/weather/forecast/incident sync + data freshness, one row
    per supported city — spans all cities by definition, no ?city= param."""
    data, source = pipeline.get_system_health()
    return Envelope(data=data, data_source=source, count=len(data))


@router.get("/report", response_model=Envelope)
def read_validation_report():
    """Cross-city forecast accuracy summary for the Intelligence Report's
    AI Validation section — most/least accurate cities, confidence
    distribution, key learnings."""
    data, source = pipeline.get_validation_report()
    return Envelope(data=data, data_source=source, count=len(data["per_city"]))


@router.get("/incident/{incident_id}", response_model=Envelope)
def read_incident_prediction_review(incident_id: str):
    """Prediction-at-creation vs. actual conditions vs. error vs. lessons
    learned for one incident — see pipeline.get_incident_prediction_review."""
    data, source = pipeline.get_incident_prediction_review(incident_id)
    return Envelope(data=data, data_source=source, count=1 if data else 0)
