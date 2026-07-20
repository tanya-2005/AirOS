import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPinned } from "lucide-react";

import SectionHeading from "../components/ui/SectionHeading";
import LiveDot from "../components/ui/LiveDot";
import QueryState from "../components/ui/QueryState";
import DataSourceBadge from "../components/ui/DataSourceBadge";
import { SkeletonCard } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import Footer from "../components/layout/Footer";

import HotspotList from "../components/command/HotspotList";
import CityMapView from "../components/map/CityMapView";
import MapLegend from "../components/map/MapLegend";
import MapErrorFallback from "../components/map/MapErrorFallback";
import LayerToggle from "../components/map/LayerToggle";
import StationEvidencePanel from "../components/map/StationEvidencePanel";

import { useAttribution, useForecast, useRegistry, useRoads, useWeatherCurrent } from "../lib/hooks/useApi";
import { fadeUp } from "../lib/motion";

const DEFAULT_LAYERS = {
  stations: true,
  heatmap: true,
  roads: false,
  industrial: false,
  landfills: false,
  wind: false,
};

export default function CityMap() {
  const attributionQuery = useAttribution();
  const forecastQuery = useForecast();
  const registryQuery = useRegistry();
  const roadsQuery = useRoads();
  const weatherQuery = useWeatherCurrent();
  const [searchParams, setSearchParams] = useSearchParams();
  const mapRef = useRef(null);
  const [mapErrored, setMapErrored] = useState(false);
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [evidenceStation, setEvidenceStation] = useState(null);

  function toggleLayer(key) {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const weatherByStation = useMemo(() => {
    const map = {};
    for (const w of weatherQuery.data?.data ?? []) map[w.station_name] = w;
    return map;
  }, [weatherQuery.data]);

  const stations = useMemo(() => {
    const attribution = attributionQuery.data?.data ?? [];
    const coordsByStation = new Map((forecastQuery.data?.data ?? []).map((f) => [f.station, f]));
    return [...attribution]
      .map((s) => {
        const coords = coordsByStation.get(s.station);
        return coords ? { ...s, lat: coords.lat, lon: coords.lon } : s;
      })
      .sort((a, b) => b.aqi - a.aqi);
  }, [attributionQuery.data, forecastQuery.data]);

  const mappable = stations.filter((s) => s.lat != null && s.lon != null);
  const registry = registryQuery.data?.data ?? [];

  const requestedStation = searchParams.get("station");
  const [selected, setSelected] = useState(requestedStation || null);

  useEffect(() => {
    if (selected || !stations.length) return;
    const match = requestedStation && stations.find((s) => s.station === requestedStation);
    setSelected(match ? match.station : stations[0].station);
  }, [stations, selected, requestedStation]);

  const handleSelect = useCallback(
    (name) => {
      setSelected(name);
      setSearchParams(name ? { station: name } : {}, { replace: true });
      mapRef.current?.flyToStation(name);
      const station = stations.find((s) => s.station === name);
      if (station) setEvidenceStation(station);
    },
    [stations, setSearchParams]
  );

  const isEmpty = attributionQuery.data?.data_source === "empty";

  return (
    <>
      <main className="max-w-content mx-auto px-5 md:px-10 pb-28 flex-1 w-full">
        <motion.section initial="hidden" animate="show" variants={fadeUp} className="pt-14 pb-2">
          <LiveDot label="City intelligence · spatial view" />
          <h1 className="font-display font-normal text-[44px] md:text-[64px] leading-[1.02] tracking-[-.02em] mt-4 text-ink">
            City Intelligence Map
          </h1>
          <div className="flex gap-3.5 items-start mt-5 max-w-[820px]">
            <div className="shrink-0 w-[34px] h-[34px] rounded-[9px] bg-ink flex items-center justify-center mt-0.5">
              <MapPinned size={17} className="text-panel-accent" strokeWidth={1.6} />
            </div>
            <p className="text-[17px] md:text-[19px] leading-[1.55] text-[#33363A]">
              Every monitored station plotted by AQI category, with real OpenStreetMap layers — industrial
              zones, landfills, major roads — and live wind direction. Click a station for a full evidence
              panel: nearby sources, distances, contribution, and current weather.
            </p>
          </div>
          {attributionQuery.data && (
            <div className="mt-6">
              <DataSourceBadge source={attributionQuery.data.data_source} />
            </div>
          )}
        </motion.section>

        <QueryState
          isLoading={attributionQuery.isLoading || forecastQuery.isLoading}
          isError={attributionQuery.isError}
          error={attributionQuery.error}
          onRetry={attributionQuery.refetch}
          isEmpty={isEmpty}
          loading={<SkeletonCard lines={8} />}
          empty={
            <EmptyState
              title="No station data yet"
              description="Run ingestion and the attribution/forecast agents to populate the map — see the README's local development section."
            />
          }
        >
          <section className="mt-10">
            <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
              <div>
                <SectionHeading eyebrow="05 · HOTSPOTS" title="Ranked by severity" className="mb-[18px]" />
                <HotspotList stations={stations} selected={selected} onSelect={handleSelect} />
              </div>
              <div className="relative h-[560px] lg:h-[680px] rounded-card border border-border overflow-hidden bg-search">
                {mapErrored ? (
                  <MapErrorFallback stations={mappable} />
                ) : mappable.length > 0 ? (
                  <>
                    <CityMapView
                      ref={mapRef}
                      stations={mappable}
                      registry={registry}
                      roads={roadsQuery.data?.data}
                      weatherByStation={weatherByStation}
                      layers={layers}
                      onStationClick={setEvidenceStation}
                      onError={() => setMapErrored(true)}
                    />
                    <MapLegend />
                    <LayerToggle layers={layers} onToggle={toggleLayer} />
                    <StationEvidencePanel
                      station={evidenceStation}
                      weather={evidenceStation ? weatherByStation[evidenceStation.station] : null}
                      onClose={() => setEvidenceStation(null)}
                    />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[13.5px] text-muted-3 text-center px-8">
                    No station has coordinates yet — the forecast feed (which carries lat/lon) hasn't returned
                    data for these stations.
                  </div>
                )}
              </div>
            </div>
          </section>
        </QueryState>
      </main>
      <Footer
        pageLabel="CITY MAP"
        note="MapLibre GL · CARTO Positron basemap · registry density heat layer"
      />
    </>
  );
}
