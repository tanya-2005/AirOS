import { useEffect, useMemo, useState } from "react";
import { Flame, ShieldAlert, Activity, MapPin, Search, DatabaseZap, Database } from "lucide-react";

import SectionHeading from "../components/ui/SectionHeading";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import PageHero from "../components/ui/PageHero";
import QueryState from "../components/ui/QueryState";
import DataSourceBadge from "../components/ui/DataSourceBadge";
import IncidentContextBanner from "../components/ui/IncidentContextBanner";
import { SkeletonCard } from "../components/ui/Skeleton";
import Footer from "../components/layout/Footer";

import HotspotList from "../components/command/HotspotList";
import StationDetailPanel from "../components/command/StationDetailPanel";
import CriticalAlerts from "../components/command/CriticalAlerts";
import IncidentOpsStatsBar from "../components/incidents/IncidentOpsStatsBar";
import AIDecisionPanel from "../components/command/AIDecisionPanel";
import ExplainabilityTimeline from "../components/command/ExplainabilityTimeline";
import ExecutiveSummary from "../components/report/ExecutiveSummary";
import CitizenHealthPanel from "../components/health/CitizenHealthPanel";

import { useAttribution, useForecast, useEnforcement, useWeatherCurrent, useStationHistory, useIncidents, useCityHealthAdvisory } from "../lib/hooks/useApi";
import { useCity } from "../lib/city/useCity";
import { citySummary } from "../lib/report";
import { topPollutionDriver, deltaFromHistory } from "../lib/decision";
import { activeIncidentForStation } from "../lib/incidents";

