import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, AlertTriangle, Activity, ShieldAlert, DatabaseZap } from "lucide-react";

import SectionHeading from "../components/ui/SectionHeading";
import Card from "../components/ui/Card";
import StatTile from "../components/ui/StatTile";
import LiveDot from "../components/ui/LiveDot";
import QueryState from "../components/ui/QueryState";
import DataSourceBadge from "../components/ui/DataSourceBadge";
import { SkeletonCard } from "../components/ui/Skeleton";
import Footer from "../components/layout/Footer";

import HotspotList from "../components/command/HotspotList";
import StationDetailPanel from "../components/command/StationDetailPanel";
import PriorityActions from "../components/command/PriorityActions";

import { useAttribution, useForecast, useEnforcement } from "../lib/hooks/useApi";
import { fadeUp, staggerContainer } from "../lib/motion";

const ICON_PROPS = { size: 20, strokeWidth: 1.8 };

export default function CommandCenter() {
  const attributionQuery = useAttribution();
  const forecastQuery = useForecast();
  const enforcementQuery = useEnforcement();

  const stations = useMemo(() => {
    const raw = attributionQuery.data?.data ?? [];
    return [...raw].sort((a, b) => b.aqi - a.aqi);
  }, [attributionQuery.data]);

  const forecasts = useMemo(() => forecastQuery.data?.data ?? [], [forecastQuery.data]);
  const enforcement = useMemo(() => enforcementQuery.data?.data ?? [], [enforcementQuery.data]);

  const [selected, setSelected] = useState(null);
  useEffect(() => {
    if (!selected && stations.length) setSelected(stations[0].station);
  }, [stations, selected]);

  const selectedStation = stations.find((s) => s.station === selected) ?? null;
  const selectedForecast = forecasts.find((f) => f.station === selected) ?? null;

  const stats = useMemo(() => {
    if (!stations.length) return null;
    const avg = stations.reduce((sum, s) => sum + s.aqi, 0) / stations.length;
    const activeActions = enforcement.filter((e) => e.evidence?.active).length;
    return {
      tracked: stations.length,
      peak: stations[0].aqi,
      avg: Math.round(avg),
      activeActions,
    };
  }, [stations, enforcement]);

  const isEmpty = attributionQuery.data?.data_source === "empty";

  return (
    <>
      <main className="max-w-content mx-auto px-5 md:px-10 pb-28 flex-1 w-full">
        <motion.section initial="hidden" animate="show" variants={fadeUp} className="pt-14 pb-2">
          <LiveDot label="City intelligence · attribution → forecast → enforcement" />
          <h1 className="font-display font-normal text-[44px] md:text-[64px] leading-[1.02] tracking-[-.02em] mt-4 text-ink">
            Command Center
          </h1>
          <div className="flex gap-3.5 items-start mt-5 max-w-[820px]">
            <div className="shrink-0 w-[34px] h-[34px] rounded-[9px] bg-ink flex items-center justify-center mt-0.5">
              <DatabaseZap size={17} className="text-panel-accent" strokeWidth={1.6} />
            </div>
            <p className="text-[17px] md:text-[19px] leading-[1.55] text-[#33363A]">
              Every monitored station in Delhi NCR, ranked by severity, with the AI's live source attribution,
              short-range forecast, and the highest-priority enforcement actions the pipeline recommends right now.
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
            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} lines={1} />
              ))}
            </div>
          }
          empty={
            <Card padding="p-9" hover={false} className="mt-10 text-center">
              <div className="font-display text-[22px] text-ink">No station data yet</div>
              <p className="text-[14px] text-muted-2 mt-2 max-w-[480px] mx-auto">
                Ingestion hasn't been run against a live WAQI token, and no cached pipeline run exists either.
                Run <code className="font-mono text-[13px] bg-search px-1.5 py-0.5 rounded">ingestion/fetch_waqi.py</code>{" "}
                followed by the agent scripts to populate this dashboard.
              </p>
            </Card>
          }
        >
          {stats && (
            <motion.div
              initial="hidden"
              animate="show"
              variants={staggerContainer}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10"
            >
              <motion.div variants={fadeUp}>
                <StatTile icon={<MapPin {...ICON_PROPS} className="text-accent" />} value={stats.tracked} label="Stations tracked" />
              </motion.div>
              <motion.div variants={fadeUp}>
                <StatTile icon={<AlertTriangle {...ICON_PROPS} className="text-danger" />} value={stats.peak} label="Peak AQI right now" />
              </motion.div>
              <motion.div variants={fadeUp}>
                <StatTile icon={<Activity {...ICON_PROPS} className="text-warning" />} value={stats.avg} label="City average AQI" />
              </motion.div>
              <motion.div variants={fadeUp}>
                <StatTile icon={<ShieldAlert {...ICON_PROPS} className="text-danger" />} value={stats.activeActions} label="Active enforcement gaps" />
              </motion.div>
            </motion.div>
          )}

          <section className="mt-14">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
              <div>
                <SectionHeading eyebrow="01 · CITY HOTSPOTS" title="Ranked by severity" className="mb-[18px]" />
                <HotspotList stations={stations} selected={selected} onSelect={setSelected} />
              </div>
              <div className="lg:sticky lg:top-[88px]">
                <StationDetailPanel
                  station={selectedStation}
                  forecast={selectedForecast}
                  isLoadingForecast={forecastQuery.isLoading}
                />
              </div>
            </div>
          </section>

          <section className="mt-16">
            <SectionHeading
              eyebrow="02 · PRIORITY ACTIONS"
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
              <PriorityActions items={enforcement} />
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
