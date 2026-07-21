import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, AlertTriangle, Gauge, UserCheck, UserPlus, FlaskConical, Sparkles } from "lucide-react";

import LinkButton from "../../components/ui/LinkButton";
import PageHero from "../../components/ui/PageHero";
import DecisionBrief from "../../components/ui/DecisionBrief";
import QueryState from "../../components/ui/QueryState";
import { SkeletonCard } from "../../components/ui/Skeleton";
import SectionHeading from "../../components/ui/SectionHeading";
import Footer from "../../components/layout/Footer";

import IncidentOverview from "../../components/incidents/IncidentOverview";
import IncidentAssignmentPanel from "../../components/incidents/IncidentAssignmentPanel";
import IncidentTimeline from "../../components/incidents/IncidentTimeline";
import IncidentTaskChecklist from "../../components/incidents/IncidentTaskChecklist";
import AIInvestigationPanel from "../../components/incidents/AIInvestigationPanel";
import IncidentRecommendedAction from "../../components/incidents/IncidentRecommendedAction";
import IncidentNotes from "../../components/incidents/IncidentNotes";
import IncidentStatusControl from "../../components/incidents/IncidentStatusControl";
import EvidenceTable from "../../components/attribution/EvidenceTable";
import AttributionBreakdown from "../../components/attribution/AttributionBreakdown";
import ForecastChart from "../../components/forecast/ForecastChart";
import IncidentHealthSummary from "../../components/health/IncidentHealthSummary";
import HealthAdvisoryPanel from "../../components/health/HealthAdvisoryPanel";
import IncidentPredictionReview from "../../components/incidents/IncidentPredictionReview";
import IncidentTraceability from "../../components/incidents/IncidentTraceability";
import WorkflowNav from "../../components/workflow/WorkflowNav";

import {
  useIncident,
  useAttribution,
  useForecast,
  useWeatherCurrent,
  useTasks,
  useStationHealthAdvisory,
  useIncidentValidation,
} from "../../lib/hooks/useApi";
import { fadeUp } from "../../lib/motion";
import { SEVERITY_TONE } from "../../lib/incidents";
import { sourceMeta } from "../../lib/sources";

