import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Target, Microscope, Percent, Database, FlaskConical, ClipboardList } from "lucide-react";

import SectionHeading from "../components/ui/SectionHeading";
import PageHero from "../components/ui/PageHero";
import QueryState from "../components/ui/QueryState";
import DataSourceBadge from "../components/ui/DataSourceBadge";
import StationPicker from "../components/ui/StationPicker";
import IncidentContextBanner from "../components/ui/IncidentContextBanner";
import { SkeletonCard } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import Footer from "../components/layout/Footer";

import AttributionBreakdown from "../components/attribution/AttributionBreakdown";
import EvidenceTable from "../components/attribution/EvidenceTable";
import MethodologyPanel from "../components/attribution/MethodologyPanel";
import RegistryBrowser from "../components/attribution/RegistryBrowser";
import AttributionExplainability from "../components/attribution/AttributionExplainability";
import WorkflowNav from "../components/workflow/WorkflowNav";

import { useAttribution, useRegistry, useWeatherCurrent, useIncidents } from "../lib/hooks/useApi";
import { sourceMeta } from "../lib/sources";
import { activeIncidentForStation } from "../lib/incidents";

export default function Attribution() {
  const attributionQuery = useAttribution();
  const registryQuery = useRegistry();
  const weatherQuery = useWeatherCurrent();
  const incidentsQuery = useIncidents();
  const [searchParams, setSearchParams] = useSearchParams();

  const stations = useMemo(() => {
    const raw = attributionQuery.data?.data ?? [];
    return [...raw].sort((a, b) => b.aqi - a.aqi);
  }, [attributionQuery.data]);

  const requestedStation = searchParams.get("station");
  const [stationName, setStationName] = useState(requestedStation || null);

  useEffect(() => {
    if (stationName || !stations.length) return;
    const match = requestedStation && stations.find((s) => s.station === requestedStation);
    setStationName(match ? match.station : stations[0].station);
  }, [stations, stationName, requestedStation]);

  function handleSelect(name) {
    setStationName(name);
    setSearchParams(name ? { station: name } : {}, { replace: true });
  }

  const selectedStation = stations.find((s) => s.station === stationName) ?? null;
  const isEmpty = attributionQuery.data?.data_source === "empty";
  const topAttribution = selectedStation?.attribution?.[0] ?? null;
  const stationIncident = stationName ? activeIncidentForStation(incidentsQuery.data?.data ?? [], stationName) : null;

  const heroKpis = selectedStation
    ? [
        {
          icon: <Target size={12} strokeWidth={2} />,
          label: "Dominant source",
          value: topAttribution ? sourceMeta(topAttribution.source_type).label : "None in range",
        },
        {
          icon: <Percent size={12} strokeWidth={2} />,
          label: "Confidence",
          value: topAttribution ? Math.round(topAttribution.confidence * 100) : 0,
          suffix: "%",
        },
        {
          icon: <Microscope size={12} strokeWidth={2} />,
          label: "Evidence points",
          value: selectedStation.evidence?.length ?? 0,
        },
      ]
    : [];

  return (
    <>
      <main className="max-w-content mx-auto px-5 md:px-10 pb-28 flex-1 w-full">
        <PageHero
          icon={<Microscope size={19} strokeWidth={1.8} />}
          mood="accent"
          liveLabel="Source attribution · haversine proximity + weighted scoring"
          title="AI Attribution"
          tagline={selectedStation ? `Why ${selectedStation.station} is polluted, ranked by contribution with the evidence behind the verdict.` : "Pick a station to see why it's polluted, ranked by contribution with the evidence behind it."}
          kpis={heroKpis}
          primaryAction={
            !selectedStation
              ? undefined
              : stationIncident
                ? { label: "Open Case File", to: `/incidents/${encodeURIComponent(stationIncident.id)}`, icon: <ClipboardList size={14} /> }
                : { label: "Run Decision Support", to: `/simulate?station=${encodeURIComponent(selectedStation.station)}`, icon: <FlaskConical size={14} /> }
          }
          extra={attributionQuery.data && <DataSourceBadge source={attributionQuery.data.data_source} updatedAt={attributionQuery.dataUpdatedAt} />}
        />

        <IncidentContextBanner incident={stationIncident} />

        <QueryState
          isLoading={attributionQuery.isLoading}
          isError={attributionQuery.isError}
          error={attributionQuery.error}
          onRetry={attributionQuery.refetch}
          isEmpty={isEmpty}
          loading={
            <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SkeletonCard lines={6} />
              <SkeletonCard lines={6} />
            </div>
          }
          empty={
            <EmptyState
              icon={<Database size={18} strokeWidth={1.8} />}
              tone="warning"
              title="No attribution data yet"
              description="Run ingestion and the attribution agent to populate this page — see the README's local development section."
            />
          }
        >
          <div className="mt-10">
            <StationPicker stations={stations} selected={stationName} onSelect={handleSelect} />
          </div>

          {/* Why this is happening leads — the synthesized answer, not the raw
              confidence bars/evidence table it's built from */}
          <section className="mt-8">
            <AttributionExplainability
              station={selectedStation}
              hasWeather={!!(weatherQuery.data?.data ?? []).find((w) => w.station_name === stationName)}
              registryLoaded={(registryQuery.data?.data?.length ?? 0) > 0}
            />
          </section>

          <section className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <AttributionBreakdown station={selectedStation} />
              <div>
                <SectionHeading eyebrow="EVIDENCE" title="What drove this score" className="mb-[18px]" />
                <EvidenceTable evidence={selectedStation?.evidence} />
              </div>
            </div>
          </section>

          <details className="mt-16 group">
            <summary className="flex items-center gap-2.5 cursor-pointer list-none font-mono text-[11px] tracking-[.08em] text-muted-3 uppercase hover:text-ink transition-colors">
              <span className="w-5 h-5 rounded-full border border-border flex items-center justify-center text-[10px] group-open:rotate-45 transition-transform">+</span>
              Methodology — show your math
            </summary>
            <div className="mt-6">
              <MethodologyPanel />
            </div>
          </details>

          <section className="mt-16">
            <SectionHeading
              eyebrow="SOURCE REGISTRY"
              title="Every known emission source"
              right={registryQuery.data && <DataSourceBadge source={registryQuery.data.data_source} />}
              className="mb-6"
            />
            <QueryState
              isLoading={registryQuery.isLoading}
              isError={registryQuery.isError}
              error={registryQuery.error}
              onRetry={registryQuery.refetch}
              loading={<SkeletonCard lines={6} />}
            >
              <RegistryBrowser records={registryQuery.data?.data ?? []} />
            </QueryState>
          </section>
        </QueryState>

        <WorkflowNav currentStepId="attribution" nextQuery={stationName ? `?station=${encodeURIComponent(stationName)}` : ""} />
      </main>
      <Footer
        pageLabel="AI ATTRIBUTION"
        note="Live pipeline · agents/attribution_agent.py · 3km radius, weighted proximity scoring"
      />
    </>
  );
}
