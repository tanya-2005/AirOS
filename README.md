# AirOS / AQI Intelligence Pipeline — Hackathon Scaffold

Track: Attribution → Forecast → Enforcement (+ Simulation), for AI-Powered
Urban Air Quality Intelligence for Smart City Intervention.

## What's here

```
ingestion/
  fetch_waqi.py            Real-time AQI (WAQI/CPCB stations) — needs free token
  fetch_weather.py         Real CURRENT weather per station (Open-Meteo) — no key needed
  history_store.py         Shared append-only JSONL history log (see "How history works")
  scheduler.py             Optional 15-min auto-ingestion loop (see "How the scheduler works")
  generate_registry_demo.py Synthetic construction/industrial registry (labeled as such)
agents/
  attribution_agent.py     Scores which source likely caused each AQI hotspot
  forecast_agent.py        24-72h AQI forecast (persistence + trend + wind/humidity/rain/temp),
                            evaluable vs persistence baseline
  enforcement_agent.py     Ranked, evidence-backed action recommendations
  simulation_agent.py      What-if scenarios (traffic/construction reduction, rain)
data/
  registry_demo_delhi.json         Synthetic registry (real, runnable)
  attribution/forecast/enforcement/simulation _*.json   Sample outputs from a
    placeholder test run — these prove the pipeline works end-to-end, but
    they are NOT real AQI data. Delete and regenerate with real data before
    your demo.
  aqi_stations_<city>_<ts>.json, weather_<city>_<ts>.json   Latest live
    snapshots, one file per ingestion run (see "How weather works" below).
  history/aqi_<city>.jsonl, history/weather_<city>.jsonl   Rolling 7-day
    append-only history (see "How history works" below).
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
python -m uvicorn backend.main:app --reload --port 8001

# Terminal 2 — frontend (Vite)
cd dashboard-react
npm install
npm run dev
```

> **Module path is `backend.main:app`, not `app.main:app`.** There is no
> `app/` package in this repo — the FastAPI instance lives at
> `backend/main.py`, and `backend/__init__.py` is what makes `backend` an
> importable package. Two things have to both be true for this to resolve:
> 1. You run the command **from the repo root** (the directory containing
>    `agents/`, `backend/`, `dashboard-react/`) — not from inside `backend/`.
>    If you `cd backend` first, use `uvicorn main:app` instead (no `backend.` prefix).
> 2. The module path matches the actual folder name: `backend.main:app`.
>
> Using `app.main:app` (or running from inside `backend/` with the
> `backend.` prefix still on) raises `ModuleNotFoundError: No module named 'app'`
> — there's nothing named `app` anywhere in this project.

The frontend already points at the right place — `dashboard-react/.env.example`
sets `VITE_API_BASE_URL=http://localhost:8001`, matching the port above. If
you run the backend on a different port, update that value (or set
`VITE_API_BASE_URL` in a local `.env.local`) to match.

The frontend calls the backend at `VITE_API_BASE_URL` (defaults to
`http://localhost:8001`, see `dashboard-react/.env.example`). Every
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
pip install -r ingestion/requirements.txt   # python-dotenv, one-time

# No `export` needed — fetch_waqi.py loads .env automatically via
# python-dotenv. (fetch_weather.py doesn't need a key at all.)

# 2. Pull real data — weather is fetched per-station, so run this AFTER
#    fetch_waqi.py, not instead of it (it reads the station list that wrote).
cd ingestion
python3 fetch_waqi.py --city delhi --detail
python3 fetch_weather.py --city delhi

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

## Weather, History & Scheduling (Milestone 2)

### Pipeline diagram

