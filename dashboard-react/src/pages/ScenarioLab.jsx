import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { RotateCcw, Sparkles, ClipboardList, ArrowRight, ListChecks, Gauge, TrendingDown, FlaskConical } from "lucide-react";

import SectionHeading from "../components/ui/SectionHeading";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import PageHero from "../components/ui/PageHero";
import QueryState from "../components/ui/QueryState";
import { SkeletonCard } from "../components/ui/Skeleton";
import StationPicker from "../components/ui/StationPicker";
import Footer from "../components/layout/Footer";
import SeverityBadge from "../components/incidents/SeverityBadge";

import PolicyCard from "../components/scenario/PolicyCard";
import PredictionPanel from "../components/scenario/PredictionPanel";
import BeforeAfterCard from "../components/scenario/BeforeAfterCard";
import ImpactAssessment from "../components/scenario/ImpactAssessment";
import HealthImpactEstimates from "../components/health/HealthImpactEstimates";
import TradeoffsPanel from "../components/scenario/TradeoffsPanel";
import EvidenceGraph from "../components/scenario/EvidenceGraph";
import AiPickPanel from "../components/scenario/AiPickPanel";
import CompareScenarios from "../components/scenario/CompareScenarios";
import WorkflowNav from "../components/workflow/WorkflowNav";

