import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { categoryFor } from "../../lib/aqi";

const DEFAULT_CENTER = [77.209, 28.6139]; // Delhi — used only if no `center` prop is passed
const BASEMAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const EMPTY_FC = { type: "FeatureCollection", features: [] };

// source_type -> map marker color, kept independent of sourceMeta's Badge
// tones (those are Tailwind classes; these need to be literal hex for
// MapLibre's paint expressions).
const SOURCE_COLORS = {
  industrial_stack: "#B7502C",
  waste_burning_zone: "#9A2F41",
  construction_site: "#9A7217",
  traffic_corridor: "#1F7A85",
  diesel_generator_cluster: "#6E7679",
};
const SOURCE_COLOR_MATCH = ["match", ["get", "source_type"], ...Object.entries(SOURCE_COLORS).flat(), "#6E7679"];

function registryGeoJson(records) {
  return {
    type: "FeatureCollection",
    features: records.map((r) => ({
      type: "Feature",
      properties: { source_type: r.source_type, source: r.source || "synthetic" },
      geometry: { type: "Point", coordinates: [r.lon, r.lat] },
    })),
  };
}

function windArrowElement(windDirection) {
  const el = document.createElement("div");
  el.style.width = "22px";
  el.style.height = "22px";
  el.style.pointerEvents = "none";
  // wind_direction is where the wind blows FROM; the arrow should point
  // where it's blowing TO, hence +180. Base SVG arrow points North (up).
  el.style.transform = `rotate(${(windDirection + 180) % 360}deg)`;
  el.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 22 22">
      <path d="M11 2 L16 13 L11 10 L6 13 Z" fill="#125A63" stroke="white" stroke-width="1" />
    </svg>`;
  return el;
}

/**
 * Raw MapLibre GL wrapper (no react-map-gl) — Delhi NCR, CARTO Positron
 * basemap. Milestone 3: toggleable layers (stations, heatmap, roads,
 * industrial zones, landfills, wind arrows) instead of a fixed set;
 * clicking a station now calls onStationClick (a rich React evidence
 * panel) instead of showing a maplibre HTML popup.
 */
export default function CityMapView({ stations, registry, roads, weatherByStation, layers, center, evidenceStation, onStationClick, onError }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const windMarkersRef = useRef([]);
  const initialCenterRef = useRef(center || DEFAULT_CENTER);

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      center: initialCenterRef.current,
      zoom: 10.2,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("error", (e) => {
      console.error("MapLibre error", e?.error);
      onError?.();
    });

    return () => {
      Object.values(markersRef.current).forEach((m) => m.remove());
      windMarkersRef.current.forEach((m) => m.remove());
      markersRef.current = {};
      windMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Multi-City: the map instance persists across a city switch (this
  // component doesn't unmount, only its data props change) — station
  // markers/registry heatmap/roads already correctly refresh via their own
  // prop-driven effects below (setData replaces the old city's features),
  // this is the one thing that needs an explicit recenter.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;
    function recenter() {
      map.flyTo({ center, zoom: 10.2, duration: 900 });
    }
    if (map.isStyleLoaded()) recenter();
    else map.once("load", recenter);
  }, [center]);

  // Registry source + heatmap/industrial/landfill layers — added once,
  // then just have their data refreshed on change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !registry?.length) return;

    function addLayers() {
      const data = registryGeoJson(registry);
      if (map.getSource("registry")) {
        map.getSource("registry").setData(data);
        return;
      }
      map.addSource("registry", { type: "geojson", data });
      map.addLayer({
        id: "registry-heat",
        type: "heatmap",
        source: "registry",
        maxzoom: 14,
        paint: {
          "heatmap-weight": 0.7,
          "heatmap-intensity": 0.8,
          "heatmap-radius": 26,
          "heatmap-opacity": 0.55,
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(31,122,133,0)",
            0.3, "rgba(31,122,133,0.35)",
            0.6, "rgba(154,47,65,0.55)",
            1, "rgba(154,47,65,0.85)",
          ],
        },
      });
      map.addLayer({
        id: "industrial-points",
        type: "circle",
        source: "registry",
        filter: ["==", ["get", "source_type"], "industrial_stack"],
        paint: {
          "circle-radius": 4.5,
          "circle-color": SOURCE_COLORS.industrial_stack,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#fff",
        },
      });
      map.addLayer({
        id: "landfill-points",
        type: "circle",
        source: "registry",
        filter: ["==", ["get", "source_type"], "waste_burning_zone"],
        paint: {
          "circle-radius": 4.5,
          "circle-color": SOURCE_COLORS.waste_burning_zone,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#fff",
        },
      });
    }

    if (map.isStyleLoaded()) addLayers();
    else map.once("load", addLayers);
  }, [registry]);

  // Roads layer.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !roads?.features?.length) return;

    function addRoads() {
      if (map.getSource("roads")) {
        map.getSource("roads").setData(roads);
        return;
      }
      map.addSource("roads", { type: "geojson", data: roads });
      map.addLayer({
        id: "roads-line",
        type: "line",
        source: "roads",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": SOURCE_COLORS.traffic_corridor,
          "line-width": 1.5,
          "line-opacity": 0.55,
        },
      });
    }

    if (map.isStyleLoaded()) addRoads();
    else map.once("load", addRoads);
  }, [roads]);

  // Station markers — rebuilt whenever the station list changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function addMarkers() {
      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};

      stations.forEach((s) => {
        if (s.lat == null || s.lon == null) return;
        const cat = categoryFor(s.aqi);
        const el = document.createElement("div");
        el.style.width = "18px";
        el.style.height = "18px";
        el.style.borderRadius = "50%";
        el.style.background = cat.color;
        el.style.border = "2.5px solid white";
        el.style.boxShadow = "0 2px 8px rgba(20,22,24,.35)";
        el.style.cursor = "pointer";
        el.style.transition = "transform 150ms ease, box-shadow 150ms ease";
        el.addEventListener("click", () => onStationClick?.(s));
        el.addEventListener("mouseenter", () => {
          el.style.transform = "scale(1.3)";
          el.style.boxShadow = "0 4px 14px rgba(20,22,24,.45)";
        });
        el.addEventListener("mouseleave", () => {
          el.style.transform = "scale(1)";
          el.style.boxShadow = "0 2px 8px rgba(20,22,24,.35)";
        });

        const marker = new maplibregl.Marker({ element: el }).setLngLat([s.lon, s.lat]).addTo(map);
        markersRef.current[s.station] = marker;
      });
    }

    if (map.isStyleLoaded()) addMarkers();
    else map.once("load", addMarkers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations]);

  // Wind direction arrows — one per station with current weather.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function addWindArrows() {
      windMarkersRef.current.forEach((m) => m.remove());
      windMarkersRef.current = [];
      if (!weatherByStation) return;

      stations.forEach((s) => {
        if (s.lat == null || s.lon == null) return;
        const w = weatherByStation[s.station];
        if (!w || w.wind_direction == null) return;
        const marker = new maplibregl.Marker({ element: windArrowElement(w.wind_direction), anchor: "center" })
          .setLngLat([s.lon + 0.006, s.lat + 0.006]) // small offset so it doesn't sit exactly under the station dot
          .addTo(map);
        windMarkersRef.current.push(marker);
      });
    }

    if (map.isStyleLoaded()) addWindArrows();
    else map.once("load", addWindArrows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations, weatherByStation]);

  // Attribution lines — the signature moment: when a station's evidence
  // panel is open, draw real lines from that station to the exact nearby
  // registry sources that drove its attribution score (the same ≤5 records
  // EvidenceTable lists, contribution > 0.15), weighted by their real
  // contribution and colored by source type, then frame the camera around
  // the whole picture. Every coordinate is real — the station's own
  // lat/lon and each source's registry lat/lon, cross-referenced by
  // evidence.source_id === registry.id — nothing here is invented or
  // approximated. This is the one place a percentage in a sidebar table
  // becomes something you can see connect to an actual point on the map.
  // Clears the moment the panel closes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function updateAttributionLines() {
      const hasLayers = map.getSource("attribution-lines");
      const evidence = evidenceStation?.evidence;

      if (!evidence?.length || evidenceStation.lat == null || evidenceStation.lon == null) {
        if (hasLayers) {
          map.getSource("attribution-lines").setData(EMPTY_FC);
          map.getSource("attribution-targets").setData(EMPTY_FC);
        }
        if (evidenceStation?.lat != null && evidenceStation?.lon != null) {
          map.flyTo({ center: [evidenceStation.lon, evidenceStation.lat], zoom: 12.5, duration: 900 });
        }
        return;
      }

      const registryById = new Map((registry ?? []).map((r) => [r.id, r]));
      const maxContribution = Math.max(...evidence.map((e) => e.contribution), 0.0001);
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([evidenceStation.lon, evidenceStation.lat]);

      const lineFeatures = [];
      const targetFeatures = [];
      for (const e of evidence) {
        const record = registryById.get(e.source_id);
        if (record?.lat == null || record?.lon == null) continue;
        bounds.extend([record.lon, record.lat]);
        lineFeatures.push({
          type: "Feature",
          properties: { source_type: e.source_type, weight: Math.min(1, e.contribution / maxContribution) },
          geometry: { type: "LineString", coordinates: [[evidenceStation.lon, evidenceStation.lat], [record.lon, record.lat]] },
        });
        targetFeatures.push({
          type: "Feature",
          properties: { source_type: e.source_type },
          geometry: { type: "Point", coordinates: [record.lon, record.lat] },
        });
      }

      const lineData = { type: "FeatureCollection", features: lineFeatures };
      const targetData = { type: "FeatureCollection", features: targetFeatures };

      if (hasLayers) {
        map.getSource("attribution-lines").setData(lineData);
        map.getSource("attribution-targets").setData(targetData);
      } else {
        map.addSource("attribution-lines", { type: "geojson", data: lineData });
        map.addLayer({
          id: "attribution-lines-layer",
          type: "line",
          source: "attribution-lines",
          layout: { "line-cap": "round" },
          paint: {
            "line-color": SOURCE_COLOR_MATCH,
            "line-width": ["interpolate", ["linear"], ["get", "weight"], 0, 1.5, 1, 4.5],
            "line-opacity": 0.85,
            "line-dasharray": [2, 1.5],
          },
        });
        map.addSource("attribution-targets", { type: "geojson", data: targetData });
        map.addLayer({
          id: "attribution-targets-layer",
          type: "circle",
          source: "attribution-targets",
          paint: {
            "circle-radius": 7,
            "circle-color": SOURCE_COLOR_MATCH,
            "circle-stroke-width": 2.5,
            "circle-stroke-color": "#fff",
          },
        });
      }

      if (lineFeatures.length) {
        // Extra right padding keeps the drawn lines clear of the evidence
        // panel overlay (360px wide) that opens over the right side of the map.
        map.fitBounds(bounds, { padding: { top: 90, bottom: 90, left: 90, right: 400 }, duration: 900, maxZoom: 14 });
      } else {
        map.flyTo({ center: [evidenceStation.lon, evidenceStation.lat], zoom: 12.5, duration: 900 });
      }
    }

    if (map.isStyleLoaded()) updateAttributionLines();
    else map.once("load", updateAttributionLines);
  }, [evidenceStation, registry]);

  // Layer visibility toggles — GL layers via setLayoutProperty, DOM-marker
  // layers (stations, wind) via display style, all driven by the same
  // `layers` prop so the sidebar checkboxes are the single source of truth.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layers) return;

    function applyVisibility() {
      const glLayerVisibility = {
        "registry-heat": layers.heatmap,
        "industrial-points": layers.industrial,
        "landfill-points": layers.landfills,
        "roads-line": layers.roads,
      };
      for (const [id, visible] of Object.entries(glLayerVisibility)) {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
        }
      }
      Object.values(markersRef.current).forEach((m) => {
        m.getElement().style.display = layers.stations ? "" : "none";
      });
      windMarkersRef.current.forEach((m) => {
        m.getElement().style.display = layers.wind ? "" : "none";
      });
    }

    if (map.isStyleLoaded()) applyVisibility();
    else map.once("load", applyVisibility);
  }, [layers]);

  return <div ref={containerRef} className="w-full h-full rounded-card overflow-hidden" />;
}