```
  WAQI API                              Open-Meteo API
     │                                        │
     ▼                                        ▼
 fetch_waqi.py                        fetch_weather.py
 (per-station AQI)          reads ──▶ (current conditions AT each
     │                    station     AQI station's own lat/lon —
     │                     list       matched by station_name)
     ▼                                        ▼
 data/aqi_stations_                    data/weather_
 <city>_<ts>.json                      <city>_<ts>.json      ◀── "latest snapshot"
     │                                        │                  files, one per run
     ▼                                        ▼
 history_store.append("aqi", …)   history_store.append("weather", …)
     │                                        │
     ▼                                        ▼
 data/history/aqi_<city>.jsonl    data/history/weather_<city>.jsonl
     (rolling 7-day window, one line appended per ingestion run — never replaced)

           ┌─────────────────────────────────────────┐
           │  ingestion/scheduler.py (optional)       │
           │  every 15 min: run_ingestion() for both  │
           └─────────────────────────────────────────┘

 backend/pipeline.py reads the NEWEST snapshot file (by mtime) for "current"
 data, and the *.jsonl logs for historical data:

   get_attribution() / get_forecast() / get_enforcement()
       → latest aqi_stations_*.json (+ weather_*.json for forecast)
       → attribution_agent / forecast_agent / enforcement_agent
       → data_source: live_pipeline | cached_run | empty

   get_weather_current()          → latest weather_*.json
   get_weather_history(hours)     → history_store.read("weather", …)
   get_station_history(name, h)   → history_store.read("aqi", …), filtered to one station
   get_city_history(hours)        → history_store.read("aqi", …), averaged across stations
       → data_source: live_pipeline | empty   (history either exists in the
         requested window or it doesn't — no "cached_run" concept applies here)

                              │
                              ▼
              backend/routers/*.py  (FastAPI — same Envelope pattern as before)
                              │
                              ▼
              dashboard-react Forecast page: current weather panel,
              "why this forecast" weather_effects list, 24h/7d AQI trend chart
```

### How weather works

`fetch_weather.py` no longer takes `--lat`/`--lon` — it reads the most
recent `aqi_stations_<city>_*.json` and fetches Open-Meteo's **current**
conditions (temperature, humidity, wind speed/direction, precipitation) at
every one of those exact station coordinates, so weather is per-station,
not one city-wide average. Each station's weather is matched back to its
AQI reading by `station_name` everywhere downstream (forecast_agent,
pipeline.py, the frontend). A single station's fetch failing (timeout,
malformed response) is caught and skipped — it doesn't abort the whole run;
see the `failed` list `fetch_weather.py` prints at the end.

### How history works

Both ingestion scripts call `history_store.append(kind, city, …)`
immediately after writing their normal snapshot file. History is JSON
Lines (`data/history/<kind>_<city>.jsonl`) — one line per ingestion run,
each holding every station's reading from that run — not a database,
per this project's own hackathon-friendly constraint. Entries older than
7 days are pruned automatically on every append, so the file never grows
unbounded. `backend/pipeline.py` reads it back via
`get_station_history()`/`get_city_history()`/`get_weather_history()`,
filtered to whatever window you ask for (`?hours=24` up to `?hours=168`).

