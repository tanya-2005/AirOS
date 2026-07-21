import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Target, Microscope, ShieldCheck, Hourglass, Database } from "lucide-react";

import SectionHeading from "../components/ui/SectionHeading";
import PageHero from "../components/ui/PageHero";
import QueryState from "../components/ui/QueryState";
import DataSourceBadge from "../components/ui/DataSourceBadge";
import StationPicker from "../components/ui/StationPicker";
import Badge from "../components/ui/Badge";
import { SkeletonCard } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import Footer from "../components/layout/Footer";

import ModelReliabilityPanel from "../components/validation/ModelReliabilityPanel";
import SystemHealthTable from "../components/validation/SystemHealthTable";
import ForecastAccuracyPanel from "../components/validation/ForecastAccuracyPanel";
import PredictionConfidencePanel from "../components/validation/PredictionConfidencePanel";
import HistoricalPerformancePanel from "../components/validation/HistoricalPerformancePanel";
import AttributionReliabilityPanel from "../components/validation/AttributionReliabilityPanel";
import WorkflowNav from "../components/workflow/WorkflowNav";

import {
  useAttribution,
  useForecastValidation,
  useModelReliability,
  useAttributionReliability,
  useSystemHealth,
} from "../lib/hooks/useApi";
import { useCity } from "../lib/city/useCity";
import { systemHealthVerdict } from "../lib/validation";

