import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Printer, FileText, Database, MousePointerClick, ChevronDown } from "lucide-react";

import SectionHeading from "../components/ui/SectionHeading";
import PageHero from "../components/ui/PageHero";
import QueryState from "../components/ui/QueryState";
import DataSourceBadge from "../components/ui/DataSourceBadge";
import Button from "../components/ui/Button";
import { SkeletonCard } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import Footer from "../components/layout/Footer";

import ExecutiveSummary from "../components/report/ExecutiveSummary";
import StationNarrative from "../components/report/StationNarrative";
import PriorityActions from "../components/command/PriorityActions";
import HealthAdvisorySection from "../components/health/HealthAdvisorySection";
import CityRankingsTable from "../components/cities/CityRankingsTable";
import CityTrendAnalysis from "../components/cities/CityTrendAnalysis";
import CityPicker from "../components/cities/CityPicker";
import AIValidationSection from "../components/report/AIValidationSection";
import WorkflowNav from "../components/workflow/WorkflowNav";

import {
  useAttribution,
  useForecast,
  useEnforcement,
  useIncidents,
  useTasks,
  useCityHealthAdvisory,
  useCityComparison,
  useValidationReport,
} from "../lib/hooks/useApi";
import { useCity } from "../lib/city/useCity";
import { citySummary } from "../lib/report";
import { staggerContainer } from "../lib/motion";
import { mostRelevantIncidentForStation } from "../lib/incidents";
import { tasksForIncident } from "../lib/tasks";

const REPORT_MODES = [
  { id: "single", label: "Single City" },
  { id: "multiple", label: "Multiple Cities" },
  { id: "national", label: "National Comparison" },
];

