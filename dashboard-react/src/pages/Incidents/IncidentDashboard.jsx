import { useMemo } from "react";
import { motion } from "framer-motion";
import { Search, ClipboardList, AlertOctagon, Clock, ArrowRight, CheckCircle2 } from "lucide-react";

import SectionHeading from "../../components/ui/SectionHeading";
import PageHero from "../../components/ui/PageHero";
import QueryState from "../../components/ui/QueryState";
import DataSourceBadge from "../../components/ui/DataSourceBadge";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonCard } from "../../components/ui/Skeleton";
import Footer from "../../components/layout/Footer";

import IncidentCard from "../../components/incidents/IncidentCard";
import WorkflowNav from "../../components/workflow/WorkflowNav";

import { useIncidents } from "../../lib/hooks/useApi";
import { fadeUp, staggerContainer } from "../../lib/motion";
import { activeIncidents, criticalIncidents, recentlyResolved, averageResponseHours, SEVERITY_TONE } from "../../lib/incidents";

function IncidentGrid({ incidents }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={staggerContainer}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {incidents.map((incident) => (
        <motion.div key={incident.id} variants={fadeUp}>
          <IncidentCard incident={incident} />
        </motion.div>
      ))}
    </motion.div>
  );
}

export default function IncidentDashboard() {
  const incidentsQuery = useIncidents();
  const incidents = useMemo(() => incidentsQuery.data?.data ?? [], [incidentsQuery.data]);

  const active = useMemo(() => activeIncidents(incidents), [incidents]);
  const critical = useMemo(() => criticalIncidents(incidents), [incidents]);
  const resolved = useMemo(() => recentlyResolved(incidents), [incidents]);
  const isEmpty = incidents.length === 0;

  const topActive = active[0] ?? null;
  const highestSeverity = topActive?.severity ?? null;
  const avgResponseHours = useMemo(() => averageResponseHours(incidents), [incidents]);

  const heroKpis = [
    { icon: <ClipboardList size={12} strokeWidth={2} />, label: "Active incidents", value: active.length },
    {
      icon: <AlertOctagon size={12} strokeWidth={2} />,
      label: "Highest severity",
      value: highestSeverity ?? "None active",
      tone: highestSeverity ? SEVERITY_TONE[highestSeverity] : "success",
    },
    {
      icon: <Clock size={12} strokeWidth={2} />,
      label: "Avg. response time",
      value: avgResponseHours != null ? `${avgResponseHours}h` : "No data yet",
    },
    {
      icon: <ArrowRight size={12} strokeWidth={2} />,
      label: "Next officer action",
      value: topActive?.recommended_action ?? "Nothing queued",
    },
  ];

  return (
    <>
      <main className="max-w-content mx-auto px-5 md:px-10 pb-28 flex-1 w-full">
        <PageHero
          icon={<ClipboardList size={19} strokeWidth={1.8} />}
          mood="danger"
          liveLabel="Response Coordination · operational, not read-only"
          title="Response Coordination"
          tagline="Cases open automatically when AQI crosses an operational threshold — assign, investigate, and resolve them here."
          kpis={heroKpis}
          primaryAction={topActive ? { label: "Investigate Top Incident", to: `/incidents/${encodeURIComponent(topActive.id)}`, icon: <Search size={14} /> } : undefined}
          extra={incidentsQuery.data && <DataSourceBadge source={incidentsQuery.data.data_source} updatedAt={incidentsQuery.dataUpdatedAt} />}
        />

        <QueryState
          isLoading={incidentsQuery.isLoading}
          isError={incidentsQuery.isError}
          error={incidentsQuery.error}
          onRetry={incidentsQuery.refetch}
          isEmpty={isEmpty}
          loading={
            <div className="mt-10 flex flex-col gap-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} lines={1} />
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={i} lines={4} />
                ))}
              </div>
            </div>
          }
          empty={
            <EmptyState
              icon={<CheckCircle2 size={18} strokeWidth={1.8} />}
              tone="success"
              title="No incidents open right now"
              description="Every tracked station is below the operational AQI threshold and the enforcement agent hasn't flagged a high-priority hotspot — nothing to work here yet. Incidents open automatically as conditions change."
            />
          }
        >
          <section className="mt-10">
            <SectionHeading eyebrow="ACTIVE" title="Active incidents" className="mb-[18px]" />
            {active.length > 0 ? (
              <IncidentGrid incidents={active} />
            ) : (
              <p className="text-[14px] text-muted-3">No active incidents — every open case has been resolved.</p>
            )}
          </section>

          {critical.length > 0 && (
            <section className="mt-12">
              <SectionHeading eyebrow="CRITICAL" title="Critical incidents" className="mb-[18px]" />
              <IncidentGrid incidents={critical} />
            </section>
          )}

          <section className="mt-12">
            <SectionHeading eyebrow="RESOLVED" title="Recently resolved" className="mb-[18px]" />
            {resolved.length > 0 ? (
              <IncidentGrid incidents={resolved} />
            ) : (
              <p className="text-[14px] text-muted-3">No incidents have been resolved yet.</p>
            )}
          </section>
        </QueryState>

        <WorkflowNav currentStepId="incident" />
      </main>
      <Footer
        pageLabel="RESPONSE COORDINATION"
        note="Live pipeline · agents/incident_agent.py · opens on AQI threshold or high-priority enforcement flag"
      />
    </>
  );
}
