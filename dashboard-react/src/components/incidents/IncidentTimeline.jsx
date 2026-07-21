import { AlertTriangle, Sparkles, Clock, Radar, UserCheck, CheckCircle2, PlayCircle, CircleDot } from "lucide-react";
import Card from "../ui/Card";
import SectionHeading from "../ui/SectionHeading";
import Timeline from "../ui/Timeline";
import { formatRelativeTime, timelineEventTone } from "../../lib/incidents";

// Icon per event name — same fixed vocabulary timelineEventTone() colors
// (see agents/incident_agent.py for where each one is appended), so an
// officer can tell a status change from an automated system step at a
// glance instead of reading every label to find out.
const EVENT_ICON = {
  "Incident Created": AlertTriangle,
  "AI Investigation Generated": Sparkles,
  "Inspection Pending": Clock,
  "Forecast Updated": Radar,
  "Assigned to Officer": UserCheck,
  "Task Completed": CheckCircle2,
  Resolved: CheckCircle2,
  "In Progress": PlayCircle,
};

/** Reuses the same generic stepper Command Center's ExplainabilityTimeline and Scenario Lab's EvidenceGraph already share (components/ui/Timeline.jsx) instead of a third hand-rolled version — the only Case File-specific addition is the per-event icon/tone below. */
export default function IncidentTimeline({ timeline }) {
  const stages = timeline.map((t, i) => {
    const Icon = EVENT_ICON[t.event] || CircleDot;
    return {
      key: `${t.event}-${i}`,
      label: `${t.event} · ${formatRelativeTime(t.at)}`,
      value: t.detail || t.event,
      tone: timelineEventTone(t.event),
      icon: <Icon size={13} strokeWidth={2} />,
    };
  });

  return (
    <Card padding="p-7" hover={false}>
      <SectionHeading eyebrow="TIMELINE" title="Case history" className="mb-6" />
      <Timeline stages={stages} />
    </Card>
  );
}