export default function IntelligenceReport() {
  const { city, cityMeta, cities } = useCity();
  const [mode, setMode] = useState("single");
  const [selectedCities, setSelectedCities] = useState([city]);
  const [showAllStations, setShowAllStations] = useState(false);
  const STATION_BRIEFING_LIMIT = 6;

  function toggleCity(id) {
    setSelectedCities((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  const attributionQuery = useAttribution();
  const forecastQuery = useForecast();
  const enforcementQuery = useEnforcement();
  const incidentsQuery = useIncidents();
  const incidents = useMemo(() => incidentsQuery.data?.data ?? [], [incidentsQuery.data]);
  const tasksQuery = useTasks();
  const tasks = useMemo(() => tasksQuery.data?.data ?? [], [tasksQuery.data]);
  const cityHealthQuery = useCityHealthAdvisory();
  const validationReportQuery = useValidationReport();

  // Multiple Cities / National Comparison modes reuse the exact same
  // /api/cities/compare rollup and shared ranking/trend components as the
  // City Comparison page — no second aggregation pipeline for reports.
  const comparisonQuery = useCityComparison();
  const comparisonRows = useMemo(() => comparisonQuery.data?.data ?? [], [comparisonQuery.data]);
  const multiCityRows = useMemo(
    () => comparisonRows.filter((r) => selectedCities.includes(r.city)),
    [comparisonRows, selectedCities]
  );

  const stations = useMemo(() => {
    const raw = attributionQuery.data?.data ?? [];
    return [...raw].sort((a, b) => b.aqi - a.aqi);
  }, [attributionQuery.data]);
  const forecasts = useMemo(() => forecastQuery.data?.data ?? [], [forecastQuery.data]);
  const enforcement = useMemo(() => enforcementQuery.data?.data ?? [], [enforcementQuery.data]);

  const summary = useMemo(() => citySummary(stations, forecasts, enforcement), [stations, forecasts, enforcement]);
  const forecastByStation = useMemo(() => new Map(forecasts.map((f) => [f.station, f])), [forecasts]);
  const enforcementByStation = useMemo(() => {
    const map = new Map();
    for (const e of enforcement) {
      if (!map.has(e.station)) map.set(e.station, []);
      map.get(e.station).push(e);
    }
    return map;
  }, [enforcement]);

  const isEmpty = attributionQuery.data?.data_source === "empty";
  const isLoading = attributionQuery.isLoading || forecastQuery.isLoading || enforcementQuery.isLoading;
  const generatedAt = attributionQuery.dataUpdatedAt ? new Date(attributionQuery.dataUpdatedAt) : null;

  const tagline =
    mode === "single"
      ? `A single briefing for ${cityMeta.label}, synthesized from live attribution, forecast, and enforcement data.`
      : mode === "multiple"
        ? "A rollup briefing across the cities you pick below."
        : "A national rollup across every supported city, ranked by government priority.";

  // No hero KPIs here — the Executive Summary card immediately below (in
  // single-city mode) already states city average AQI, top source, and
  // enforcement gaps with full narrative context plus its own stat grid.
  // Repeating them as hero tiles would put the same three facts on screen
  // three times before a reader gets past the fold.
  const heroKpis = [];

  return (
    <>
      <main className="max-w-content mx-auto px-5 md:px-10 pb-28 flex-1 w-full">
        <PageHero
          className="print:pt-4"
          icon={<FileText size={19} strokeWidth={1.8} />}
          mood="ink"
          liveLabel="Executive Briefing · attribution + forecast + enforcement"
          title="Executive Briefing"
          tagline={tagline}
          kpis={heroKpis}
          secondarySlot={
            <Button variant="ghost" size="md" icon={<Printer size={14} />} onClick={() => window.print()}>
              Print / Save PDF
            </Button>
          }
          extra={
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5 flex-wrap print:hidden">
                {REPORT_MODES.map((m) => (
                  <Button key={m.id} variant={mode === m.id ? "primary" : "ghost"} size="sm" onClick={() => setMode(m.id)}>
                    {m.label}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {mode === "single" && attributionQuery.data && <DataSourceBadge source={attributionQuery.data.data_source} />}
                {mode !== "single" && comparisonQuery.data && <DataSourceBadge source={comparisonQuery.data.data_source} />}
                {generatedAt && (
                  <span className="font-mono text-[11px] text-muted-4">
                    Generated {generatedAt.toLocaleDateString()} {generatedAt.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          }
        />

        {mode === "single" && (
          <QueryState
            isLoading={isLoading}
            isError={attributionQuery.isError}
            error={attributionQuery.error}
            onRetry={attributionQuery.refetch}
            isEmpty={isEmpty}
            loading={<div className="mt-10"><SkeletonCard lines={8} /></div>}
            empty={
              <EmptyState
                icon={<Database size={18} strokeWidth={1.8} />}
                tone="warning"
                title="Nothing to report yet"
                description="This briefing synthesizes live pipeline output — run ingestion and the agent scripts first."
              />
            }
          >
            <section className="mt-10">
              <ExecutiveSummary summary={summary} />
            </section>

            <HealthAdvisorySection summary={cityHealthQuery.data?.data} />

            <section className="mt-16">
              <SectionHeading
                eyebrow="STATION BRIEFINGS"
                title="What's happening, station by station"
                description={
                  stations.length > STATION_BRIEFING_LIMIT
                    ? `Most severe ${Math.min(STATION_BRIEFING_LIMIT, stations.length)} of ${stations.length} shown — this is a summary for senior officials, not the full station log.`
                    : undefined
                }
                className="mb-6"
              />
              <motion.div
                initial="hidden"
                animate="show"
                variants={staggerContainer}
                className="grid grid-cols-1 md:grid-cols-2 gap-5"
              >
                {(showAllStations ? stations : stations.slice(0, STATION_BRIEFING_LIMIT)).map((s) => {
                  const incident = mostRelevantIncidentForStation(incidents, s.station);
                  return (
                    <StationNarrative
                      key={s.station}
                      station={s}
                      forecast={forecastByStation.get(s.station)}
                      enforcementForStation={enforcementByStation.get(s.station)}
                      incident={incident}
                      incidentTasks={incident ? tasksForIncident(tasks, incident.id) : []}
                    />
                  );
                })}
              </motion.div>
              {stations.length > STATION_BRIEFING_LIMIT && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-5 print:hidden"
                  icon={<ChevronDown size={14} className={showAllStations ? "rotate-180 transition-transform" : "transition-transform"} />}
                  onClick={() => setShowAllStations((v) => !v)}
                >
                  {showAllStations ? "Show fewer stations" : `Show all ${stations.length} stations`}
                </Button>
              )}
            </section>

            <section className="mt-16 print:hidden">
              <SectionHeading eyebrow="RECOMMENDED ACTIONS" title="Where to act first" className="mb-6" />
              <PriorityActions items={enforcement} />
            </section>

            <AIValidationSection report={validationReportQuery.data?.data} />
          </QueryState>
        )}

        {mode === "multiple" && (
          <QueryState
            isLoading={comparisonQuery.isLoading}
            isError={comparisonQuery.isError}
            error={comparisonQuery.error}
            onRetry={comparisonQuery.refetch}
            loading={<div className="mt-10"><SkeletonCard lines={8} /></div>}
          >
            <section className="mt-10 print:hidden">
              <SectionHeading eyebrow="SELECT CITIES" title="Choose which cities to include" className="mb-5" />
              <CityPicker cities={cities} selected={selectedCities} onToggle={toggleCity} />
            </section>

            {multiCityRows.length === 0 ? (
              <EmptyState
                icon={<MousePointerClick size={18} strokeWidth={1.8} />}
                tone="muted"
                title="No cities selected"
                description="Pick at least one city above to generate its briefing."
              />
            ) : (
              <>
                <section className="mt-10">
                  <SectionHeading eyebrow="RANKINGS" title="Selected cities, compared" className="mb-6" />
                  <CityRankingsTable rows={multiCityRows} />
                </section>
                <section className="mt-16">
                  <SectionHeading eyebrow="TREND ANALYSIS" title="Who's improving, who needs attention" className="mb-6" />
                  <CityTrendAnalysis rows={multiCityRows} />
                </section>
              </>
            )}
          </QueryState>
        )}

        {mode === "national" && (
          <QueryState
            isLoading={comparisonQuery.isLoading}
            isError={comparisonQuery.isError}
            error={comparisonQuery.error}
            onRetry={comparisonQuery.refetch}
            isEmpty={comparisonRows.length === 0}
            loading={<div className="mt-10"><SkeletonCard lines={8} /></div>}
            empty={
              <EmptyState
                icon={<Database size={18} strokeWidth={1.8} />}
                tone="warning"
                title="No cities configured"
                description="backend/city_registry.py has no entries — this shouldn't happen in a standard AirOS deployment."
              />
            }
          >
            <section className="mt-10">
              <SectionHeading eyebrow="RANKINGS" title="Every city, government priority order" className="mb-6" />
              <CityRankingsTable rows={comparisonRows} selectedCity={city} />
            </section>
            <section className="mt-16">
              <SectionHeading eyebrow="TREND ANALYSIS" title="Who's improving, who needs attention" className="mb-6" />
              <CityTrendAnalysis rows={comparisonRows} />
            </section>

            <AIValidationSection report={validationReportQuery.data?.data} />
          </QueryState>
        )}

        <WorkflowNav currentStepId="report" />
      </main>
      <Footer
        pageLabel="EXECUTIVE BRIEFING"
        note="Templated synthesis over live pipeline output · not LLM-generated"
      />
    </>
  );
}
