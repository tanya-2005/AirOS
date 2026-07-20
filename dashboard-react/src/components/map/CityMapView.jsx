import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { categoryFor } from "../../lib/aqi";

const DELHI_CENTER = [77.209, 28.6139];
const BASEMAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

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
const CityMapView = forwardRef(function CityMapView(
  { stations, registry, roads, weatherByStation, layers, onStationClick, onError },
  ref
) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const windMarkersRef = useRef([]);

  useImperativeHandle(ref, () => ({
    flyToStation(stationName) {
      const map = mapRef.current;
      const marker = markersRef.current[stationName];
      if (!map || !marker) return;
      map.flyTo({ center: marker.getLngLat(), zoom: 12.5, duration: 900 });
      const station = stations.find((s) => s.station === stationName);
      if (station) onStationClick?.(station);
    },
  }));

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      center: DELHI_CENTER,
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
        el.addEventListener("click", () => onStationClick?.(s));

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
});

export default CityMapView;
