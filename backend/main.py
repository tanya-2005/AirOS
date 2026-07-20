"""
AirOS API — thin FastAPI wrapper around the existing agents/ pipeline.
Run from the repo root: uvicorn backend.main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import attribution, forecast, enforcement, simulation

app = FastAPI(
    title="AirOS API",
    description="Serves attribution, forecast, enforcement, and simulation output "
    "from the existing Python agents to the AirOS frontend.",
    version="0.1.0",
)

# Vite dev server origins. Add the production frontend origin here once deployed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(attribution.router)
app.include_router(forecast.router)
app.include_router(enforcement.router)
app.include_router(simulation.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "airos-api"}
