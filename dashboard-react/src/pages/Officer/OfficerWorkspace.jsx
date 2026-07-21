import { useMemo } from "react";
import { motion } from "framer-motion";
import { Briefcase, CheckCircle2, Timer, Target, Search, Inbox } from "lucide-react";

import SectionHeading from "../../components/ui/SectionHeading";
import PageHero from "../../components/ui/PageHero";
import QueryState from "../../components/ui/QueryState";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonCard } from "../../components/ui/Skeleton";
import Footer from "../../components/layout/Footer";

import IncidentCard from "../../components/incidents/IncidentCard";
import TaskList from "../../components/officer/TaskList";
import WorkflowNav from "../../components/workflow/WorkflowNav";

import { useIncidents, useTasks } from "../../lib/hooks/useApi";
import { useAuth } from "../../lib/auth/useAuth";
import { fadeUp, staggerContainer } from "../../lib/motion";
import { pendingTasks, completedTasks, upcomingTasks, avgResolutionHours, onTimeRate } from "../../lib/tasks";
import { activeIncidents } from "../../lib/incidents";

export default function OfficerWorkspace() {
  const { user } = useAuth();
  const incidentsQuery = useIncidents();
  const tasksQuery = useTasks();

  const incidents = useMemo(() => incidentsQuery.data?.data ?? [], [incidentsQuery.data]);
  const tasks = useMemo(() => tasksQuery.data?.data ?? [], [tasksQuery.data]);

  const myIncidents = useMemo(
    () => incidents.filter((i) => i.assignment?.officer_id === user?.id),
    [incidents, user]
  );
  const myTasks = useMemo(() => tasks.filter((t) => t.assigned_officer_id === user?.id), [tasks, user]);

  const myPending = useMemo(() => pendingTasks(myTasks), [myTasks]);
  const myCompleted = useMemo(
    () => completedTasks(myTasks).sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at)).slice(0, 8),
    [myTasks]
  );
  const myUpcoming = useMemo(() => upcomingTasks(myTasks, 48), [myTasks]);

  const isLoading = incidentsQuery.isLoading || tasksQuery.isLoading;
  const isError = incidentsQuery.isError || tasksQuery.isError;

  const avgHours = useMemo(() => avgResolutionHours(myIncidents), [myIncidents]);
  const onTime = useMemo(() => onTimeRate(myTasks), [myTasks]);
  const topMyIncident = useMemo(() => activeIncidents(myIncidents)[0] ?? null, [myIncidents]);
  const heroKpis = [
    { icon: <Briefcase size={12} strokeWidth={2} />, label: "Incidents assigned", value: myIncidents.length },
    { icon: <CheckCircle2 size={12} strokeWidth={2} />, label: "Resolved", value: myIncidents.filter((i) => i.status === "Resolved").length, tone: "success" },
    { icon: <Timer size={12} strokeWidth={2} />, label: "Avg. resolution time", value: avgHours != null ? `${avgHours}h` : "No data yet" },
    { icon: <Target size={12} strokeWidth={2} />, label: "Tasks on time", value: onTime != null ? onTime : "—", suffix: onTime != null ? "%" : "", tone: onTime != null && onTime < 70 ? "warning" : "success" },
  ];

  return (
    <>
      <main className="max-w-content mx-auto px-5 md:px-10 pb-28 flex-1 w-full">
        <PageHero
          icon={<Briefcase size={19} strokeWidth={1.8} />}
          mood="ink"
          liveLabel={`Officer workspace${user?.region ? ` · ${user.region}` : ""}`}
          title="My Workspace"
          tagline={`Everything assigned to ${user?.name?.split(" ")[0] ?? "you"} — incidents, checklist tasks, and how you're tracking against inspection SLAs.`}
          kpis={heroKpis}
          primaryAction={
            topMyIncident
              ? { label: "Open Highest Priority Case", to: `/incidents/${encodeURIComponent(topMyIncident.id)}`, icon: <Search size={14} /> }
              : undefined
          }
        />

        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={incidentsQuery.error || tasksQuery.error}
          onRetry={() => {
            incidentsQuery.refetch();
            tasksQuery.refetch();
          }}
          loading={
            <div className="mt-10 flex flex-col gap-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} lines={1} />
                ))}
              </div>
              <SkeletonCard lines={4} />
            </div>
          }
        >
          <section className="mt-10">
            <SectionHeading eyebrow="ASSIGNED" title="Assigned incidents" className="mb-[18px]" />
            {myIncidents.length > 0 ? (
              <motion.div
                initial="hidden"
                animate="show"
                variants={staggerContainer}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {myIncidents.map((incident) => (
                  <motion.div key={incident.id} variants={fadeUp}>
                    <IncidentCard incident={incident} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <EmptyState
                icon={<Inbox size={18} strokeWidth={1.8} />}
                tone="muted"
                title="Nothing assigned yet"
                description="An administrator assigns incidents from the Incident Detail page — they'll appear here the moment that happens."
                action={{ label: "View all active incidents", to: "/incidents" }}
              />
            )}
          </section>

          <section className="mt-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <SectionHeading eyebrow="TASKS" title="Pending tasks" className="mb-[18px]" />
                <TaskList tasks={myPending} emptyLabel="No pending tasks — you're caught up." showDue />
              </div>
              <div>
                <SectionHeading eyebrow="UPCOMING" title="Upcoming inspections (48h)" className="mb-[18px]" />
                <TaskList tasks={myUpcoming} emptyLabel="Nothing due in the next 48 hours." showDue />
              </div>
            </div>
          </section>

          <section className="mt-12">
            <SectionHeading eyebrow="COMPLETED" title="Recently completed" className="mb-[18px]" />
            <TaskList tasks={myCompleted} emptyLabel="No completed tasks yet." showCompleted />
          </section>
        </QueryState>

        <WorkflowNav currentStepId="officer" />
      </main>
      <Footer pageLabel="MY WORKSPACE" note="Live pipeline · assigned incidents and tasks for the signed-in officer" />
    </>
  );
}
