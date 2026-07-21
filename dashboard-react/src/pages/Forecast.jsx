import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Gauge, TrendingUp, TrendingDown, Minus, Percent, Radar, Database, Microscope, ClipboardList } from "lucide-react";

import SectionHeading from "../components/ui/SectionHeading";
import PageHero from "../components/ui/PageHero";
import QueryState from "../components/ui/QueryState";
import DataSourceBadge from "../components/ui/DataSourceBadge";
import StationPicker from "../components/ui/StationPicker";
import IncidentContextBanner from "../components/ui/IncidentContextBanner";
import { SkeletonCard } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import Footer from "../components/layout/Footer";

import ForecastChart from "../components/forecast/ForecastChart";
import ForecastComponents from "../components/forecast/ForecastComponents";
import CityForecastTable from "../components/forecast/CityForecastTable";
import CurrentWeatherPanel from "../components/forecast/CurrentWeatherPanel";
import WeatherEffectsList from "../components/forecast/WeatherEffectsList";
import ForecastConfidenceFactors from "../components/forecast/ForecastConfidenceFactors";
import HistoricalTrendChart from "../components/forecast/HistoricalTrendChart";
import WorkflowNav from "../components/workflow/WorkflowNav";

import { useForecast, useWeatherCurrent, useStationHistory, useIncidents } from "../lib/hooks/useApi";
import { categoryFor } from "../lib/aqi";
import { deltaFromHistory } from "../lib/decision";
import { activeIncidentForStation } from "../lib/incidents";

export default function Forecast() {
  const forecastQuery = useForecast();
  const weatherQuery = useWeatherCurrent();
  const incidentsQuery = useIncidents();
  const [searchParams, setSearchParams] = useSearchParams();
  const [historyHours, setHistoryHours] = useState(24);

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

  const handleSelect = useCallback(
    (name) => {
      setStationName(name);
      setSearchParams(name ? { station: name } : {}, { replace: true });
    },
    [setSearchParams]
  );

  const selected = forecasts.find((f) => f.station === stationName) ?? null;
  const selectedWeather = (weatherQuery.data?.data ?? []).find((w) => w.station_name === stationName) ?? null;
  const stationHistoryQuery = useStationHistory(stationName, historyHours);
  const isEmpty = forecastQuery.data?.data_source === "empty";
  const stationIncident = stationName ? activeIncidentForStation(incidentsQuery.data?.data ?? [], stationName) : null;

  const trendDelta = deltaFromHistory(stationHistoryQuery.data?.data);
  const heroKpis = selected
    ? [
        {
          icon: <Gauge size={12} strokeWidth={2} />,
          label: "Current AQI",
          value: Math.round(selected.current_aqi),
          sub: categoryFor(selected.current_aqi).label,
          color: categoryFor(selected.current_aqi).color,
        },
        {
          icon: <TrendingUp size={12} strokeWidth={2} />,
          label: "24h prediction",
          value: Math.round(selected.forecast_24h.predicted_aqi),
          sub: categoryFor(selected.forecast_24h.predicted_aqi).label,
          color: categoryFor(selected.forecast_24h.predicted_aqi).color,
        },
        {
          icon: <Percent size={12} strokeWidth={2} />,
          label: "Confidence",
          value: Math.round(selected.forecast_24h.confidence * 100),
          suffix: "%",
        },
        {
          icon: trendDelta > 0 ? <TrendingUp size={12} strokeWidth={2} /> : trendDelta < 0 ? <TrendingDown size={12} strokeWidth={2} /> : <Minus size={12} strokeWidth={2} />,
          label: "Recent trend",
          value: trendDelta != null ? `${trendDelta > 0 ? "+" : ""}${trendDelta} AQI` : "No history yet",
          tone: trendDelta > 2 ? "danger" : trendDelta < -2 ? "success" : "ink",
        },
      ]
    : [];

  return (
    <>
      <main className="max-w-content mx-auto px-5 md:px-10 pb-28 flex-1 w-full">
        <PageHero
          icon={<Radar size={19} strokeWidth={1.8} />}
          mood="warning"
          liveLabel="Prediction Engine · persistence + weather-adjusted heuristic"
          title="Prediction Engine"
          tagline={
            selected
              ? `${selected.station} is projected to ${
                  selected.forecast_24h.predicted_aqi > selected.current_aqi + 2
                    ? "worsen"
                    : selected.forecast_24h.predicted_aqi < selected.current_aqi - 2
                      ? "improve"
                      : "hold steady"
                } to ${Math.round(selected.forecast_24h.predicted_aqi)} within 24h — plan inspections accordingly.`
              : "Pick a station to see its 24h/72h AQI projection."
          }
          kpis={heroKpis}
          primaryAction={
            !selected
              ? undefined
              : stationIncident
                ? { label: "Open Case File", to: `/incidents/${encodeURIComponent(stationIncident.id)}`, icon: <ClipboardList size={14} /> }
                : { label: "Investigate the Source", to: `/attribution?station=${encodeURIComponent(selected.station)}`, icon: <Microscope size={14} /> }
          }
          extra={
            <div className="flex items-center gap-2 flex-wrap">
              {forecastQuery.data && <DataSourceBadge source={forecastQuery.data.data_source} updatedAt={forecastQuery.dataUpdatedAt} />}
            </div>
          }
        />

        <IncidentContextBanner incident={stationIncident} />

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
            <EmptyState
              icon={<Database size={18} strokeWidth={1.8} />}
              tone="warning"
              title="No forecast data yet"
              description="Run ingestion and the forecast agent to populate this page — see the README's local development section."
            />
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <CurrentWeatherPanel weather={selectedWeather} isLoading={weatherQuery.isLoading} />
                      <WeatherEffectsList effects={selected.forecast_24h?.weather_effects} />
                    </div>
                    <ForecastComponents station={selected} />
                    <ForecastConfidenceFactors
                      factors={selected.forecast_24h?.confidence_factors}
                      confidence={selected.forecast_24h?.confidence}
                    />
                    <HistoricalTrendChart
                      history={stationHistoryQuery.data?.data}
                      isLoading={stationHistoryQuery.isLoading}
                      hours={historyHours}
                      onChangeHours={setHistoryHours}
                    />
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

        <WorkflowNav currentStepId="forecast" nextQuery={stationName ? `?station=${encodeURIComponent(stationName)}` : ""} />
      </main>
      <Footer
        pageLabel="PREDICTION ENGINE"
        note="Live pipeline · agents/forecast_agent.py · persistence + wind/humidity/trend heuristic"
      />
    </>
  );
}
