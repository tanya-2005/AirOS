import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { RotateCcw, Sparkles, ShieldCheck } from "lucide-react";

import SectionHeading from "../components/ui/SectionHeading";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import LiveDot from "../components/ui/LiveDot";
import QueryState from "../components/ui/QueryState";
import { SkeletonCard } from "../components/ui/Skeleton";
import StationPicker from "../components/ui/StationPicker";
import Footer from "../components/layout/Footer";

import LeverRow from "../components/scenario/LeverRow";
import PredictionPanel from "../components/scenario/PredictionPanel";
import BeforeAfterCard from "../components/scenario/BeforeAfterCard";
import CityResponseMap from "../components/scenario/CityResponseMap";
import BenefitsStrip from "../components/scenario/BenefitsStrip";
import TradeoffsPanel from "../components/scenario/TradeoffsPanel";
import AiPickPanel from "../components/scenario/AiPickPanel";
import CompareScenarios from "../components/scenario/CompareScenarios";

import { useAttribution, useSimulate } from "../lib/hooks/useApi";
import { useDebouncedValue } from "../lib/hooks/useDebouncedValue";
import { fadeUp } from "../lib/motion";
import {
  LEVER_ORDER,
  LEVER_DEFAULTS,
  RECOMMENDED_LEVERS,
  FULL_SHUTDOWN_LEVERS,
  mapLeversToReductions,
  computeTradeoffs,
  estimateConfidence,
  estimateTimeToImprove,
  estimateCo2SavedTonnes,
} from "../lib/scenario";

