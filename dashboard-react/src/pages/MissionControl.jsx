import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Map as MapIcon, Presentation, Activity, ShieldAlert, Compass, Database } from "lucide-react";

import SectionHeading from "../components/ui/SectionHeading";
import PageHero from "../components/ui/PageHero";
import QueryState from "../components/ui/QueryState";
import DataSourceBadge from "../components/ui/DataSourceBadge";
import Button from "../components/ui/Button";
import EmergencyLevelBadge from "../components/health/EmergencyLevelBadge";
import { SkeletonCard } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import Footer from "../components/layout/Footer";

import ExecutiveSummary from "../components/report/ExecutiveSummary";
import MissionStatusGrid from "../components/mission/MissionStatusGrid";
import MissionBriefingExtras from "../components/mission/MissionBriefingExtras";
import DecisionBrief from "../components/ui/DecisionBrief";
import IncidentQueue from "../components/mission/IncidentQueue";
import ActionCenter from "../components/mission/ActionCenter";
import MissionSystemStatus from "../components/mission/MissionSystemStatus";
import LiveOperationTimeline from "../components/workflow/LiveOperationTimeline";
import WorkflowNav from "../components/workflow/WorkflowNav";

import {
  useAttribution,
  useForecast,
  useEnforcement,
  useIncidents,
  useCityHealthAdvisory,
  useUsers,
  useSystemHealth,
  useNotifications,
  useCityHistory,
  useModelReliability,
} from "../lib/hooks/useApi";
import { useCity } from "../lib/city/useCity";
import { usePresentationMode } from "../lib/presentation/usePresentationMode";
import { citySummary } from "../lib/report";
import { topPollutionDriver } from "../lib/decision";
import { activeIncidents, buildOperationTimeline, formatRelativeTime } from "../lib/incidents";
import { officersOnly } from "../lib/officers";
import { unreadCount } from "../lib/notifications";
import { categoryFor } from "../lib/aqi";
import { WORKFLOW_STEPS } from "../lib/workflow";