**Known limitation, unchanged from before this milestone:**
`forecast_agent.py`'s trend component still only reads the *single latest*
AQI reading per station (`recent = [s["aqi"]]` in both `forecast_agent.py`'s
own `main()` and `backend/pipeline.py`'s `get_forecast()`) — it does not yet
pull from `history_store` for a real multi-point trend. The history data
now genuinely exists and is queryable via `/api/history/station/{name}`;
wiring `get_station_history()`'s output into `recent_readings` is a small,
self-contained follow-up if you have time, not a data-availability problem
anymore.

### How the scheduler works

`ingestion/scheduler.py` is a single long-running Python process — no
cron, no Task Scheduler entry, no task queue — that calls
`fetch_waqi.run_ingestion()` then `fetch_weather.run_ingestion()` every 15
minutes (`time.sleep()` between cycles), catching and logging any failure
per cycle so one bad WAQI/Open-Meteo response doesn't kill the loop.

```bash
# Run it (from the repo root, with .venv active):
python ingestion/scheduler.py --city delhi

# One cycle and exit, instead of looping forever:
python ingestion/scheduler.py --city delhi --once

# Different interval (seconds):
python ingestion/scheduler.py --city delhi --interval 300
```

**It's entirely optional.** Manual `fetch_waqi.py` / `fetch_weather.py`
runs work exactly the same with or without it running — nothing else in
the project depends on the scheduler being alive; the backend just reads
whatever's newest in `data/` on every request. If you want it to survive
your terminal closing, run it as an actual background/cron job instead:

```bash
# cron (Linux/macOS) — start once at boot, let the script's own loop handle timing
@reboot cd /path/to/aqi-project-final && ./.venv/bin/python3 ingestion/scheduler.py --city delhi >> scheduler.log 2>&1 &

# Windows Task Scheduler — Action: Start a program
#   Program: C:\path\to\.venv\Scripts\python.exe
#   Arguments: ingestion\scheduler.py --city delhi
#   Trigger: At log on (runs once, the script's own internal loop handles the rest)
```

## Real Geospatial Registry & Map (Milestone 3)

### What's real now, what's still synthetic

Run `python ingestion/fetch_osm_registry.py --city delhi` (after `fetch_waqi.py`
has run at least once) to replace the synthetic pollution registry with real
OpenStreetMap data wherever a source type has a reliable tag:

| source_type | Real dataset | Fallback if OSM fails/unavailable |
|---|---|---|
| `construction_site` | OSM `landuse=construction` | Synthetic, per-category |
| `industrial_stack` | OSM `landuse=industrial` | Synthetic, per-category |
| `waste_burning_zone` | OSM landfill/waste-disposal tags | Synthetic, per-category |
| `traffic_corridor` | OSM `highway=motorway/trunk` — **new** source type, closes this project's own long-flagged gap ("traffic isn't its own attribution source") | None — omitted, not faked, if OSM is unreachable |
| `diesel_generator_cluster` | **No public dataset exists** for this — always synthetic | — |

Each category is fetched and retried independently, so one failing (the
free public Overpass instance rate-limits and occasionally 504s under
load — confirmed while building this) doesn't take the others down.
`data/registry_delhi.json`'s `"summary"` field records exactly what
happened on each run — real count, fallback count, or the error, per
category. Every record carries `"source": "openstreetmap" | "synthetic_fallback"`
so real and fallback data are never presented identically in the UI
(RegistryBrowser shows it, `permit_status: "unknown"` is used for real OSM
records instead of falsely implying a checked "unregistered" status).

Government open datasets (data.gov.in, DPCC consent-to-operate lists) were
evaluated but **not** integrated — they need manual portal registration and
dataset-specific parsing that can't be verified to keep working unattended.
Said so here rather than faking an integration.

`ingestion/fetch_osm_registry.py` also writes `data/roads_delhi.json` (a
GeoJSON FeatureCollection, separate from the registry — roads are a linear
map layer, not point/area pollution sources) for the Map page's roads layer.

### Attribution Agent v2

`agents/attribution_agent.py`'s `attribute_station()` gained two new,
**optional** factors on top of the original distance-decay model:

- **Wind-aware scoring** — pass `weather={"wind_direction":…, "wind_speed":…}`
  (per-station, from `fetch_weather.py`) and sources currently upwind of the
  station (wind blowing FROM their direction) get boosted; downwind-of-the-
  station sources get discounted. Simplified cosine-falloff on compass
  bearing, not a Gaussian plume model — same "auditable math" standard as
  the rest of this file.
- **Source size** — `area_sqm` on a registry record (when the ingestion
  script captured polygon geometry) gives a modest sqrt-scaled boost.

**Backward compatible by construction, not just by claim**: call
`attribute_station(station, registry)` the old 2-argument way, or with
records that have no `area_sqm` field, and you get numerically **identical**
output to before this milestone — verified directly (Wazirpur's raw scores:
3.124 / 1.643 / 1.406, unchanged). `backend/pipeline.py`'s `get_attribution()`
now passes real per-station wind data, so `/api/attribution` itself IS
wind-aware in practice; the function signature just doesn't require it.

### Map page

New toggleable MapLibre layers (`components/map/LayerToggle.jsx`): AQI
stations, source-density heatmap, roads, industrial zones, landfills, wind
direction arrows (rotated per station from live weather). Clicking a
station opens `StationEvidencePanel` — a slide-in panel with nearby
sources, distances, contribution, current weather (reuses Milestone 2's
`CurrentWeatherPanel`), confidence, and a plain-language explanation —
replacing the old lightweight HTML popup.

### Assumptions

- `/api/history/station/{id}` and evidence-panel station identity: `{id}`
  is the station's display **name** (URL-encoded), not a numeric ID —
  consistent with every other station-scoped part of this API.
- Real OSM records are assigned to the *nearest* of the synthetic
  registry's existing ward centroids (a spatial-join approximation, not
  real Delhi ward boundary polygons, which aren't in this dataset).
- `traffic_corridor` records are each highway *way segment's centroid*,
  not the full road geometry — a long trunk road's centroid may sit far
  from where it actually passes near a given station. The roads *map
  layer* (`roads_delhi.json`) has the full real geometry; only the
  *attribution registry* entry is simplified to a point, for consistency
  with how every other source type is scored (distance-to-a-point).
- Wind/size coefficients (the 0.5–1.5× wind multiplier, the sqrt-scaled
  size factor) are hand-picked, explainable constants, not fitted to any
  dataset — flagged in code comments the same way `RAIN_AQI_REDUCTION_PCT`
  already was.

## Known limitations to fix or disclose honestly to judges

- `forecast_agent.py`'s `recent_readings` is currently seeded with just the
  latest value, even though `data/history/aqi_<city>.jsonl` now accumulates
  real history (see "How history works" above) — that history isn't wired
  into the trend calculation yet. Run `ingestion/scheduler.py` (or
  `fetch_waqi.py` on a schedule) early, well before you need real trends,
  so the history exists whenever you do get to that follow-up.
- `generate_registry_demo.py` output is synthetic. Say so on your slide.
  If you have an hour to spare, seed 10-20 real entries from Delhi's DPCC
  consent-to-operate lists for credibility.
- `RAIN_AQI_REDUCTION_PCT` in simulation_agent.py (0.30) and the new
  rain/temperature coefficients in `forecast_agent.py`'s `forecast_station()`
  (3 AQI points/mm of rain, 1.2 AQI points/°C below 18°C) are all assumed
  constants, not sourced from a study — label them as assumptions if asked.
- ~~Traffic isn't its own attribution source_type~~ — **fixed in Milestone
  3**: `traffic_corridor` is now a real source type backed by OSM highway
  data (see "Real Geospatial Registry & Map" above). Scenario Lab's own
  lever-to-source mapping (`dashboard-react/src/lib/scenario.js`) still
  proxies its "heavy vehicle restriction" UI lever partly onto
  `diesel_generator_cluster` rather than the new `traffic_corridor` type —
  worth revisiting now that a real traffic source exists.
- `fetch_osm_registry.py` fetches OSM geometry with `out center` (fast,
  reliable against a rate-limited free API) rather than `out geom` (full
  polygon boundary), which means `area_sqm` — and therefore
  `attribution_agent.py`'s size-based scoring boost — is `None` for every
  real record today. The size-factor code path is real and tested (just
  not exercised by current data); switching specific categories to
  `out geom` would enable it at the cost of slower, more failure-prone
  fetches.
- While testing Milestone 3, `enforcement_agent.py` (unmodified — out of
  this milestone's scope) was observed labeling industrial-stack and
  construction-site recommendations with the same "Deploy enforcement
  patrol to stop burning" action text used for waste-burning zones. Looks
  like a pre-existing action-text mapping gap in that agent, not something
  Milestone 3 introduced — flagging for whoever picks up enforcement_agent.py next.

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