export default function ScenarioLab() {
  const attributionQuery = useAttribution();
  const stations = attributionQuery.data?.data ?? [];
  const [searchParams] = useSearchParams();
  const requestedStation = searchParams.get("station");

  const [stationName, setStationName] = useState(null);
  const [levers, setLevers] = useState(LEVER_DEFAULTS);
  const [slots, setSlots] = useState({ A: null, B: null, C: null });
  const debouncedLevers = useDebouncedValue(levers, 300);

  const simulateMutation = useSimulate();
  const recommendMutation = useSimulate();

  // Default to the station requested via ?station= (cross-page link), falling
  // back to the worst (highest-AQI) station once real data arrives.
  useEffect(() => {
    if (stationName || !stations.length) return;
    const match = requestedStation && stations.find((s) => s.station === requestedStation);
    setStationName(match ? match.station : stations[0].station);
  }, [stations, stationName, requestedStation]);

  useEffect(() => {
    if (!stationName) return;
    simulateMutation.mutate({ station: stationName, reductions: mapLeversToReductions(debouncedLevers) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationName, debouncedLevers]);

  useEffect(() => {
    if (!stationName) return;
    recommendMutation.mutate({ station: stationName, reductions: mapLeversToReductions(RECOMMENDED_LEVERS) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationName]);

  const currentStation = stations.find((s) => s.station === stationName);
  const baselineAqi = currentStation?.aqi ?? null;
  const predictedAqi = simulateMutation.data?.projected_aqi ?? baselineAqi;
  const reductionPct = simulateMutation.data?.improvement_pct ?? 0;
  const aqiReduced = baselineAqi != null && predictedAqi != null ? Math.max(0, baselineAqi - predictedAqi) : 0;

  const tradeoffs = useMemo(() => computeTradeoffs(levers), [levers]);
  const confidence = useMemo(() => estimateConfidence(levers, reductionPct), [levers, reductionPct]);
  const timeToImprove = estimateTimeToImprove(aqiReduced);
  const co2Saved = useMemo(() => estimateCo2SavedTonnes(levers), [levers]);

  const recPredicted = recommendMutation.data?.projected_aqi ?? null;
  const recPrevented = baselineAqi != null && recPredicted != null ? baselineAqi - recPredicted : null;
  const recConfidence =
    recommendMutation.data != null ? estimateConfidence(RECOMMENDED_LEVERS, recommendMutation.data.improvement_pct) : null;
  const costVsFullPct = useMemo(() => {
    const recCost = computeTradeoffs(RECOMMENDED_LEVERS).costCr;
    const fullCost = computeTradeoffs(FULL_SHUTDOWN_LEVERS).costCr;
    return fullCost ? Math.round((1 - recCost / fullCost) * 100) : 0;
  }, []);

  function handleLeverChange(key, value) {
    setLevers((prev) => ({ ...prev, [key]: value }));
  }

  function handleApplyRecommended() {
    setLevers(RECOMMENDED_LEVERS);
  }

  function handleSaveSlot(id) {
    setSlots((prev) => ({
      ...prev,
      [id]: {
        predicted: predictedAqi,
        prevented: aqiReduced,
        costCr: tradeoffs.costCr,
        confidence,
        difficulty: tradeoffs.difficulty,
      },
    }));
  }

  return (
    <>
      <main className="max-w-content mx-auto px-5 md:px-10 pb-28 flex-1 w-full">
        {/* Hero */}
        <motion.section initial="hidden" animate="show" variants={fadeUp} className="pt-14 pb-2">
          <LiveDot label="Simulation · sandbox · no live changes applied" />
          <h1 className="font-display font-normal text-[44px] md:text-[64px] leading-[1.02] tracking-[-.02em] mt-4 text-ink">
            Scenario Lab
          </h1>
          <div className="flex gap-3.5 items-start mt-5 max-w-[820px]">
            <div className="shrink-0 w-[34px] h-[34px] rounded-[9px] bg-ink flex items-center justify-center mt-0.5">
              <ShieldCheck size={17} className="text-panel-accent" strokeWidth={1.6} />
            </div>
            <p className="text-[17px] md:text-[19px] leading-[1.55] text-[#33363A]">
              Simulate interventions before implementation and understand their predicted impact on air quality.
              Adjust the levers below — the AI re-forecasts the station in real time, with confidence and
              trade-offs for every choice.
            </p>
          </div>

          {stations.length > 0 && (
            <div className="mt-7">
              <StationPicker stations={stations} selected={stationName} onSelect={setStationName} />
            </div>
          )}
        </motion.section>

        <QueryState
          isLoading={attributionQuery.isLoading}
          isError={attributionQuery.isError}
          error={attributionQuery.error}
          onRetry={attributionQuery.refetch}
          loading={
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 mt-10">
              <SkeletonCard lines={6} />
              <SkeletonCard lines={4} />
            </div>
          }
        >
          {/* Workspace */}
          <section className="mt-10">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
              {/* Left — intervention controls */}
              <div>
                <SectionHeading eyebrow="02 · INTERVENTION CONTROLS" title="Adjust the levers" className="mb-[18px]" />
                <Card padding="px-7 py-2" hover={false}>
                  {LEVER_ORDER.map((key, i) => (
                    <LeverRow
                      key={key}
                      leverKey={key}
                      value={levers[key]}
                      onChange={handleLeverChange}
                      last={i === LEVER_ORDER.length - 1}
                    />
                  ))}
                </Card>
                <div className="flex gap-2.5 mt-4">
                  <Button variant="ghost" size="md" icon={<RotateCcw size={14} />} onClick={() => setLevers(LEVER_DEFAULTS)}>
                    Reset to current
                  </Button>
                  <Button variant="primary" size="md" icon={<Sparkles size={15} className="text-panel-accent" />} onClick={handleApplyRecommended}>
                    Apply AI recommendation
                  </Button>
                </div>
              </div>

              {/* Right — live prediction (sticky) */}
              <div className="lg:sticky lg:top-[88px] flex flex-col gap-4">
                <PredictionPanel
                  aqi={predictedAqi}
                  pm25={predictedAqi != null ? Math.round(predictedAqi * 0.58) : null}
                  pm10={predictedAqi != null ? Math.round(predictedAqi * 1.12) : null}
                  confidence={confidence}
                  timeToImprove={aqiReduced > 0 ? timeToImprove : null}
                  isPending={simulateMutation.isPending}
                />
                <BeforeAfterCard currentAqi={baselineAqi} predictedAqi={predictedAqi} />
                <CityResponseMap reductionFraction={Math.min(1, aqiReduced / 55)} />
              </div>
            </div>
          </section>

          <BenefitsStrip aqiReduced={aqiReduced} co2SavedTonnes={co2Saved} />

          <TradeoffsPanel
            costCr={tradeoffs.costCr}
            timeToImprove={timeToImprove}
            resources={tradeoffs.resources}
            confidence={confidence}
            difficulty={tradeoffs.difficulty}
            difficultyNote={tradeoffs.difficultyNote}
            hasReduction={aqiReduced > 0}
          />

          <AiPickPanel
            predictedAqi={recPredicted}
            prevented={recPrevented}
            confidence={recConfidence}
            costVsFullPct={costVsFullPct}
            isPending={recommendMutation.isPending}
            onApply={handleApplyRecommended}
          />

          <CompareScenarios slots={slots} onSave={handleSaveSlot} />
        </QueryState>
      </main>
      <Footer
        pageLabel="SCENARIO LAB"
        note="Sandbox simulation · live agents/simulation_agent.py · no live changes applied"
      />
    </>
  );
}