export default function MissionControl() {
  const { city, cityMeta } = useCity();
  const navigate = useNavigate();
  const { setActive, setCurrentStepId } = usePresentationMode();

  const attributionQuery = useAttribution();
  const forecastQuery = useForecast();
  const enforcementQuery = useEnforcement();
  const incidentsQuery = useIncidents();
  const cityHealthQuery = useCityHealthAdvisory();
  const usersQuery = useUsers();
  const systemHealthQuery = useSystemHealth();
  const notificationsQuery = useNotifications();
  const cityHistoryQuery = useCityHistory(24);
  const reliabilityQuery = useModelReliability();

  const stations = useMemo(() => {
    const raw = attributionQuery.data?.data ?? [];
    return [...raw].sort((a, b) => b.aqi - a.aqi);
  }, [attributionQuery.data]);
  const forecasts = useMemo(() => forecastQuery.data?.data ?? [], [forecastQuery.data]);
  const enforcement = useMemo(() => enforcementQuery.data?.data ?? [], [enforcementQuery.data]);
  const incidents = useMemo(() => incidentsQuery.data?.data ?? [], [incidentsQuery.data]);
  const cityHealth = cityHealthQuery.data?.data;
  const users = useMemo(() => usersQuery.data?.data ?? [], [usersQuery.data]);
  const officers = useMemo(() => officersOnly(users), [users]);
  const unread = unreadCount(notificationsQuery.data?.data ?? []);

  const summary = useMemo(() => citySummary(stations, forecasts, enforcement), [stations, forecasts, enforcement]);
  const driver = useMemo(() => topPollutionDriver(stations), [stations]);

  const active = useMemo(() => activeIncidents(incidents), [incidents]);
  const topIncident = active[0] ?? null;

  const officersAssignedCount = useMemo(
    () => new Set(active.filter((i) => i.assignment).map((i) => i.assignment.officer_id)).size,
    [active]
  );

  const worstStationForecast = summary ? forecasts.find((f) => f.station === summary.worst.station) : null;
  const severeStation = useMemo(() => {
    const candidate = worstStationForecast;
    if (!candidate) return null;
    const predictedCat = categoryFor(candidate.forecast_24h.predicted_aqi).label;
    const worsening = candidate.forecast_24h.predicted_aqi > candidate.current_aqi;
    return worsening && ["Poor", "Very Poor", "Severe"].includes(predictedCat) ? candidate : null;
  }, [worstStationForecast]);

  const timelineIncidentStation = topIncident
    ? stations.find((s) => s.station === topIncident.station) ?? null
    : null;
  const timelineSteps = useMemo(
    () => buildOperationTimeline(topIncident, timelineIncidentStation),
    [topIncident, timelineIncidentStation]
  );

  const currentCityHealthRow = (systemHealthQuery.data?.data ?? []).find((r) => r.city === city);

  const majorIncidents = active.slice(0, 4);
  const publicHealthStatus = topIncident?.health?.health_impact_summary
    ? topIncident.health.health_impact_summary
    : cityHealth
      ? `AQI at ${cityHealth.worst_station} is ${Math.round(cityHealth.worst_station_aqi)} (${cityHealth.emergency_level} health risk). ${cityHealth.most_affected_group} face the highest risk at this level.`
      : "No health data available yet for this city.";
  const governmentActions = topIncident?.health?.recommended_government_response
    ? topIncident.health.recommended_government_response
    : "No active incident currently requires a government response.";

  const forecastSummary = summary
    ? {
        headline:
          summary.direction === "worsen"
            ? `Expected to worsen (${summary.forecastDelta > 0 ? "+" : ""}${summary.forecastDelta} AQI, 24h)`
            : summary.direction === "improve"
              ? `Expected to ease (${summary.forecastDelta} AQI, 24h)`
              : "Expected to hold steady (24h)",
        detail: `City average currently ${summary.avgAqi} AQI (${summary.avgCategory.label}).`,
      }
    : null;

  const recommendedAction = topIncident?.recommended_action ?? enforcement[0]?.action ?? null;

  // Decision brief — the one synthesized recommendation the hero leads
  // with, in the fixed order every page now follows: what changed, why it
  // matters, what to do, why trust it. Every clause below quotes a field
  // already computed above or fetched by this page; nothing new is
  // calculated here beyond string assembly.
  const historySeries = cityHistoryQuery.data?.data ?? [];
  const aqiTrend =
    historySeries.length >= 2
      ? Math.round((historySeries[historySeries.length - 1].avg_aqi - historySeries[historySeries.length - 2].avg_aqi) * 10) / 10
      : null;

  const whatChanged = topIncident
    ? `${topIncident.station} opened as a new incident ${formatRelativeTime(topIncident.created_at)} — AQI ${Math.round(topIncident.aqi)}, ${topIncident.severity} severity.`
    : summary
      ? `City average AQI is ${summary.avgAqi} (${summary.avgCategory.label})${
          aqiTrend != null ? `, ${aqiTrend > 0 ? "up" : aqiTrend < 0 ? "down" : "flat"} ${Math.abs(aqiTrend)} pts since the last sync` : ""
        }.`
      : null;

  const whyItMatters = cityHealth
    ? `${cityHealth.emergency_level} health risk for ${cityHealth.most_affected_group}${
        topIncident?.health?.affected_population ? ` — ~${topIncident.health.affected_population.toLocaleString()} residents modeled at risk` : ""
      }. Forecast ${summary?.direction === "worsen" ? "expected to worsen" : summary?.direction === "improve" ? "expected to ease" : "expected to hold steady"} over the next 24h.`
    : "No health data available yet for this city.";

  const decisionCta = topIncident
    ? `/incidents/${encodeURIComponent(topIncident.id)}`
    : severeStation
      ? `/forecast?station=${encodeURIComponent(severeStation.station)}`
      : null;

  const reliability = reliabilityQuery.data?.data;

  const isEmpty = attributionQuery.data?.data_source === "empty";

  function startPresentation() {
    setCurrentStepId(WORKFLOW_STEPS[0].id);
    setActive(true);
    navigate(WORKFLOW_STEPS[0].path);
  }

  // Only 2 hero KPIs — Highest Priority Incident and Recommended Action
  // used to be tiles too, but the DecisionBrief right below now states
  // both with full context (when it opened, why it matters, where to act)
  // rather than a bare label, so the tiles were repeating what the very
  // next thing on screen already said. Operational status and Emergency
  // level are genuinely orthogonal city-wide glance numbers DecisionBrief
  // doesn't restate the same way (it talks about the ONE incident that
  // matters most, not the city average).
  const heroKpis = [
    {
      icon: <Activity size={12} strokeWidth={2} />,
      label: "Operational status",
      value: summary?.avgCategory?.label ?? "—",
      sub: summary ? `${summary.avgAqi} AQI avg` : undefined,
      color: summary?.avgCategory?.color,
    },
    {
      icon: <ShieldAlert size={12} strokeWidth={2} />,
      label: "Emergency level",
      value: cityHealth?.emergency_level ? <EmergencyLevelBadge level={cityHealth.emergency_level} /> : "—",
    },
  ];

  return (
    <>
      <main className="max-w-content mx-auto px-5 md:px-10 pb-28 flex-1 w-full">
        <PageHero
          icon={<Compass size={19} strokeWidth={1.8} />}
          mood="ink"
          liveLabel={`Command Centre · ${cityMeta.label} · operational overview`}
          title="Command Centre"
          tagline={`The current operational state of ${cityMeta.label} — aggregated from live attribution, forecast, incident, and health data, nothing recomputed here.`}
          kpis={heroKpis}
          primaryAction={
            topIncident
              ? { label: "Investigate Incident", to: `/incidents/${encodeURIComponent(topIncident.id)}`, icon: <Search size={14} /> }
              : { label: "Open Map", to: "/map", icon: <MapIcon size={14} /> }
          }
          secondarySlot={
            <Button variant="ghost" size="md" icon={<Presentation size={14} />} onClick={startPresentation}>
              Present
            </Button>
          }
          extra={attributionQuery.data && <DataSourceBadge source={attributionQuery.data.data_source} updatedAt={attributionQuery.dataUpdatedAt} />}
        />

        <DecisionBrief
          whatChanged={whatChanged}
          whyItMatters={whyItMatters}
          whatToDo={recommendedAction ?? "No action currently queued — conditions are within normal range."}
          whatToDoTo={decisionCta}
          trustLabel={reliability?.label}
          trustReason={reliability?.reasons?.[0]}
        />

        <QueryState
          isLoading={attributionQuery.isLoading}
          isError={attributionQuery.isError}
          error={attributionQuery.error}
          onRetry={attributionQuery.refetch}
          isEmpty={isEmpty}
          loading={
            <div className="mt-10 flex flex-col gap-6">
              <SkeletonCard lines={2} />
              <SkeletonCard lines={6} />
            </div>
          }
          empty={
            <EmptyState
              icon={<Database size={18} strokeWidth={1.8} />}
              tone="warning"
              title={`No station data yet for ${cityMeta.label}`}
              description="Run ingestion and the agent pipeline to populate Command Centre, or switch to another city with the selector in the nav."
            />
          }
        >
          <section className="mt-12">
            <SectionHeading eyebrow="WORK QUEUE" title="What needs attention, ranked" className="mb-6" />
            <IncidentQueue incidents={active} />
          </section>

          <section className="mt-14">
            <SectionHeading eyebrow="QUICK ACTIONS" title="Other things you can do" className="mb-6" />
            <ActionCenter topIncident={topIncident} severeStation={severeStation} worstStation={summary?.worst?.station} />
          </section>

          <section className="mt-14">
            <LiveOperationTimeline incident={topIncident} steps={timelineSteps} />
          </section>

          <details className="mt-14 group">
            <summary className="flex items-center gap-2.5 cursor-pointer list-none font-mono text-[11px] tracking-[.08em] text-muted-3 uppercase hover:text-ink transition-colors">
              <span className="w-5 h-5 rounded-full border border-border flex items-center justify-center text-[10px] group-open:rotate-45 transition-transform">+</span>
              Supporting metrics &amp; executive briefing for senior officials
            </summary>
            <div className="mt-6 flex flex-col gap-8">
              <MissionStatusGrid
                officersAssignedCount={officersAssignedCount}
                citizensAtRisk={topIncident?.health?.affected_population ?? null}
                citizensAtRiskNote={topIncident?.health?.affected_population_note ?? "No active incident to model against."}
                topSource={driver}
                forecastSummary={forecastSummary}
              />
              <ExecutiveSummary summary={summary} />
              <MissionBriefingExtras
                majorIncidents={majorIncidents}
                publicHealthStatus={publicHealthStatus}
                governmentActions={governmentActions}
                resourceStatus={{
                  total: officers.length,
                  assigned: officersAssignedCount,
                  byStatus: officers.reduce((acc, o) => {
                    acc[o.status] = (acc[o.status] || 0) + 1;
                    return acc;
                  }, {}),
                }}
              />
              <MissionSystemStatus cityHealthRow={currentCityHealthRow} unread={unread} isLoading={systemHealthQuery.isLoading} />
            </div>
          </details>
        </QueryState>

        <WorkflowNav currentStepId="mission-control" />
      </main>
      <Footer
        pageLabel="COMMAND CENTRE"
        note="Aggregated from existing live pipeline output · no duplicated calculations"
      />
    </>
  );
}
