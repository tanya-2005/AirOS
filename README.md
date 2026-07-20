# AirOS / AQI Intelligence Pipeline — Hackathon Scaffold

Track: Attribution → Forecast → Enforcement (+ Simulation), for AI-Powered
Urban Air Quality Intelligence for Smart City Intervention.

## What's here

```
ingestion/
  fetch_waqi.py            Real-time AQI (WAQI/CPCB stations) — needs free token
  fetch_weather.py         Real met forecast (Open-Meteo) — no key needed
  generate_registry_demo.py Synthetic construction/industrial registry (labeled as such)
agents/
  attribution_agent.py     Scores which source likely caused each AQI hotspot
  forecast_agent.py        24-72h AQI forecast, evaluable vs persistence baseline
  enforcement_agent.py     Ranked, evidence-backed action recommendations
  simulation_agent.py      What-if scenarios (traffic/construction reduction, rain)
data/
  registry_demo_delhi.json         Synthetic registry (real, runnable)
  attribution/forecast/enforcement/simulation _*.json   Sample outputs from a
    placeholder test run — these prove the pipeline works end-to-end, but
    they are NOT real AQI data. Delete and regenerate with real data before
    your demo.
backend/
  FastAPI service that imports agents/*.py unmodified and exposes them as
  REST endpoints for the frontend. See "Local development" below.
dashboard-react/
  The AirOS product UI (6 pages: Command Center, City Map, Attribution,
  Forecast, Scenario Lab, AI Intelligence Report), built against backend/.
```

## Local development (frontend + backend)

Two processes, run from the repo root in separate terminals:

```bash
# Terminal 1 — backend (FastAPI)
python -m venv .venv
./.venv/Scripts/activate        # or `source .venv/bin/activate` on macOS/Linux
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000

# Terminal 2 — frontend (Vite)
cd dashboard-react
npm install
npm run dev
```

The frontend calls the backend at `VITE_API_BASE_URL` (defaults to
`http://localhost:8000`, see `dashboard-react/.env.example`). Every
`/api/*` response includes a `data_source` field —`"live_pipeline"` if it
ran attribution/forecast fresh against `data/aqi_stations_*.json`,
`"cached_run"` if it fell back to the last computed `data/*.json` (true
today, since that file doesn't exist until you run `ingestion/fetch_waqi.py`
— see below), or `"synthetic"` for the registry. `/api/simulate` is the one
endpoint that's always a live computation.

## Setup (run this first, on your own machine — this sandbox can't reach
## external APIs)

```bash
# 1. Get a free WAQI token (10 seconds, no approval wait):
#    https://aqicn.org/data-platform/token/
cp .env.example .env    # then edit .env and set WAQI_TOKEN
export WAQI_TOKEN=your_token_here   # or `source .env` / set it however your shell prefers

# 2. Pull real data
cd ingestion
python3 fetch_waqi.py --city delhi --detail
python3 fetch_weather.py --lat 28.65 --lon 77.20 --label delhi

# 3. Run the pipeline
cd ../agents
python3 attribution_agent.py
python3 forecast_agent.py
python3 enforcement_agent.py
python3 simulation_agent.py
```

Each script prints a summary and writes full JSON to `data/`. Once
`data/aqi_stations_*.json` exists, every `backend/` endpoint switches from
`data_source: "cached_run"` to `"live_pipeline"` automatically — no code
changes needed, the frontend picks it up on next fetch.

### Scheduling ingestion (needed for real forecasts, not just real attribution)

`forecast_agent.py`'s trend component needs *several* readings over time —
running `fetch_waqi.py` once only gives it one point, which is why
`forecast_results.json` today shows `trend_adjustment: 0.0` for every
station. Run step 2 above on a repeating schedule well before you need real
forecasts:

```bash
# cron (Linux/macOS) — every 30 min
*/30 * * * * cd /path/to/aqi-project-final && WAQI_TOKEN=xxx ./.venv/bin/python3 ingestion/fetch_waqi.py --city delhi --detail

# Windows Task Scheduler — Action: Start a program
#   Program: C:\path\to\.venv\Scripts\python.exe
#   Arguments: ingestion\fetch_waqi.py --city delhi --detail
#   Trigger: repeat every 30 minutes
```

`agents/forecast_agent.py`'s `main()` still only reads the *latest* file for
`recent_readings` (a known limitation, see below) — logging history alone
isn't enough yet; extending it to read back N ingestion runs is a small,
self-contained change if you have time.

## Known limitations to fix or disclose honestly to judges

- `forecast_agent.py`'s `recent_readings` is currently seeded with just the
  latest value — you need to run `fetch_waqi.py` on a schedule (see
  "Scheduling ingestion" above) and accumulate history for the trend
  component to mean anything. Do this early — it needs lead time.
- `generate_registry_demo.py` output is synthetic. Say so on your slide.
  If you have an hour to spare, seed 10-20 real entries from Delhi's DPCC
  consent-to-operate lists for credibility.
- `RAIN_AQI_REDUCTION_PCT` in simulation_agent.py (0.30) is an assumed
  coefficient, not sourced from a study — label it as an assumption if asked.
- Traffic isn't its own attribution source_type yet (proxied via
  diesel_generator_cluster). Add an OSM road-density layer to
  attribution_agent.py if you have time on day 2 — this is a real gap in
  the current source model, not just a naming issue.

## Cut from the original AirOS design doc for the 72-hour solo build

Auth/roles/admin panel, WebSockets, PostGIS, feature store, model
versioning/retraining, notifications, PDF report generation, inspection
photo upload, Intervention Learning Agent. These are described in the
architecture doc as "designed for production, out of scope for this
prototype" — do not attempt to build them live.

## 72-hour build order

| Day | Focus |
|---|---|
| 1 (0-24h) | Real data ingestion running + logged over time; attribution + forecast agents validated against real Delhi data; basic map |
| 2 (24-48h) | Enforcement queue + Simulation agent wired into UI; second city if time allows; forecast RMSE-vs-persistence number computed and on a slide |
| 3 (48-72h) | Citizen advisory (simple templated), UI polish, deck, demo video, rehearsal — freeze features by hour 60, polish only after |
