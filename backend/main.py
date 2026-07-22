"""
AirOS API — thin FastAPI wrapper around the existing agents/ pipeline.
Run from the repo root: uvicorn backend.main:app --reload --port 8000
"""
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import auth
from .routers import (
    attribution, forecast, enforcement, simulation, weather, history, geo, incidents,
    auth as auth_router, users, tasks, notifications, health_advisory, cities, validation,
)

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
    "https://air-os-two.vercel.app",
],
    allow_methods=["*"],
    allow_headers=["*"],
)

# /api/auth/login is the one endpoint that must be reachable without a
# token (you need it to GET a token); /api/auth/logout and /me protect
# themselves individually (see routers/auth.py) since /logout needs the
# token to know *which* session to delete, not just "some" valid session.
app.include_router(auth_router.router)

# Every other router requires a valid Bearer session — real enforcement at
# the API layer, not just a frontend-side redirect the API itself ignores.
_auth_dep = [Depends(auth.get_current_user)]
app.include_router(attribution.router, dependencies=_auth_dep)
app.include_router(forecast.router, dependencies=_auth_dep)
app.include_router(enforcement.router, dependencies=_auth_dep)
app.include_router(simulation.router, dependencies=_auth_dep)
app.include_router(weather.router, dependencies=_auth_dep)
app.include_router(history.router, dependencies=_auth_dep)
app.include_router(geo.router, dependencies=_auth_dep)
app.include_router(incidents.router, dependencies=_auth_dep)
app.include_router(users.router, dependencies=_auth_dep)
app.include_router(tasks.router, dependencies=_auth_dep)
app.include_router(notifications.router, dependencies=_auth_dep)
app.include_router(health_advisory.router, dependencies=_auth_dep)
app.include_router(cities.router, dependencies=_auth_dep)
app.include_router(validation.router, dependencies=_auth_dep)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "airos-api"}
