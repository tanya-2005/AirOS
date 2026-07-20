import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Flame, ShieldAlert, Activity, MapPin, DatabaseZap } from "lucide-react";

import SectionHeading from "../components/ui/SectionHeading";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import StatTile from "../components/ui/StatTile";
import InsightTile from "../components/ui/InsightTile";
import LiveDot from "../components/ui/LiveDot";
import QueryState from "../components/ui/QueryState";
import DataSourceBadge from "../components/ui/DataSourceBadge";
import { SkeletonCard } from "../components/ui/Skeleton";
import Footer from "../components/layout/Footer";

import HotspotList from "../components/command/HotspotList";
import StationDetailPanel from "../components/command/StationDetailPanel";
import CriticalAlerts from "../components/command/CriticalAlerts";
import AIDecisionPanel from "../components/command/AIDecisionPanel";
import ExplainabilityTimeline from "../components/command/ExplainabilityTimeline";
import ExecutiveSummary from "../components/report/ExecutiveSummary";

import { useAttribution, useForecast, useEnforcement, useWeatherCurrent, useStationHistory } from "../lib/hooks/useApi";
import { fadeUp, staggerContainer } from "../lib/motion";
import { citySummary } from "../lib/report";
import { topPollutionDriver, deltaFromHistory } from "../lib/decision";

const ICON_PROPS = { size: 20, strokeWidth: 1.8 };

export default function CommandCenter() {
  const attributionQuery = useAttribution();
  const forecastQuery = useForecast();
  const enforcementQuery = useEnforcement();
  const weatherQuery = useWeatherCurrent();

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

  return (
    <>
      <main className="max-w-content mx-auto px-5 md:px-10 pb-28 flex-1 w-full">
        <motion.section initial="hidden" animate="show" variants={fadeUp} className="pt-14 pb-2">
          <LiveDot label="AI decision support · attribution → forecast → enforcement" />
          <h1 className="font-display font-normal text-[44px] md:text-[64px] leading-[1.02] tracking-[-.02em] mt-4 text-ink">
            Command Center
          </h1>
          <div className="flex gap-3.5 items-start mt-5 max-w-[820px]">
            <div className="shrink-0 w-[34px] h-[34px] rounded-[9px] bg-ink flex items-center justify-center mt-0.5">
              <DatabaseZap size={17} className="text-panel-accent" strokeWidth={1.6} />
            </div>
            <p className="text-[17px] md:text-[19px] leading-[1.55] text-[#33363A]">
              What's happening across Delhi NCR right now, why it's happening, and what the AI recommends doing
              about it first — every number traces back to a live agent, nothing here is generated text
              standing in for a fact.
            </p>
          </div>
          {attributionQuery.data && (
            <div className="mt-6">
              <DataSourceBadge source={attributionQuery.data.data_source} />
            </div>
          )}
        </motion.section>

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
              title="No station data yet"
              description={
                <>
                  Ingestion hasn't been run against a live WAQI token, and no cached pipeline run exists either.
                  Run <code className="font-mono text-[13px] bg-search px-1.5 py-0.5 rounded">ingestion/fetch_waqi.py</code>{" "}
                  followed by the agent scripts to populate this dashboard.
                </>
              }
            />
          }
        >
          {/* 01 — Critical Alerts */}
          <section className="mt-10">
            <CriticalAlerts stations={stations} enforcement={enforcement} />
          </section>

          {/* Narrative stat strip — top pollution driver + highest priority station,
              framed as insights rather than bare KPI numbers */}
          {stats && (
            <motion.div
              initial="hidden"
              animate="show"
              variants={staggerContainer}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6"
            >
              <motion.div variants={fadeUp}>
                <InsightTile
                  icon={<Flame {...ICON_PROPS} className="text-danger" />}
                  value={driver ? driver.label : "None in range"}
                  label="Top pollution driver, city-wide"
                />
              </motion.div>
              <motion.div variants={fadeUp}>
                <InsightTile
                  icon={<MapPin {...ICON_PROPS} className="text-danger" />}
                  value={stations[0] ? `${stations[0].station} · ${Math.round(stations[0].aqi)}` : "—"}
                  label="Highest priority station"
                />
              </motion.div>
              <motion.div variants={fadeUp}>
                <StatTile icon={<Activity {...ICON_PROPS} className="text-warning" />} value={stats.avg} label="City average AQI" />
              </motion.div>
              <motion.div variants={fadeUp}>
                <StatTile icon={<ShieldAlert {...ICON_PROPS} className="text-danger" />} value={stats.activeActions} label="Active enforcement gaps" />
              </motion.div>
            </motion.div>
          )}

          {/* 02 — AI Executive Summary (reused from the Intelligence Report page — same templated-over-real-numbers narrative, not a duplicate implementation) */}
          <section className="mt-10">
            <ExecutiveSummary summary={summary} />
          </section>

          {/* 03 — Hotspots + station detail, with risk badge and snapshot-to-snapshot trend */}
          <section className="mt-16">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
              <div>
                <SectionHeading eyebrow="03 · CITY HOTSPOTS" title="Ranked by severity" className="mb-[18px]" />
                <HotspotList stations={stations} selected={selected} onSelect={setSelected} />
              </div>
              <div className="lg:sticky lg:top-[88px]">
                <StationDetailPanel
                  station={selectedStation}
                  forecast={selectedForecast}
                  isLoadingForecast={forecastQuery.isLoading}
                  trendDelta={trendDelta}
                />
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

          {/* 05 — AI Decision Panel: recommended actions with why/evidence/confidence/difficulty */}
          <section className="mt-16">
            <SectionHeading
              eyebrow="05 · AI DECISION PANEL"
              title="What the AI recommends acting on first"
              right={enforcementQuery.data && <DataSourceBadge source={enforcementQuery.data.data_source} />}
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
        </QueryState>
      </main>
      <Footer
        pageLabel="COMMAND CENTER"
        note="Live pipeline · attribution → forecast → simulation, evidence-based recommendations"
      />
    </>
  );
}
