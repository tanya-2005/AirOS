import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { HeartPulse, FlaskConical, Database } from "lucide-react";

import PageHero from "../components/ui/PageHero";
import QueryState from "../components/ui/QueryState";
import DataSourceBadge from "../components/ui/DataSourceBadge";
import StationPicker from "../components/ui/StationPicker";
import IncidentContextBanner from "../components/ui/IncidentContextBanner";
import { SkeletonCard } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import Footer from "../components/layout/Footer";

import CitizenHealthPanel from "../components/health/CitizenHealthPanel";
import HealthAdvisoryPanel from "../components/health/HealthAdvisoryPanel";
import WorkflowNav from "../components/workflow/WorkflowNav";

import { useAttribution, useCityHealthAdvisory, useStationHealthAdvisory, useIncidents } from "../lib/hooks/useApi";
import { useCity } from "../lib/city/useCity";
import { activeIncidentForStation } from "../lib/incidents";

/**
 * Citizen Advisory — the "Citizen Advisory" stop in the Guided Workflow /
 * Presentation Mode sequence (lib/workflow.js). Composes two components
 * that already existed before this milestone (CitizenHealthPanel on
 * Command Center, HealthAdvisoryPanel on Incident Detail) onto their own
 * route so the operational chain has a concrete page to land on — no new
 * health-advisory computation, same live data those two already render.
 */
export default function CitizenAdvisory() {
  const { cityMeta } = useCity();
  const attributionQuery = useAttribution();
  const cityHealthQuery = useCityHealthAdvisory();
  const incidentsQuery = useIncidents();

  const stations = useMemo(() => {
    const raw = attributionQuery.data?.data ?? [];
    return [...raw].sort((a, b) => b.aqi - a.aqi);
  }, [attributionQuery.data]);

  const [searchParams, setSearchParams] = useSearchParams();
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

  const stationHealthQuery = useStationHealthAdvisory(stationName);
  const isEmpty = attributionQuery.data?.data_source === "empty";
  const cityHealth = cityHealthQuery.data?.data;
  const stationIncident = stationName ? activeIncidentForStation(incidentsQuery.data?.data ?? [], stationName) : null;

  // No hero KPIs — CitizenHealthPanel is the very next thing on this page
  // (first, uncollapsed section) and states these same three facts (current
  // risk, most affected group, top recommendation) plus the worst station
  // and an emergency badge the hero tiles didn't have room for. Keeping
  // both would put identical numbers on screen twice before any new
  // information appears.
  const heroKpis = [];

  return (
    <>
      <main className="max-w-content mx-auto px-5 md:px-10 pb-28 flex-1 w-full">
        <PageHero
          icon={<HeartPulse size={19} strokeWidth={1.8} />}
          mood="hazard"
          liveLabel={`Public Protection · ${cityMeta.label}`}
          title="Public Protection"
          tagline={
            cityHealth
              ? `${cityHealth.most_affected_group} need protection first in ${cityMeta.label} today — CPCB/WHO-style guidance, deterministic, no AI-generated text.`
              : `Deterministic CPCB/WHO-style guidance by population group, for ${cityMeta.label} today.`
          }
          kpis={heroKpis}
          primaryAction={{ label: "Run Policy Simulation", to: stationName ? `/simulate?station=${encodeURIComponent(stationName)}` : "/simulate", icon: <FlaskConical size={14} /> }}
          extra={attributionQuery.data && <DataSourceBadge source={attributionQuery.data.data_source} updatedAt={attributionQuery.dataUpdatedAt} />}
        />

        <IncidentContextBanner incident={stationIncident} />

        <QueryState
          isLoading={attributionQuery.isLoading}
          isError={attributionQuery.isError}
          error={attributionQuery.error}
          onRetry={attributionQuery.refetch}
          isEmpty={isEmpty}
          loading={<div className="mt-10"><SkeletonCard lines={8} /></div>}
          empty={
            <EmptyState
              icon={<Database size={18} strokeWidth={1.8} />}
              tone="warning"
              title={`No station data yet for ${cityMeta.label}`}
              description="Run ingestion and the attribution/forecast agents to populate health advisories."
            />
          }
        >
          <section className="mt-10">
            <CitizenHealthPanel summary={cityHealthQuery.data?.data} />
          </section>

          <div className="mt-10">
            <StationPicker stations={stations} selected={stationName} onSelect={handleSelect} label="Drill into a station" />
          </div>

          <section className="mt-8">
            <HealthAdvisoryPanel advisories={stationHealthQuery.data?.data?.advisories} />
          </section>
        </QueryState>

        <WorkflowNav
          currentStepId="citizen-advisory"
          nextQuery={stationName ? `?station=${encodeURIComponent(stationName)}` : ""}
        />
      </main>
      <Footer
        pageLabel="PUBLIC PROTECTION"
        note="Deterministic health guidance · agents/health_advisory_agent.py · no LLM"
      />
    </>
  );
}