export default function IncidentDetail() {
  const { id } = useParams();
  const incidentQuery = useIncident(id);
  const attributionQuery = useAttribution();
  const forecastQuery = useForecast();
  const weatherQuery = useWeatherCurrent();
  const tasksQuery = useTasks(id);
  const incident = incidentQuery.data?.data;
  const stationHealthQuery = useStationHealthAdvisory(incident?.station);
  const validationQuery = useIncidentValidation(id);

  const tasks = useMemo(() => tasksQuery.data?.data ?? [], [tasksQuery.data]);

  const station = useMemo(
    () => (attributionQuery.data?.data ?? []).find((s) => s.station === incident?.station) ?? null,
    [attributionQuery.data, incident]
  );
  const forecastEntry = useMemo(
    () => (forecastQuery.data?.data ?? []).find((f) => f.station === incident?.station) ?? null,
    [forecastQuery.data, incident]
  );
  const weather = useMemo(
    () => (weatherQuery.data?.data ?? []).find((w) => w.station_name === incident?.station) ?? null,
    [weatherQuery.data, incident]
  );

  // Only 2 hero KPIs here, not the usual 3-4 — Forecast 24h and Health risk
  // used to be tiles too, but the DecisionBrief right below now states both
  // with more context (forecast direction, affected population, dominant
  // source) than a bare number could, so keeping them as tiles was the
  // same fact shown twice in one screen. AQI now and Assigned officer are
  // the two facts nothing else on this page states as a quick glance.
  const heroKpis = incident
    ? [
        { icon: <Gauge size={12} strokeWidth={2} />, label: "AQI now", value: Math.round(incident.aqi), tone: SEVERITY_TONE[incident.severity] },
        {
          icon: incident.assignment ? <UserCheck size={12} strokeWidth={2} /> : <UserPlus size={12} strokeWidth={2} />,
          label: "Assigned officer",
          value: incident.assignment?.officer_name ?? "Unassigned",
          tone: incident.assignment ? "success" : "warning",
        },
      ]
    : [];

  // Decision brief for this one case — same fixed order as Command
  // Centre's (what changed / why it matters / what to do / why trust it),
  // built entirely from this incident's own stored fields plus the live
  // attribution result for its station; no second computation. Every field
  // here is guarded on `incident` — this runs on every render, including
  // before the fetch resolves or when the URL's incident id doesn't match
  // any real record, and `incident` is undefined in both cases.
  const topAttribution = station?.attribution?.[0] ?? null;
  const dominantSourceLabel = !incident
    ? null
    : topAttribution
      ? sourceMeta(topAttribution.source_type).label
      : incident.dominant_source
        ? incident.dominant_source.replace(/_/g, " ")
        : "an unidentified source";
  const confidenceLabel =
    topAttribution == null ? null : topAttribution.confidence >= 0.6 ? "High" : topAttribution.confidence >= 0.35 ? "Medium" : "Low";
  const evidenceCount = station?.evidence?.length ?? 0;

  const whatChanged = incident
    ? `${incident.station} reached AQI ${Math.round(incident.aqi)} (${incident.severity} severity), attributed primarily to ${dominantSourceLabel}.`
    : null;
  const whyItMatters = !incident
    ? null
    : incident.health
      ? `${incident.health.emergency_level} health risk for ${incident.health.most_affected_group}${
          incident.health.affected_population ? ` — ~${incident.health.affected_population.toLocaleString()} residents modeled at risk` : ""
        }. Forecast ${incident.forecast_aqi != null && incident.forecast_aqi > incident.aqi ? "worsening" : "easing"} to ${
          incident.forecast_aqi != null ? Math.round(incident.forecast_aqi) : "—"
        } within 24h.`
      : "Health impact data not yet available for this station.";

  return (
    <>
      <main className="max-w-content mx-auto px-5 md:px-10 pb-28 flex-1 w-full">
        <motion.div initial="hidden" animate="show" variants={fadeUp} className="pt-10">
          <LinkButton to="/incidents" variant="ghost" size="sm" icon={<ArrowLeft size={14} />}>
            All incidents
          </LinkButton>
        </motion.div>

        <QueryState
          isLoading={incidentQuery.isLoading}
          isError={incidentQuery.isError}
          error={incidentQuery.error}
          onRetry={incidentQuery.refetch}
          loading={
            <div className="mt-6 flex flex-col gap-6">
              <SkeletonCard lines={4} />
              <SkeletonCard lines={6} />
            </div>
          }
        >
          {incident && (
            <>
              <PageHero
                className="pt-4"
                icon={<AlertTriangle size={19} strokeWidth={1.8} />}
                mood="danger"
                liveLabel={`Response Coordination · ${incident.id} · ${incident.status}`}
                title="Case File"
                tagline={`Full investigation record for ${incident.station} — assign, act, and track resolution.`}
                kpis={heroKpis}
                primaryAction={
                  incident.assignment
                    ? { label: "Simulate Impact", to: `/simulate?incident=${encodeURIComponent(incident.id)}`, icon: <FlaskConical size={14} /> }
                    : { label: "Assign Officer", to: "#assignment", icon: <UserPlus size={14} /> }
                }
              />

              <section className="mt-8">
                <IncidentOverview incident={incident} />
              </section>

              <DecisionBrief
                whatChanged={whatChanged}
                whyItMatters={whyItMatters}
                whatToDo={incident.recommended_action}
                whatToDoTo={incident.assignment ? `/simulate?incident=${encodeURIComponent(incident.id)}` : "#assignment"}
                trustLabel={confidenceLabel}
                trustReason={confidenceLabel ? `Based on ${evidenceCount} evidence point${evidenceCount === 1 ? "" : "s"} within 3km.` : "No nearby registry evidence to score."}
                trustTo={`/attribution?station=${encodeURIComponent(incident.station)}`}
              />

              {/* Act now — the three controls that actually change this case, grouped together instead of scattered through the page */}
              <section className="mt-12">
                <SectionHeading eyebrow="TAKE ACTION" title="Move this case forward" className="mb-6" />
                <div className="flex flex-col gap-8">
                  <div id="assignment" className="scroll-mt-24">
                    <IncidentAssignmentPanel incident={incident} />
                  </div>
                  <IncidentRecommendedAction
                    incident={incident}
                    reason={`${dominantSourceLabel} is the dominant attributed source${confidenceLabel ? ` (${confidenceLabel.toLowerCase()} confidence` : " (unscored"}, ${evidenceCount} evidence point${evidenceCount === 1 ? "" : "s"} within 3km) at AQI ${Math.round(incident.aqi)} — ${incident.severity.toLowerCase()} severity.`}
                  />
                  <IncidentStatusControl incident={incident} />
                </div>
              </section>

              <section className="mt-12">
                <IncidentTimeline timeline={incident.timeline} />
              </section>

              <section className="mt-12">
                {tasksQuery.isLoading ? <SkeletonCard lines={4} /> : <IncidentTaskChecklist tasks={tasks} />}
              </section>

              <section className="mt-12 flex flex-col gap-6">
                <IncidentHealthSummary health={incident.health} />
                <details className="group">
                  <summary className="flex items-center gap-2.5 cursor-pointer list-none font-mono text-[11px] tracking-[.08em] text-muted-3 uppercase hover:text-ink transition-colors">
                    <span className="w-5 h-5 rounded-full border border-border flex items-center justify-center text-[10px] group-open:rotate-45 transition-transform">+</span>
                    Full guidance by population group
                  </summary>
                  <div className="mt-6">
                    <HealthAdvisoryPanel advisories={stationHealthQuery.data?.data?.advisories} />
                  </div>
                </details>
              </section>

              <section className="mt-12">
                <IncidentPredictionReview review={validationQuery.data?.data} isLoading={validationQuery.isLoading} />
              </section>

              <section className="mt-12">
                <SectionHeading eyebrow="EVIDENCE & ANALYSIS" title="What drove this case" className="mb-6" />
                <div className="flex flex-col gap-6">
                  <EvidenceTable evidence={station?.evidence} />
                  {station && <AttributionBreakdown station={station} />}
                  {forecastEntry && (
                    <ForecastChart station={forecastEntry} forecast24={forecastEntry.forecast_24h} forecast72={forecastEntry.forecast_72h} />
                  )}
                </div>
              </section>

              <details className="mt-12 group">
                <summary className="flex items-center gap-2.5 cursor-pointer list-none font-mono text-[11px] tracking-[.08em] text-muted-3 uppercase hover:text-ink transition-colors">
                  <span className="w-5 h-5 rounded-full border border-border flex items-center justify-center text-[10px] group-open:rotate-45 transition-transform">+</span>
                  <Sparkles size={12} className="text-accent" /> AI narrative summary
                </summary>
                <div className="mt-6">
                  <AIInvestigationPanel incident={incident} station={station} forecast={forecastEntry} weather={weather} />
                </div>
              </details>

              <section className="mt-12">
                <IncidentNotes incident={incident} />
              </section>

              <section className="mt-16 pt-8 border-t border-border-divider">
                <IncidentTraceability incident={incident} />
              </section>

              <WorkflowNav currentStepId="incident" prevQuery={`?station=${encodeURIComponent(incident.station)}`} />
            </>
          )}
        </QueryState>
      </main>
      <Footer
        pageLabel="CASE FILE"
        note="Live pipeline · agents/incident_agent.py · status changes write to data/incidents.json"
      />
    </>
  );
}
