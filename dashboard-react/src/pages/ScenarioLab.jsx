import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { RotateCcw, Sparkles, ShieldCheck } from "lucide-react";

import SectionHeading from "../components/ui/SectionHeading";
import Button from "../components/ui/Button";
import LiveDot from "../components/ui/LiveDot";
import QueryState from "../components/ui/QueryState";
import { SkeletonCard } from "../components/ui/Skeleton";
import StationPicker from "../components/ui/StationPicker";
import Footer from "../components/layout/Footer";

import PolicyCard from "../components/scenario/PolicyCard";
import PredictionPanel from "../components/scenario/PredictionPanel";
import BeforeAfterCard from "../components/scenario/BeforeAfterCard";
import CityResponseMap from "../components/scenario/CityResponseMap";
import ImpactAssessment from "../components/scenario/ImpactAssessment";
import TradeoffsPanel from "../components/scenario/TradeoffsPanel";
import EvidenceGraph from "../components/scenario/EvidenceGraph";
import AiPickPanel from "../components/scenario/AiPickPanel";
import CompareScenarios from "../components/scenario/CompareScenarios";

import {
  useAttribution,
  useForecast,
  useEnforcement,
  useWeatherCurrent,
  useRegistry,
  useSimulate,
  usePolicyPreviews,
} from "../lib/hooks/useApi";
import { useDebouncedValue } from "../lib/hooks/useDebouncedValue";
import { fadeUp, staggerContainer } from "../lib/motion";
import {
  POLICIES,
  combinePolicies,
  policyDifficulty,
  policyConfidence,
  combinedTradeoffs,
  estimateTimeToImprove,
  estimatePM25,
  estimatePM10,
} from "../lib/policies";

const RECOMMENDED_POLICY_IDS = ["stop_waste_burning", "close_industrial"];

