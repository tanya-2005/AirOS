import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Microscope } from "lucide-react";

import SectionHeading from "../components/ui/SectionHeading";
import LiveDot from "../components/ui/LiveDot";
import QueryState from "../components/ui/QueryState";
import DataSourceBadge from "../components/ui/DataSourceBadge";
import StationPicker from "../components/ui/StationPicker";
import { SkeletonCard } from "../components/ui/Skeleton";
import Card from "../components/ui/Card";
import Footer from "../components/layout/Footer";

import AttributionBreakdown from "../components/attribution/AttributionBreakdown";
import EvidenceTable from "../components/attribution/EvidenceTable";
import MethodologyPanel from "../components/attribution/MethodologyPanel";
import RegistryBrowser from "../components/attribution/RegistryBrowser";

import { useAttribution, useRegistry } from "../lib/hooks/useApi";
import { fadeUp } from "../lib/motion";

export default function Attribution() {
  const attributionQuery = useAttribution();
  const registryQuery = useRegistry();
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

  return (
    <>
      <main className="max-w-content mx-auto px-5 md:px-10 pb-28 flex-1 w-full">
        <motion.section initial="hidden" animate="show" variants={fadeUp} className="pt-14 pb-2">
          <LiveDot label="Source attribution · haversine proximity + weighted scoring" />
          <h1 className="font-display font-normal text-[44px] md:text-[64px] leading-[1.02] tracking-[-.02em] mt-4 text-ink">
            AI Attribution
          </h1>
          <div className="flex gap-3.5 items-start mt-5 max-w-[820px]">
            <div className="shrink-0 w-[34px] h-[34px] rounded-[9px] bg-ink flex items-center justify-center mt-0.5">
              <Microscope size={17} className="text-panel-accent" strokeWidth={1.6} />
            </div>
            <p className="text-[17px] md:text-[19px] leading-[1.55] text-[#33363A]">
              For every hotspot, the AI ranks nearby registry sources by contribution and turns that into a
              confidence share per source type — the evidence, not just the verdict.
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
            <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SkeletonCard lines={6} />
              <SkeletonCard lines={6} />
            </div>
          }
          empty={
            <Card padding="p-9" hover={false} className="mt-10 text-center">
              <div className="font-display text-[22px] text-ink">No attribution data yet</div>
              <p className="text-[14px] text-muted-2 mt-2 max-w-[480px] mx-auto">
                Run ingestion and the attribution agent to populate this page — see the README's local
                development section.
              </p>
            </Card>
          }
        >
          <div className="mt-10">
            <StationPicker stations={stations} selected={stationName} onSelect={handleSelect} />
          </div>

          <section className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <AttributionBreakdown station={selectedStation} />
              <div>
                <SectionHeading eyebrow="EVIDENCE" title="What drove this score" className="mb-[18px]" />
                <EvidenceTable evidence={selectedStation?.evidence} />
              </div>
            </div>
          </section>

          <section className="mt-16">
            <SectionHeading eyebrow="METHODOLOGY" title="Show your math" className="mb-6" />
            <MethodologyPanel />
          </section>

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
      </main>
      <Footer
        pageLabel="AI ATTRIBUTION"
        note="Live pipeline · agents/attribution_agent.py · 3km radius, weighted proximity scoring"
      />
    </>
  );
}
