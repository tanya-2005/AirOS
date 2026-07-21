import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Layers, MapPin, ClipboardList, MapPinned, Database, Search } from "lucide-react";

import SectionHeading from "../components/ui/SectionHeading";
import PageHero from "../components/ui/PageHero";
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
import WorkflowNav from "../components/workflow/WorkflowNav";

import { useAttribution, useForecast, useRegistry, useRoads, useWeatherCurrent, useIncidents, useStationHealthAdvisory } from "../lib/hooks/useApi";
import { useCity } from "../lib/city/useCity";
import { activeIncidentForStation } from "../lib/incidents";

const DEFAULT_LAYERS = {
  stations: true,
  heatmap: true,
  roads: false,
  industrial: false,
  landfills: false,
  wind: false,
};

export default function CityMap() {
  const { city, cityMeta } = useCity();
  const attributionQuery = useAttribution();
  const forecastQuery = useForecast();
  const registryQuery = useRegistry();
  const roadsQuery = useRoads();
  const weatherQuery = useWeatherCurrent();
  const incidentsQuery = useIncidents();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mapErrored, setMapErrored] = useState(false);
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [evidenceStation, setEvidenceStation] = useState(null);
  const stationHealthQuery = useStationHealthAdvisory(evidenceStation?.station);

  function toggleLayer(key) {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const weatherByStation = useMemo(() => {
    const map = {};
    for (const w of weatherQuery.data?.data ?? []) map[w.station_name] = w;
    return map;
  }, [weatherQuery.data]);

  const forecastByStation = useMemo(() => {
    const map = {};
    for (const f of forecastQuery.data?.data ?? []) map[f.station] = f;
    return map;
  }, [forecastQuery.data]);

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

  // Switching cities in the nav invalidates whatever was selected/open for
  // the previous one (a Delhi station name means nothing once the map is
  // showing Mumbai) — clear it and let the effect below pick this city's
  // first station instead of silently showing stale state.
  useEffect(() => {
    setSelected(null);
    setEvidenceStation(null);
    setMapErrored(false);
  }, [city]);

  useEffect(() => {
    if (selected || !stations.length) return;
    const match = requestedStation && stations.find((s) => s.station === requestedStation);
    setSelected(match ? match.station : stations[0].station);
  }, [stations, selected, requestedStation]);

  // Camera movement + the attribution-lines reveal both live inside
  // CityMapView, driven by the `evidenceStation` prop change below — one
  // path for both the sidebar list and a direct marker click, so the
  // signature moment happens no matter how a station gets selected.
  const handleSelect = useCallback(
    (name) => {
      setSelected(name);
      setSearchParams(name ? { station: name } : {}, { replace: true });
      const station = stations.find((s) => s.station === name);
      if (station) setEvidenceStation(station);
    },
    [stations, setSearchParams]
  );

  const isEmpty = attributionQuery.data?.data_source === "empty";
  const activeIncidentCount = (incidentsQuery.data?.data ?? []).filter((i) => i.status !== "Resolved").length;

  const heroKpis = stations.length
    ? [
        { icon: <Layers size={12} strokeWidth={2} />, label: "Stations monitored", value: stations.length },
        {
          icon: <MapPin size={12} strokeWidth={2} />,
          label: "Highest AQI station",
          value: Math.round(stations[0].aqi),
          sub: stations[0].station,
          tone: "danger",
        },
        { icon: <ClipboardList size={12} strokeWidth={2} />, label: "Active incidents", value: activeIncidentCount, tone: activeIncidentCount > 0 ? "warning" : "success" },
      ]
    : [];

  return (
    <>
      <main className="max-w-content mx-auto px-5 md:px-10 pb-28 flex-1 w-full">
        <PageHero
          icon={<MapPinned size={19} strokeWidth={1.8} />}
          mood="accent"
          liveLabel={`City intelligence · ${cityMeta.label} · spatial view`}
          title="City Intelligence Map"
          tagline={
            stations[0]
              ? `Focus on ${stations[0].station} first — the highest AQI in ${cityMeta.label} right now, plotted worst to best below.`
              : `Every monitored station in ${cityMeta.label}, plotted by AQI category, worst first.`
          }
          kpis={heroKpis}
          primaryAction={
            stations[0] ? { label: `Investigate ${stations[0].station}`, onClick: () => handleSelect(stations[0].station), icon: <Search size={14} /> } : undefined
          }
          extra={attributionQuery.data && <DataSourceBadge source={attributionQuery.data.data_source} updatedAt={attributionQuery.dataUpdatedAt} />}
        />

        <QueryState
          isLoading={attributionQuery.isLoading || forecastQuery.isLoading}
          isError={attributionQuery.isError}
          error={attributionQuery.error}
          onRetry={attributionQuery.refetch}
          isEmpty={isEmpty}
          loading={<SkeletonCard lines={8} />}
          empty={
            <EmptyState
              icon={<Database size={18} strokeWidth={1.8} />}
              tone="warning"
              title={`No station data yet for ${cityMeta.label}`}
              description={
                <>
                  Run ingestion and the attribution/forecast agents for {cityMeta.label} —{" "}
                  <code className="font-mono text-[13px] bg-search px-1.5 py-0.5 rounded">
                    ingestion/fetch_waqi.py --city {cityMeta.id}
                  </code>{" "}
                  followed by the agent scripts — or switch to another city with the selector in the nav.
                </>
              }
            />
          }
        >
          <section className="mt-10">
            <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
              <div>
                <SectionHeading eyebrow="HOTSPOTS" title="Ranked by severity" className="mb-[18px]" />
                <HotspotList stations={stations} selected={selected} onSelect={handleSelect} />
              </div>
              <div className="relative h-[620px] lg:h-[760px] rounded-card border border-border overflow-hidden bg-search">
                {mapErrored ? (
                  <MapErrorFallback stations={mappable} />
                ) : mappable.length > 0 ? (
                  <>
                    <CityMapView
                      stations={mappable}
                      registry={registry}
                      roads={roadsQuery.data?.data}
                      weatherByStation={weatherByStation}
                      layers={layers}
                      center={[cityMeta.lon, cityMeta.lat]}
                      evidenceStation={evidenceStation}
                      onStationClick={(s) => handleSelect(s.station)}
                      onError={() => setMapErrored(true)}
                    />
                    <MapLegend />
                    <LayerToggle layers={layers} onToggle={toggleLayer} />
                    <StationEvidencePanel
                      station={evidenceStation}
                      weather={evidenceStation ? weatherByStation[evidenceStation.station] : null}
                      forecast={evidenceStation ? forecastByStation[evidenceStation.station] : null}
                      incident={
                        evidenceStation
                          ? activeIncidentForStation(incidentsQuery.data?.data ?? [], evidenceStation.station)
                          : null
                      }
                      health={evidenceStation ? stationHealthQuery.data?.data : null}
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

        <WorkflowNav currentStepId="map" nextQuery={selected ? `?station=${encodeURIComponent(selected)}` : ""} />
      </main>
      <Footer
        pageLabel="CITY MAP"
        note="MapLibre GL · CARTO Positron basemap · registry density heat layer"
      />
    </>
  );
}
