import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { categoryFor } from "../../lib/aqi";
import { sourceMeta } from "../../lib/sources";

const DELHI_CENTER = [77.209, 28.6139];
const BASEMAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

function popupHtml(station) {
  const cat = categoryFor(station.aqi);
  const top = station.attribution?.[0];
  const topMeta = top ? sourceMeta(top.source_type) : null;
  return `
    <div style="font-family: 'Helvetica Neue', sans-serif; min-width: 200px;">
      <div style="font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: .08em; color: #8A8F96; text-transform: uppercase;">
        ${cat.label}
      </div>
      <div style="font-family: 'Newsreader', serif; font-size: 20px; color: #141618; margin-top: 4px;">
        ${station.station}
      </div>
      <div style="display:flex; align-items:baseline; gap:6px; margin-top:6px;">
        <span style="font-family:'Newsreader',serif; font-size:28px; color:${cat.color};">${Math.round(station.aqi)}</span>
        <span style="font-size:12px; color:#6B6F75;">AQI</span>
      </div>
      ${topMeta ? `<div style="font-size:12.5px; color:#6B6F75; margin-top:6px;">Top source: <strong style="color:#141618;">${topMeta.label}</strong> (${Math.round(top.confidence * 100)}%)</div>` : ""}
      <a href="/attribution?station=${encodeURIComponent(station.station)}"
         style="display:inline-block; margin-top:10px; font-size:12.5px; color:#1F7A85; font-weight:500; text-decoration:none;">
        View full attribution →
      </a>
    </div>
  `;
}

function registryGeoJson(records) {
  return {
    type: "FeatureCollection",
    features: records.map((r) => ({
      type: "Feature",
      properties: { source_type: r.source_type },
      geometry: { type: "Point", coordinates: [r.lon, r.lat] },
    })),
  };
}

/**
 * Raw MapLibre GL wrapper (no react-map-gl) — Delhi NCR, CARTO Positron
 * basemap, registry-density heatmap layer, station markers colored by AQI
 * category with click-through popovers. Imperative `flyToStation` lets the
 * sidebar list drive the map without prop-drilling map internals back up.
 */
const CityMapView = forwardRef(function CityMapView({ stations, registry, onError }, ref) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});

  useImperativeHandle(ref, () => ({
    flyToStation(stationName) {
      const map = mapRef.current;
      const marker = markersRef.current[stationName];
      if (!map || !marker) return;
      map.flyTo({ center: marker.getLngLat(), zoom: 12.5, duration: 900 });
      marker.togglePopup();
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
      markersRef.current = {};
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Registry heatmap — added/updated once the style has loaded.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !registry?.length) return;

    function addHeat() {
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
    }

    if (map.isStyleLoaded()) addHeat();
    else map.once("load", addHeat);
  }, [registry]);

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

        const popup = new maplibregl.Popup({ offset: 14, closeButton: true, maxWidth: "260px" }).setHTML(
          popupHtml(s)
        );
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([s.lon, s.lat])
          .setPopup(popup)
          .addTo(map);
        markersRef.current[s.station] = marker;
      });
    }

    if (map.isStyleLoaded()) addMarkers();
    else map.once("load", addMarkers);
  }, [stations]);

  return <div ref={containerRef} className="w-full h-full rounded-card overflow-hidden" />;
});

export default CityMapView;
