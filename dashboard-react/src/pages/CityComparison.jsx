import { useNavigate } from "react-router-dom";
import { Globe2, Trophy, AlertOctagon, Search, Database } from "lucide-react";

import SectionHeading from "../components/ui/SectionHeading";
import PageHero from "../components/ui/PageHero";
import QueryState from "../components/ui/QueryState";
import DataSourceBadge from "../components/ui/DataSourceBadge";
import { SkeletonCard } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import Footer from "../components/layout/Footer";

import CityRankingsTable from "../components/cities/CityRankingsTable";
import CityTrendAnalysis from "../components/cities/CityTrendAnalysis";

import { useCityComparison } from "../lib/hooks/useApi";
import { useCity } from "../lib/city/useCity";
import { citiesWithLiveData, bestPerformingCity, worstPerformingCity } from "../lib/cityComparison";

export default function CityComparison() {
  const { city: selectedCity, setCity } = useCity();
  const navigate = useNavigate();
  const comparisonQuery = useCityComparison();

  const rows = comparisonQuery.data?.data ?? [];
  const isEmpty = rows.length === 0;
  const live = citiesWithLiveData(rows);
  const best = bestPerformingCity(rows);
  const worst = worstPerformingCity(rows);

  function jumpToCity(cityId) {
    setCity(cityId);
    navigate("/mission-control");
  }

  const heroKpis = live.length
    ? [
        { icon: <Globe2 size={12} strokeWidth={2} />, label: "Cities live", value: `${live.length}/${rows.length}` },
        { icon: <Trophy size={12} strokeWidth={2} />, label: "Best AQI", value: best?.label ?? "—", sub: best ? `${Math.round(best.current_aqi)} AQI` : undefined, tone: "success" },
        { icon: <AlertOctagon size={12} strokeWidth={2} />, label: "Needs attention", value: worst?.label ?? "—", sub: worst ? `${Math.round(worst.current_aqi)} AQI` : undefined, tone: "danger" },
      ]
    : [];

  return (
    <>
      <main className="max-w-content mx-auto px-5 md:px-10 pb-28 flex-1 w-full">
        <PageHero
          icon={<Globe2 size={19} strokeWidth={1.8} />}
          mood="accent"
          liveLabel="Multi-city operations · national rollup"
          title="City Comparison"
          tagline="All supported cities, ranked by government priority — click one to switch the whole dashboard to it."
          kpis={heroKpis}
          primaryAction={
            worst ? { label: `Investigate ${worst.label}`, onClick: () => jumpToCity(worst.city), icon: <Search size={14} /> } : undefined
          }
          extra={comparisonQuery.data && <DataSourceBadge source={comparisonQuery.data.data_source} updatedAt={comparisonQuery.dataUpdatedAt} />}
        />

        <QueryState
          isLoading={comparisonQuery.isLoading}
          isError={comparisonQuery.isError}
          error={comparisonQuery.error}
          onRetry={comparisonQuery.refetch}
          isEmpty={isEmpty}
          loading={
            <div className="mt-10">
              <SkeletonCard lines={8} />
            </div>
          }
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
            <SectionHeading eyebrow="01 · RANKINGS" title="Government priority, city by city" className="mb-6" />
            <CityRankingsTable rows={rows} selectedCity={selectedCity} onJumpToCity={jumpToCity} />
          </section>

          <section className="mt-16">
            <SectionHeading
              eyebrow="02 · TREND ANALYSIS"
              title="Who's improving, who needs attention"
              description="Derived from each city's real current AQI vs. its own 24h forecast and emergency level — not a separate metric."
              className="mb-6"
            />
            <CityTrendAnalysis rows={rows} />
          </section>
        </QueryState>
      </main>
      <Footer
        pageLabel="CITY COMPARISON"
        note="Live pipeline · one rollup call per city · /api/cities/compare"
      />
    </>
  );
}