import {
  useAttribution,
  useForecast,
  useEnforcement,
  useWeatherCurrent,
  useRegistry,
  useSimulate,
  usePolicyPreviews,
  useIncident,
} from "../lib/hooks/useApi";
import { useCity } from "../lib/city/useCity";
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
  const { city } = useCity();
  const attributionQuery = useAttribution();
  const forecastQuery = useForecast();
  const enforcementQuery = useEnforcement();
  const weatherQuery = useWeatherCurrent();
  const registryQuery = useRegistry();

  const stations = useMemo(() => attributionQuery.data?.data ?? [], [attributionQuery.data]);
  const registry = useMemo(() => registryQuery.data?.data ?? [], [registryQuery.data]);
  const [searchParams] = useSearchParams();
  const requestedStation = searchParams.get("station");
  const requestedIncidentId = searchParams.get("incident");
  const incidentQuery = useIncident(requestedIncidentId);
  const incident = incidentQuery.data?.data ?? null;

  const [stationName, setStationName] = useState(null);
  const [enabledPolicyIds, setEnabledPolicyIds] = useState([]);
  const [slots, setSlots] = useState({ A: null, B: null, C: null });
  const debouncedPolicyIds = useDebouncedValue(enabledPolicyIds, 250);

  const simulateMutation = useSimulate();
  const recommendMutation = useSimulate();
  const policyPreviews = usePolicyPreviews(stationName, POLICIES);

  // Switching cities in the nav invalidates whatever station/comparison
  // slots were picked for the previous one (a Delhi station name means
  // nothing once Scenario Lab is scoped to Mumbai) — clear them and let the
  // effect below pick this city's default station instead of silently
  // simulating against a station that no longer exists here.
  useEffect(() => {
    setStationName(null);
    setEnabledPolicyIds([]);
    setSlots({ A: null, B: null, C: null });
  }, [city]);

  // Default to the incident's station when arriving via ?incident= (e.g. the
  // Incident Detail page's "Simulate impact" link), else the station
  // requested via ?station= (any other cross-page link), else the worst
  // (highest-AQI) station once real data arrives.
  useEffect(() => {
    if (stationName || !stations.length) return;
    if (requestedIncidentId && !incident) return; // wait for the incident to resolve before picking a fallback
    const target = incident?.station || requestedStation;
    const match = target && stations.find((s) => s.station === target);
    setStationName(match ? match.station : stations[0].station);
  }, [stations, stationName, requestedStation, requestedIncidentId, incident]);

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
  const recommendedPolicies = RECOMMENDED_POLICY_IDS.map((id) => POLICIES.find((p) => p.id === id)).filter(Boolean);

  const heroKpis = currentStation
    ? [
        {
          icon: <ListChecks size={12} strokeWidth={2} />,
          label: "Current policy",
          value: enabledPolicies.length === 0 ? "No intervention" : `${enabledPolicies.length} active`,
          sub: enabledPolicies.length > 0 ? enabledPolicies.map((p) => p.label).join(", ") : "Baseline forecast",
        },
        {
          icon: <Gauge size={12} strokeWidth={2} />,
          label: "Predicted AQI",
          value: predictedAqi != null ? Math.round(predictedAqi) : "—",
        },
        {
          icon: <TrendingDown size={12} strokeWidth={2} />,
          label: "Estimated improvement",
          value: Math.round(reductionPct),
          suffix: "%",
          tone: reductionPct > 0 ? "success" : "ink",
        },
        {
          icon: <TrendingDown size={12} strokeWidth={2} />,
          label: "Expected AQI reduction",
          value: Math.round(aqiReduced),
          suffix: " pts",
          tone: aqiReduced > 0 ? "success" : "ink",
        },
      ]
    : [];

  return (
    <>
      <main className="max-w-content mx-auto px-5 md:px-10 pb-28 flex-1 w-full">
        <PageHero
          icon={<FlaskConical size={19} strokeWidth={1.8} />}
          mood="success"
          liveLabel="Decision Support · sandbox · no live changes applied"
          title="Decision Support"
          tagline={currentStation ? `${currentStation.station} — the AI's recommended combination leads below, with alternatives to explore underneath.` : "Pick a station to see which intervention works best, led by the AI's recommended combination."}
          kpis={heroKpis}
        />

        <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-6">
          {stations.length > 0 && <StationPicker stations={stations} selected={stationName} onSelect={setStationName} />}

          {incident && (
            <Card padding="p-5" hover={false} className="mt-5 flex items-center gap-4 flex-wrap bg-accent-tint border-accent/25">
              <div className="w-9 h-9 rounded-chip bg-white flex items-center justify-center shrink-0">
                <ClipboardList size={16} className="text-accent" strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[10.5px] tracking-[.08em] text-accent uppercase">
                  Simulating for incident {incident.id}
                </div>
                <div className="text-[13.5px] text-ink mt-0.5 truncate">{incident.title}</div>
              </div>
              <SeverityBadge level={incident.severity} />
              <Link
                to={`/incidents/${encodeURIComponent(incident.id)}`}
                className="inline-flex items-center gap-1 text-[12.5px] text-accent hover:underline shrink-0"
              >
                Back to incident <ArrowRight size={12} />
              </Link>
            </Card>
          )}
        </motion.div>

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
          {/* Recommended decision — leads the page, per the "current situation
              -> recommended decision -> next action -> supporting evidence"
              hierarchy every page now follows. Was previously the 7th of 8
              sections here, buried under supporting evidence for a page whose
              entire purpose is "which intervention works best." */}
          <AiPickPanel
            predictedAqi={recPredicted}
            prevented={recPrevented}
            confidence={recConfidence}
            costVsFullPct={costVsFullPct}
            isPending={recommendMutation.isPending}
            onApply={handleApplyRecommended}
            recommendedPolicies={recommendedPolicies}
          />

          {/* Explore alternatives — the interactive sandbox for testing a
              different combination than the AI's pick above */}
          <section className="mt-16">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
              {/* Left — policy cards */}
              <div>
                <SectionHeading eyebrow="EXPLORE ALTERNATIVES" title="Or build your own combination" className="mb-[18px]" />
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
              </div>
            </div>
          </section>

          <ImpactAssessment baselineAqi={baselineAqi} predictedAqi={predictedAqi} aqiReduced={aqiReduced} />

          <HealthImpactEstimates baselineAqi={baselineAqi} predictedAqi={predictedAqi} aqiReduced={aqiReduced} />

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

          <CompareScenarios slots={slots} onSave={handleSaveSlot} currentAqi={baselineAqi} />
        </QueryState>

        <WorkflowNav currentStepId="simulation" />
      </main>
      <Footer
        pageLabel="DECISION SUPPORT"
        note="Sandbox simulation · live agents/simulation_agent.py · no live changes applied"
      />
    </>
  );
}
