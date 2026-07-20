# AirOS Command — Dashboard

React + Vite + Tailwind + Recharts + lucide-react. Built and verified in this
project (`npm install` && `npm run build` both run clean, zero vulnerabilities,
zero errors — tested before handoff, not just assumed to work).

## Run it

```bash
npm install
npm run dev      # dev server with hot reload, for building/iterating
# or
npm run build && npm run preview   # production build + local preview
```

## What's real vs sample here

- All layout, styling, gauge math, and the simulation calculation are real,
  working code.
- The DATA in `src/data.js` is the actual output of the tested Python
  pipeline (`../agents/*.py`) run against placeholder AQI values — this dev
  sandbox can't reach the live WAQI API. The numbers aren't fabricated, but
  they're not live either.
- **Before your demo:** run the real ingestion + agents (`../ingestion/`,
  `../agents/`), then either (a) have `data.js` import the fresh JSON files
  instead of the hardcoded arrays, or (b) regenerate `data.js` from the new
  JSON — whichever is faster for you day-of.

## Structure

- `src/AQIGauge.jsx` — the signature element, a custom SVG gauge using
  India's real CPCB AQI category bands/colors (Good/Satisfactory/Moderate/
  Poor/Very Poor/Severe), not a generic 0-100 gauge.
- `src/data.js` — sample data + a JS port of `simulation_agent.py`'s math
  (same formula, same coefficients — numbers match the Python output).
- `src/App.jsx` — everything else: hotspot list, attribution panel,
  forecast chart (Recharts), enforcement queue, simulation controls.

## Next build steps (in priority order)

1. Wire `fetch_waqi.py` output into `data.js` (or fetch the JSON at runtime)
2. Add a real ward map — current build uses a list, not a spatial view;
   a simple SVG scatter plot (lat/lon → x/y) would be faster to ship than
   pulling in Leaflet/Mapbox and risking map-tile-loading issues mid-demo
3. Citizen advisory card (day 3, keep it simple — templated text is fine)
