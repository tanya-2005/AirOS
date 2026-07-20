import { useMemo } from "react";
import { motion } from "framer-motion";
import { FileText, Printer } from "lucide-react";

import SectionHeading from "../components/ui/SectionHeading";
import LiveDot from "../components/ui/LiveDot";
import QueryState from "../components/ui/QueryState";
import DataSourceBadge from "../components/ui/DataSourceBadge";
import Button from "../components/ui/Button";
import { SkeletonCard } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import Footer from "../components/layout/Footer";

import ExecutiveSummary from "../components/report/ExecutiveSummary";
import StationNarrative from "../components/report/StationNarrative";
import PriorityActions from "../components/command/PriorityActions";

import { useAttribution, useForecast, useEnforcement } from "../lib/hooks/useApi";
import { citySummary } from "../lib/report";
import { fadeUp, staggerContainer } from "../lib/motion";

export default function IntelligenceReport() {
  const attributionQuery = useAttribution();
  const forecastQuery = useForecast();
  const enforcementQuery = useEnforcement();

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

  return (
    <>
      <main className="max-w-content mx-auto px-5 md:px-10 pb-28 flex-1 w-full">
        <motion.section initial="hidden" animate="show" variants={fadeUp} className="pt-14 pb-2 print:pt-4">
          <LiveDot label="Synthesized briefing · attribution + forecast + enforcement" />
          <div className="flex items-start justify-between gap-4 flex-wrap mt-4">
            <h1 className="font-display font-normal text-[44px] md:text-[64px] leading-[1.02] tracking-[-.02em] text-ink">
              AI Intelligence Report
            </h1>
            <Button variant="ghost" size="md" icon={<Printer size={14} />} onClick={() => window.print()} className="print:hidden mt-2">
              Print / Save PDF
            </Button>
          </div>
          <div className="flex gap-3.5 items-start mt-5 max-w-[820px]">
            <div className="shrink-0 w-[34px] h-[34px] rounded-[9px] bg-ink flex items-center justify-center mt-0.5">
              <FileText size={17} className="text-panel-accent" strokeWidth={1.6} />
            </div>
            <p className="text-[17px] md:text-[19px] leading-[1.55] text-[#33363A]">
              A single briefing synthesized from live attribution, forecast, and enforcement data — every number
              traces back to the pipeline; only the sentence structure around it is templated.
            </p>
          </div>
          <div className="flex items-center gap-3 mt-6 flex-wrap">
            {attributionQuery.data && <DataSourceBadge source={attributionQuery.data.data_source} />}
            {generatedAt && (
              <span className="font-mono text-[11px] text-muted-4">
                Generated {generatedAt.toLocaleDateString()} {generatedAt.toLocaleTimeString()}
              </span>
            )}
          </div>
        </motion.section>

        <QueryState
          isLoading={isLoading}
          isError={attributionQuery.isError}
          error={attributionQuery.error}
          onRetry={attributionQuery.refetch}
          isEmpty={isEmpty}
          loading={<div className="mt-10"><SkeletonCard lines={8} /></div>}
          empty={
            <EmptyState
              title="Nothing to report yet"
              description="This briefing synthesizes live pipeline output — run ingestion and the agent scripts first."
            />
          }
        >
          <section className="mt-10">
            <ExecutiveSummary summary={summary} />
          </section>

          <section className="mt-16">
            <SectionHeading eyebrow="STATION BRIEFINGS" title="What's happening, station by station" className="mb-6" />
            <motion.div
              initial="hidden"
              animate="show"
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 gap-5"
            >
              {stations.map((s) => (
                <StationNarrative
                  key={s.station}
                  station={s}
                  forecast={forecastByStation.get(s.station)}
                  enforcementForStation={enforcementByStation.get(s.station)}
                />
              ))}
            </motion.div>
          </section>

          <section className="mt-16 print:hidden">
            <SectionHeading eyebrow="RECOMMENDED ACTIONS" title="Where to act first" className="mb-6" />
            <PriorityActions items={enforcement} limit={enforcement.length} />
          </section>
        </QueryState>
      </main>
      <Footer
        pageLabel="INTELLIGENCE REPORT"
        note="Templated synthesis over live pipeline output · not LLM-generated"
      />
    </>
  );
}
