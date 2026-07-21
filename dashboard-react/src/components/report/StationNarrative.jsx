import { memo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import Card from "../ui/Card";
import { categoryFor } from "../../lib/aqi";
import { stationNarrative } from "../../lib/report";
import { taskProgress } from "../../lib/tasks";
import { fadeUp } from "../../lib/motion";

function resolutionSummary(incident) {
  if (incident.status !== "Resolved") return null;
  const resolvedEvent = incident.timeline.find((t) => t.event === "Resolved");
  if (!resolvedEvent) return null;
  const hours = Math.round(((new Date(resolvedEvent.at) - new Date(incident.created_at)) / 3600000) * 10) / 10;
  return `Resolved ${new Date(resolvedEvent.at).toLocaleDateString()} — ${hours}h from open to close`;
}

function StationNarrative({ station, forecast, enforcementForStation, incident, incidentTasks = [] }) {
  const cat = categoryFor(station.aqi);
  const text = stationNarrative(station, forecast, enforcementForStation);
  const progress = incident ? taskProgress(incidentTasks) : null;
  const resolution = incident ? resolutionSummary(incident) : null;

  return (
    <motion.div variants={fadeUp}>
      <Card padding="p-7" hover>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-[21px] text-ink">{station.station}</h3>
          </div>
          <span
            className="text-[12px] font-medium px-2.5 py-1 rounded-[7px] shrink-0"
            style={{ background: cat.bg, color: cat.color }}
          >
            {Math.round(station.aqi)} · {cat.label}
          </span>
        </div>
        <p className="text-[14.5px] leading-[1.6] text-muted-1 mt-3.5">{text}</p>

        {incident && (
          <div className="mt-3.5 pt-3.5 border-t border-border-divider flex flex-col gap-1.5 text-[12px] text-muted-3">
            <Link
              to={`/incidents/${encodeURIComponent(incident.id)}`}
              className="print:hidden inline-flex items-center gap-1.5 font-mono text-accent hover:underline w-fit"
            >
              <ClipboardList size={11} /> Incident {incident.id} ({incident.status})
            </Link>
            <div className="hidden print:block font-mono">
              Incident: {incident.id} ({incident.status})
            </div>
            <div className="font-mono">
              Assigned officer: {incident.assignment ? incident.assignment.officer_name : "unassigned"}
            </div>
            {progress && progress.total > 0 && (
              <div className="font-mono">
                Tasks: {progress.completed}/{progress.total} complete ({progress.pct}%)
              </div>
            )}
            {resolution && <div className="font-mono">{resolution}</div>}
          </div>
        )}
      </Card>
    </motion.div>
  );
}

export default memo(StationNarrative);
