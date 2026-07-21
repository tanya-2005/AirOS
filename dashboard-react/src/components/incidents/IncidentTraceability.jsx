import { Link } from "react-router-dom";
import { Radar, Microscope, HeartPulse, HardHat, FlaskConical, FileText, ShieldCheck, ArrowUpRight } from "lucide-react";
import Card from "../ui/Card";
import SectionHeading from "../ui/SectionHeading";

function TraceLink({ icon, label, to, available = true, unavailableNote }) {
  if (!available) {
    return (
      <div className="flex items-center gap-3 px-4 py-3.5 rounded-[12px] bg-search/50 opacity-50">
        <div className="w-8 h-8 rounded-chip bg-white flex items-center justify-center shrink-0 border border-border">{icon}</div>
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-muted-2">{label}</div>
          <div className="text-[11px] text-muted-3 truncate">{unavailableNote}</div>
        </div>
      </div>
    );
  }
  return (
    <Link to={to} className="group flex items-center gap-3 px-4 py-3.5 rounded-[12px] bg-search/50 hover:bg-search transition-colors duration-150">
      <div className="w-8 h-8 rounded-chip bg-white flex items-center justify-center shrink-0 border border-border">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-ink group-hover:text-accent transition-colors">{label}</div>
      </div>
      <ArrowUpRight size={13} className="text-muted-3 group-hover:text-accent transition-colors shrink-0" />
    </Link>
  );
}

/**
 * End-to-End Traceability — every incident links out to the Forecast that
 * triggered it, its Attribution result, Health Advisory, assigned Officer,
 * a Simulation, the Report, and AI Validation, so the full decision chain
 * is auditable from one incident record. Pure navigation — no new data,
 * every link target is an existing page/route.
 */
export default function IncidentTraceability({ incident }) {
  if (!incident) return null;
  const q = `?station=${encodeURIComponent(incident.station)}`;

  return (
    <section>
      <SectionHeading eyebrow="AUDIT TRAIL" title="Full decision chain" description="Every module that touched this incident, one click away." className="mb-6" />
      <Card padding="p-5" hover={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TraceLink icon={<Radar size={15} className="text-warning" strokeWidth={1.8} />} label="Forecast that triggered it" to={`/forecast${q}`} />
          <TraceLink icon={<Microscope size={15} className="text-accent" strokeWidth={1.8} />} label="Attribution result" to={`/attribution${q}`} />
          <TraceLink icon={<HeartPulse size={15} className="text-danger" strokeWidth={1.8} />} label="Health advisory" to={`/advisory${q}`} />
          <TraceLink
            icon={<HardHat size={15} className="text-accent" strokeWidth={1.8} />}
            label={incident.assignment ? `Assigned officer — ${incident.assignment.officer_name}` : "Assigned officer"}
            to="/officer"
            available={!!incident.assignment}
            unavailableNote="Not yet assigned"
          />
          <TraceLink icon={<FlaskConical size={15} className="text-success" strokeWidth={1.8} />} label="Simulation" to={`/simulate?incident=${encodeURIComponent(incident.id)}`} />
          <TraceLink icon={<FileText size={15} className="text-ink" strokeWidth={1.8} />} label="Generated report" to="/report" />
          <TraceLink icon={<ShieldCheck size={15} className="text-accent" strokeWidth={1.8} />} label="Trust & Reliability" to={`/validation?station=${encodeURIComponent(incident.station)}`} />
        </div>
      </Card>
    </section>
  );
}