export default function ScenarioLab() {
  const attributionQuery = useAttribution();
  const forecastQuery = useForecast();
  const enforcementQuery = useEnforcement();
  const weatherQuery = useWeatherCurrent();
  const registryQuery = useRegistry();

  const stations = useMemo(() => attributionQuery.data?.data ?? [], [attributionQuery.data]);
  const registry = useMemo(() => registryQuery.data?.data ?? [], [registryQuery.data]);
  const [searchParams] = useSearchParams();
  const requestedStation = searchParams.get("station");

  const [stationName, setStationName] = useState(null);
  const [enabledPolicyIds, setEnabledPolicyIds] = useState([]);
  const [slots, setSlots] = useState({ A: null, B: null, C: null });
  const debouncedPolicyIds = useDebouncedValue(enabledPolicyIds, 250);

  const simulateMutation = useSimulate();
  const recommendMutation = useSimulate();
  const policyPreviews = usePolicyPreviews(stationName, POLICIES);

  // Default to the station requested via ?station= (cross-page link), falling
  // back to the worst (highest-AQI) station once real data arrives.
  useEffect(() => {
    if (stationName || !stations.length) return;
    const match = requestedStation && stations.find((s) => s.station === requestedStation);
    setStationName(match ? match.station : stations[0].station);
  }, [stations, stationName, requestedStation]);

  useEffect(() => {
    if (!stationName) return;
    const { reductions, rain } = combinePolicies(debouncedPolicyIds);
    simulateMutation.mutate({ station: stationName, reductions, rain });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationName, debouncedPolicyIds]);

  useEffect(() => {
    if (!stationName) return;
    const { reductions, rain } = combinePolicies(RECOMMENDED_POLICY_IDS);
    recommendMutation.mutate({ station: stationName, reductions, rain });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationName]);

  const currentStation = stations.find((s) => s.station === stationName);
  const baselineAqi = currentStation?.aqi ?? null;
  const predictedAqi = simulateMutation.data?.projected_aqi ?? baselineAqi;
  const reductionPct = simulateMutation.data?.improvement_pct ?? 0;
  const aqiReduced = baselineAqi != null && predictedAqi != null ? Math.max(0, baselineAqi - predictedAqi) : 0;

  const tradeoffs = useMemo(() => combinedTradeoffs(enabledPolicyIds, registry), [enabledPolicyIds, registry]);
  const confidence = useMemo(() => policyConfidence(enabledPolicyIds.length, reductionPct), [enabledPolicyIds, reductionPct]);
  const timeToImprove = estimateTimeToImprove(aqiReduced);

  const recPredicted = recommendMutation.data?.projected_aqi ?? null;
  const recPrevented = baselineAqi != null && recPredicted != null ? baselineAqi - recPredicted : null;
  const recConfidence =
    recommendMutation.data != null ? policyConfidence(RECOMMENDED_POLICY_IDS.length, recommendMutation.data.improvement_pct) : null;
  const costVsFullPct = useMemo(() => {
    const recCost = combinedTradeoffs(RECOMMENDED_POLICY_IDS, registry).costCr;
    const fullCost = combinedTradeoffs(POLICIES.map((p) => p.id), registry).costCr;
    return fullCost ? Math.round((1 - recCost / fullCost) * 100) : 0;
  }, [registry]);

  const togglePolicy = useCallback((id) => {
    setEnabledPolicyIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }, []);

  function handleApplyRecommended() {
    setEnabledPolicyIds(RECOMMENDED_POLICY_IDS);
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

  const selectedEnforcement = enforcementQuery.data?.data?.find((e) => e.station === stationName) ?? null;
  const selectedWeather = stationName ? weatherQuery.data?.data?.find((w) => w.station_name === stationName) : null;
  const enabledPolicies = enabledPolicyIds.map((id) => POLICIES.find((p) => p.id === id)).filter(Boolean);

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
              Enable one or more policies below to simulate their combined effect before implementation. Each
              card's reduction is a real, live re-forecast from the simulation agent — enable several at once to
              see how they stack.
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
              {/* Left — policy cards */}
              <div>
                <SectionHeading eyebrow="02 · POLICY CARDS" title="Choose interventions" className="mb-[18px]" />
                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={staggerContainer}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  {POLICIES.map((policy, i) => (
                    <motion.div key={policy.id} variants={fadeUp}>
                      <PolicyCard
                        policy={policy}
                        enabled={enabledPolicyIds.includes(policy.id)}
                        onToggle={togglePolicy}
                        previewReduction={
                          policyPreviews[i]?.data
                            ? Math.round((currentStation?.aqi ?? 0) - policyPreviews[i].data.projected_aqi)
                            : null
                        }
                        isPreviewLoading={policyPreviews[i]?.isLoading}
                        difficulty={policyDifficulty(policy, registry)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
                <div className="flex gap-2.5 mt-4">
                  <Button variant="ghost" size="md" icon={<RotateCcw size={14} />} onClick={() => setEnabledPolicyIds([])}>
                    Reset — do nothing
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
                  pm25={predictedAqi != null ? estimatePM25(predictedAqi) : null}
                  pm10={predictedAqi != null ? estimatePM10(predictedAqi) : null}
                  confidence={confidence}
                  timeToImprove={aqiReduced > 0 ? timeToImprove : null}
                  isPending={simulateMutation.isPending}
                />
                <BeforeAfterCard currentAqi={baselineAqi} predictedAqi={predictedAqi} />
                <CityResponseMap reductionFraction={Math.min(1, aqiReduced / 55)} />
              </div>
            </div>
          </section>

          <ImpactAssessment baselineAqi={baselineAqi} predictedAqi={predictedAqi} aqiReduced={aqiReduced} />

          <TradeoffsPanel
            costCr={tradeoffs.costCr}
            timeToImprove={timeToImprove}
            resources={tradeoffs.resources}
            confidence={confidence}
            difficulty={tradeoffs.difficulty}
            difficultyNote={tradeoffs.difficultyNote}
            hasReduction={aqiReduced > 0}
          />

          <section className="mt-16">
            <EvidenceGraph
              station={currentStation}
              weather={selectedWeather}
              forecast={forecastQuery.data?.data?.find((f) => f.station === stationName)}
              enforcementItem={selectedEnforcement}
              enabledPolicies={enabledPolicies}
              baselineAqi={baselineAqi}
              predictedAqi={predictedAqi}
              improvementPct={reductionPct}
            />
          </section>

          <AiPickPanel
            predictedAqi={recPredicted}
            prevented={recPrevented}
            confidence={recConfidence}
            costVsFullPct={costVsFullPct}
            isPending={recommendMutation.isPending}
            onApply={handleApplyRecommended}
          />

          <CompareScenarios slots={slots} onSave={handleSaveSlot} currentAqi={baselineAqi} />
        </QueryState>
      </main>
      <Footer
        pageLabel="SCENARIO LAB"
        note="Sandbox simulation · live agents/simulation_agent.py · no live changes applied"
      />
    </>
  );
}
