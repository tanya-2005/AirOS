import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Radar, Info } from "lucide-react";

import SectionHeading from "../components/ui/SectionHeading";
import LiveDot from "../components/ui/LiveDot";
import QueryState from "../components/ui/QueryState";
import DataSourceBadge from "../components/ui/DataSourceBadge";
import StationPicker from "../components/ui/StationPicker";
import { SkeletonCard } from "../components/ui/Skeleton";
import Card from "../components/ui/Card";
import Footer from "../components/layout/Footer";

import ForecastChart from "../components/forecast/ForecastChart";
import ForecastComponents from "../components/forecast/ForecastComponents";
import CityForecastTable from "../components/forecast/CityForecastTable";

import { useForecast } from "../lib/hooks/useApi";
import { fadeUp } from "../lib/motion";

export default function Forecast() {
  const forecastQuery = useForecast();
  const [searchParams, setSearchParams] = useSearchParams();

  const forecasts = useMemo(() => forecastQuery.data?.data ?? [], [forecastQuery.data]);
  const pickerStations = useMemo(
    () => forecasts.map((f) => ({ station: f.station, aqi: f.current_aqi })),
    [forecasts]
  );

  const requestedStation = searchParams.get("station");
  const [stationName, setStationName] = useState(requestedStation || null);

  useEffect(() => {
    if (stationName || !forecasts.length) return;
    const match = requestedStation && forecasts.find((f) => f.station === requestedStation);
    setStationName(match ? match.station : forecasts[0].station);
  }, [forecasts, stationName, requestedStation]);

  function handleSelect(name) {
    setStationName(name);
    setSearchParams(name ? { station: name } : {}, { replace: true });
  }

  const selected = forecasts.find((f) => f.station === stationName) ?? null;
  const isEmpty = forecastQuery.data?.data_source === "empty";

  return (
    <>
      <main className="max-w-content mx-auto px-5 md:px-10 pb-28 flex-1 w-full">
        <motion.section initial="hidden" animate="show" variants={fadeUp} className="pt-14 pb-2">
          <LiveDot label="Forecast · persistence + weather-adjusted heuristic" />
          <h1 className="font-display font-normal text-[44px] md:text-[64px] leading-[1.02] tracking-[-.02em] mt-4 text-ink">
            Forecast
          </h1>
          <div className="flex gap-3.5 items-start mt-5 max-w-[820px]">
            <div className="shrink-0 w-[34px] h-[34px] rounded-[9px] bg-ink flex items-center justify-center mt-0.5">
              <Radar size={17} className="text-panel-accent" strokeWidth={1.6} />
            </div>
            <p className="text-[17px] md:text-[19px] leading-[1.55] text-[#33363A]">
              24h and 72h AQI projections adjusted for wind, humidity and recent trend on top of a persistence
              baseline — shown against what would happen if nothing about the weather changed at all.
            </p>
          </div>
          <div className="flex items-center gap-2 mt-6 flex-wrap">
            {forecastQuery.data && <DataSourceBadge source={forecastQuery.data.data_source} />}
            <div className="flex items-center gap-1.5 text-[12px] text-muted-3">
              <Info size={13} strokeWidth={1.8} />
              Trend adjustment is currently seeded from a single reading per station — it sharpens as ingestion
              accumulates history.
            </div>
          </div>
        </motion.section>

        <QueryState
          isLoading={forecastQuery.isLoading}
          isError={forecastQuery.isError}
          error={forecastQuery.error}
          onRetry={forecastQuery.refetch}
          isEmpty={isEmpty}
          loading={
            <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
              <SkeletonCard lines={7} />
              <SkeletonCard lines={5} />
            </div>
          }
          empty={
            <Card padding="p-9" hover={false} className="mt-10 text-center">
              <div className="font-display text-[22px] text-ink">No forecast data yet</div>
              <p className="text-[14px] text-muted-2 mt-2 max-w-[480px] mx-auto">
                Run ingestion and the forecast agent to populate this page — see the README's local development
                section.
              </p>
            </Card>
          }
        >
          <div className="mt-10">
            <StationPicker stations={pickerStations} selected={stationName} onSelect={handleSelect} />
          </div>

          <section className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
              <div className="flex flex-col gap-6">
                {selected && (
                  <>
                    <ForecastChart station={selected} forecast24={selected.forecast_24h} forecast72={selected.forecast_72h} />
                    <ForecastComponents station={selected} />
                  </>
                )}
              </div>
              <div className="lg:sticky lg:top-[88px]">
                <SectionHeading eyebrow="CITY OUTLOOK" title="Ranked by projected change" className="mb-[18px]" />
                <CityForecastTable forecasts={forecasts} selected={stationName} onSelect={handleSelect} />
              </div>
            </div>
          </section>
        </QueryState>
      </main>
      <Footer
        pageLabel="FORECAST"
        note="Live pipeline · agents/forecast_agent.py · persistence + wind/humidity/trend heuristic"
      />
    </>
  );
}