export default function CommandCenter() {
  const { cityMeta } = useCity();
  const attributionQuery = useAttribution();
  const forecastQuery = useForecast();
  const enforcementQuery = useEnforcement();
  const weatherQuery = useWeatherCurrent();
  const incidentsQuery = useIncidents();
  const cityHealthQuery = useCityHealthAdvisory();

  const stations = useMemo(() => {
    const raw = attributionQuery.data?.data ?? [];
    return [...raw].sort((a, b) => b.aqi - a.aqi);
  }, [attributionQuery.data]);

  const forecasts = useMemo(() => forecastQuery.data?.data ?? [], [forecastQuery.data]);
  const enforcement = useMemo(() => enforcementQuery.data?.data ?? [], [enforcementQuery.data]);
  const weatherByStation = useMemo(() => {
    const map = {};
    for (const w of weatherQuery.data?.data ?? []) map[w.station_name] = w;
    return map;
  }, [weatherQuery.data]);

  const [selected, setSelected] = useState(null);
  useEffect(() => {
    if (!selected && stations.length) setSelected(stations[0].station);
  }, [stations, selected]);

  const selectedStation = stations.find((s) => s.station === selected) ?? null;
  const selectedForecast = forecasts.find((f) => f.station === selected) ?? null;
  const selectedEnforcement = enforcement.find((e) => e.station === selected) ?? null;
  const selectedWeather = selected ? weatherByStation[selected] : null;
  const selectedIncident = selected ? activeIncidentForStation(incidentsQuery.data?.data ?? [], selected) : null;
  const stationHistoryQuery = useStationHistory(selected, 24);
  const trendDelta = deltaFromHistory(stationHistoryQuery.data?.data);

  const summary = useMemo(() => citySummary(stations, forecasts, enforcement), [stations, forecasts, enforcement]);
  const driver = useMemo(() => topPollutionDriver(stations), [stations]);

  const stats = useMemo(() => {
    if (!stations.length) return null;
    return {
      avg: summary?.avgAqi ?? Math.round(stations.reduce((sum, s) => sum + s.aqi, 0) / stations.length),
      activeActions: enforcement.filter((e) => e.evidence?.active).length,
    };
  }, [stations, enforcement, summary]);

  const isEmpty = attributionQuery.data?.data_source === "empty";

  const heroKpis = stats
    ? [
        { icon: <Activity size={12} strokeWidth={2} />, label: "City average AQI", value: stats.avg },
        {
          icon: <MapPin size={12} strokeWidth={2} />,
          label: "Highest priority station",
          value: stations[0] ? `${Math.round(stations[0].aqi)}` : "—",
          sub: stations[0]?.station,
          tone: "danger",
        },
        { icon: <Flame size={12} strokeWidth={2} />, label: "Top pollution driver", value: driver ? driver.label : "None in range" },
        { icon: <ShieldAlert size={12} strokeWidth={2} />, label: "Active enforcement gaps", value: stats.activeActions, tone: stats.activeActions > 0 ? "warning" : "success" },
      ]
    : [];

  return (
    <>
      <main className="max-w-content mx-auto px-5 md:px-10 pb-28 flex-1 w-full">
        <PageHero
          icon={<DatabaseZap size={19} strokeWidth={1.8} />}
          mood="ink"
          liveLabel={`City Operations · ${cityMeta.label} · station-by-station drill-down`}
          title="City Operations"
          tagline={`Every monitored station in ${cityMeta.label}, ranked and explained — the station-level detail behind Command Centre's city-wide summary.`}
          kpis={heroKpis}
          primaryAction={stations[0] ? { label: "Investigate Top Station", to: `/attribution?station=${encodeURIComponent(stations[0].station)}`, icon: <Search size={14} /> } : undefined}
          extra={attributionQuery.data && <DataSourceBadge source={attributionQuery.data.data_source} updatedAt={attributionQuery.dataUpdatedAt} />}
        />

        <QueryState
          isLoading={attributionQuery.isLoading}
          isError={attributionQuery.isError}
          error={attributionQuery.error}
          onRetry={attributionQuery.refetch}
          isEmpty={isEmpty}
          loading={
            <div className="mt-10 flex flex-col gap-6">
              <SkeletonCard lines={2} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} lines={1} />
                ))}
              </div>
              <SkeletonCard lines={4} />
            </div>
          }
          empty={
            <EmptyState
              icon={<Database size={18} strokeWidth={1.8} />}
              tone="warning"
              title={`No station data yet for ${cityMeta.label}`}
              description={
                <>
                  Ingestion hasn't been run for {cityMeta.label} against a live WAQI token, and no cached pipeline
                  run exists either. Run{" "}
                  <code className="font-mono text-[13px] bg-search px-1.5 py-0.5 rounded">
                    ingestion/fetch_waqi.py --city {cityMeta.id}
                  </code>{" "}
                  followed by the agent scripts to populate this dashboard — or switch to another city with the
                  selector in the nav.
                </>
              }
            />
          }
        >
          {/* 01 — Critical Alerts, now incident-driven (Phase 7) */}
          <section className="mt-10">
            <CriticalAlerts incidents={incidentsQuery.data?.data ?? []} />
          </section>

          {/* 02 — AI Decision Panel leads the page's own decision content — what
              to act on first, with why/evidence/confidence/difficulty — ahead
              of the stats bar and station browser below, so this page opens
              with a decision rather than a dashboard to read through first. */}
          <section className="mt-8">
            <SectionHeading
              eyebrow="AI DECISION PANEL"
              title="What the AI recommends acting on first"
              right={enforcementQuery.data && <DataSourceBadge source={enforcementQuery.data.data_source} updatedAt={enforcementQuery.dataUpdatedAt} />}
              className="mb-6"
            />
            <QueryState
              isLoading={enforcementQuery.isLoading}
              isError={enforcementQuery.isError}
              error={enforcementQuery.error}
              onRetry={enforcementQuery.refetch}
              isEmpty={enforcement.length === 0}
              loading={<SkeletonCard lines={5} />}
              empty={
                <Card padding="p-7" hover={false} className="text-center text-[14px] text-muted-2">
                  No enforcement recommendations yet.
                </Card>
              }
            >
              <AIDecisionPanel items={enforcement} />
            </QueryState>
          </section>

          {/* 01b — Incident ops summary: Open / Assigned / Unassigned / Critical (Phase 8) */}
          <section className="mt-14">
            <IncidentOpsStatsBar incidents={incidentsQuery.data?.data ?? []} />
          </section>

          <details className="mt-10 group">
            <summary className="flex items-center gap-2.5 cursor-pointer list-none font-mono text-[11px] tracking-[.08em] text-muted-3 uppercase hover:text-ink transition-colors">
              <span className="w-5 h-5 rounded-full border border-border flex items-center justify-center text-[10px] group-open:rotate-45 transition-transform">+</span>
              Executive summary &amp; citizen health advisory
            </summary>
            <div className="mt-6 flex flex-col gap-8">
              <ExecutiveSummary summary={summary} />
              <CitizenHealthPanel summary={cityHealthQuery.data?.data} />
            </div>
          </details>

          {/* 03 — Hotspots + station detail, with risk badge and snapshot-to-snapshot trend */}
          <section className="mt-16">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
              <div>
                <SectionHeading eyebrow="CITY HOTSPOTS" title="Ranked by severity" className="mb-[18px]" />
                <HotspotList stations={stations} selected={selected} onSelect={setSelected} />
              </div>
              <div className="lg:sticky lg:top-[88px]">
                <StationDetailPanel
                  station={selectedStation}
                  forecast={selectedForecast}
                  isLoadingForecast={forecastQuery.isLoading}
                  trendDelta={trendDelta}
                />
                <IncidentContextBanner incident={selectedIncident} />
              </div>
            </div>
          </section>

          {/* 04 — Explainability timeline for the selected station */}
          <section className="mt-16">
            <ExplainabilityTimeline
              station={selectedStation}
              weather={selectedWeather}
              forecast={selectedForecast}
              enforcementItem={selectedEnforcement}
            />
          </section>
        </QueryState>
      </main>
      <Footer
        pageLabel="CITY OPERATIONS"
        note="Live pipeline · attribution → forecast → simulation, evidence-based recommendations"
      />
    </>
  );
}
