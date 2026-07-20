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
```

## Setup (run this first, on your own machine — this sandbox can't reach
## external APIs)

```bash
# 1. Get a free WAQI token (10 seconds, no approval wait):
#    https://aqicn.org/data-platform/token/
export WAQI_TOKEN=your_token_here

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

Each script prints a summary and writes full JSON to `data/`.

## Known limitations to fix or disclose honestly to judges

- `forecast_agent.py`'s `recent_readings` is currently seeded with just the
  latest value — you need to run `fetch_waqi.py` on a schedule (cron, or just
  manually every hour during the hackathon) and accumulate history for the
  trend component to mean anything. Do this early — it needs lead time.
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