export default function AIValidation() {
  const { city, cityMeta } = useCity();
  const [searchParams, setSearchParams] = useSearchParams();
  const [station, setStationState] = useState(searchParams.get("station"));

  function setStation(name) {
    setStationState(name);
    setSearchParams(name ? { station: name } : {}, { replace: true });
  }

  const attributionQuery = useAttribution();
  const stations = useMemo(() => attributionQuery.data?.data ?? [], [attributionQuery.data]);

  // A deep link (e.g. an incident's "AI validation" traceability link)
  // should preselect its station even though this page's own picker
  // defaults to null-terminated (nothing selected only means "no query
  // param was present"), and should re-sync if the city changes underneath
  // a stale link.
  useEffect(() => {
    const requested = searchParams.get("station");
    if (requested && requested !== station) setStationState(requested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const validationQuery = useForecastValidation(station);
  const reliabilityQuery = useModelReliability();
  const attrReliabilityQuery = useAttributionReliability();
  const systemHealthQuery = useSystemHealth();

  const payload = validationQuery.data?.data;
  const isEmpty = !payload?.metrics;
  const reliability = reliabilityQuery.data?.data;
  const attrReliability = attrReliabilityQuery.data?.data;
  const cityHealthRow = (systemHealthQuery.data?.data ?? []).find((r) => r.city === city);
  const healthVerdict = systemHealthVerdict(cityHealthRow, cityMeta.label);

  const heroKpis = [
    {
      icon: <Target size={12} strokeWidth={2} />,
      label: "Forecast accuracy (MAE)",
      value: payload?.metrics ? payload.metrics.mae : "No data yet",
      suffix: payload?.metrics ? " pts" : "",
      tone: payload?.metrics ? (payload.metrics.mae <= 15 ? "success" : payload.metrics.mae <= 35 ? "warning" : "danger") : "ink",
    },
    {
      icon: <Microscope size={12} strokeWidth={2} />,
      label: "Attribution confidence",
      value: attrReliability?.avg_top_confidence != null ? Math.round(attrReliability.avg_top_confidence * 100) : "No data yet",
      suffix: attrReliability?.avg_top_confidence != null ? "%" : "",
    },
    {
      icon: <ShieldCheck size={12} strokeWidth={2} />,
      label: "Model reliability",
      value: reliability?.label ?? "—",
      tone: { High: "success", Medium: "warning", Low: "danger" }[reliability?.label] ?? "ink",
    },
  ];

  return (
    <>
      <main className="max-w-content mx-auto px-5 md:px-10 pb-28 flex-1 w-full">
        <PageHero
          icon={<ShieldCheck size={19} strokeWidth={1.8} />}
          mood="accent"
          liveLabel={`Trust & Reliability · ${cityMeta.label} · backtested against logged history`}
          title="Trust & Reliability"
          tagline="How accurate the forecast model has actually been and how much evidence backs each attribution call — measured against real logged history, not asserted."
          kpis={heroKpis}
          extra={validationQuery.data && <DataSourceBadge source={validationQuery.data.data_source} updatedAt={validationQuery.dataUpdatedAt} />}
        />

        {reliability && (
          <details className="mt-8 group">
            <summary className="flex items-center gap-2.5 cursor-pointer list-none font-mono text-[11px] tracking-[.08em] text-muted-3 uppercase hover:text-ink transition-colors">
              <span className="w-5 h-5 rounded-full border border-border flex items-center justify-center text-[10px] group-open:rotate-45 transition-transform">+</span>
              Why "{reliability.label}"? See the reasoning
            </summary>
            <div className="mt-5">
              <ModelReliabilityPanel reliability={reliability} />
            </div>
          </details>
        )}

        <section className="mt-12">
          <SectionHeading eyebrow="SYSTEM HEALTH" title="Is the data behind all of this fresh?" className="mb-6" />
          {systemHealthQuery.isLoading ? (
            <SkeletonCard lines={3} />
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-card border border-border bg-surface px-5 py-4 flex-wrap">
                <Badge tone={healthVerdict.tone}>{healthVerdict.label}</Badge>
                <span className="text-[14px] text-ink flex-1 min-w-0">{healthVerdict.sentence}</span>
              </div>
              <details className="mt-4 group">
                <summary className="flex items-center gap-2.5 cursor-pointer list-none font-mono text-[11px] tracking-[.08em] text-muted-3 uppercase hover:text-ink transition-colors">
                  <span className="w-5 h-5 rounded-full border border-border flex items-center justify-center text-[10px] group-open:rotate-45 transition-transform">+</span>
                  See every city's sync status
                </summary>
                <div className="mt-4">
                  <SystemHealthTable rows={systemHealthQuery.data?.data} />
                </div>
              </details>
            </>
          )}
        </section>

        <section className="mt-12">
          <SectionHeading
            eyebrow="FORECAST ACCURACY"
            title="How good has the forecast actually been?"
            description={`Backtested by comparing what the model would have predicted at each past ingestion run against what the AQI actually turned out to be — for ${cityMeta.label}, all stations or one.`}
            className="mb-6"
          />
          {stations.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <button
                onClick={() => setStation(null)}
                aria-pressed={!station}
                className={`px-3.5 py-2 rounded-full border text-[13px] transition-colors duration-150 cursor-pointer ${
                  !station ? "border-ink bg-ink text-white" : "border-border bg-white text-muted-1 hover:border-border-hover"
                }`}
              >
                All stations
              </button>
              <StationPicker stations={stations} selected={station} onSelect={setStation} label="" />
            </div>
          )}

          <QueryState
            isLoading={validationQuery.isLoading}
            isError={validationQuery.isError}
            error={validationQuery.error}
            onRetry={validationQuery.refetch}
            isEmpty={isEmpty}
            loading={<SkeletonCard lines={6} />}
            empty={
              <EmptyState
                icon={<Hourglass size={18} strokeWidth={1.8} />}
                tone="muted"
                title="Not enough logged history yet to validate"
                description={
                  payload?.note ||
                  "Forecast validation needs at least 2 AQI ingestion snapshots for this city to backtest one prediction. This fills in automatically as ingestion keeps running."
                }
              />
            }
          >
            <div className="flex flex-col gap-10">
              <ForecastAccuracyPanel metrics={payload?.metrics} pairs={payload?.pairs ?? []} />

              <div>
                <SectionHeading eyebrow="PREDICTION CONFIDENCE" title="How sure was the model?" className="mb-6" />
                <PredictionConfidencePanel metrics={payload?.metrics} pairs={payload?.pairs ?? []} />
              </div>

              <div>
                <SectionHeading eyebrow="HISTORICAL PERFORMANCE" title="Getting better or worse over time?" className="mb-6" />
                <HistoricalPerformancePanel trend={payload?.trend} />
              </div>
            </div>
          </QueryState>
        </section>

        <section className="mt-12">
          <SectionHeading
            eyebrow="ATTRIBUTION RELIABILITY"
            title="How much evidence backs each attribution call?"
            className="mb-6"
          />
          <QueryState
            isLoading={attrReliabilityQuery.isLoading}
            isError={attrReliabilityQuery.isError}
            error={attrReliabilityQuery.error}
            onRetry={attrReliabilityQuery.refetch}
            isEmpty={!attrReliabilityQuery.data?.data}
            loading={<SkeletonCard lines={5} />}
            empty={
              <EmptyState
                icon={<Database size={18} strokeWidth={1.8} />}
                tone="warning"
                title="No attribution data yet"
                description={`Run ingestion and the attribution agent for ${cityMeta.label} to populate this section.`}
              />
            }
          >
            <AttributionReliabilityPanel summary={attrReliabilityQuery.data?.data} />
          </QueryState>
        </section>

        <WorkflowNav currentStepId="validation" />
      </main>
      <Footer
        pageLabel="TRUST & RELIABILITY"
        note="Backtested over logged AQI history · agents/validation_agent.py · no fabricated accuracy"
      />
    </>
  );
}
