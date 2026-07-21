import { useState } from "react";
import { Check } from "lucide-react";
import Card from "../ui/Card";
import SectionHeading from "../ui/SectionHeading";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { useAuth } from "../../lib/auth/useAuth";
import { useUsers, useAssignIncident } from "../../lib/hooks/useApi";
import { officersOnly } from "../../lib/officers";

/** Assignment is Administrator-only, enforced server-side too (backend/routers/incidents.py's /assign uses Depends(require_roles("Administrator"))) — the dropdown+button only render for that role, but that's UX convenience, not the actual security boundary. */
export default function IncidentAssignmentPanel({ incident }) {
  const { hasRole } = useAuth();
  const usersQuery = useUsers();
  const assignMutation = useAssignIncident();
  const [selectedOfficerId, setSelectedOfficerId] = useState("");

  const officers = officersOnly(usersQuery.data?.data ?? []);
  const canAssign = hasRole("Administrator");

  function handleAssign() {
    if (!selectedOfficerId) return;
    assignMutation.mutate(
      { incidentId: incident.id, officer_id: selectedOfficerId },
      { onSuccess: () => setSelectedOfficerId("") }
    );
  }

  return (
    <section>
      <SectionHeading eyebrow="ASSIGNMENT" title="Assigned officer" className="mb-6" />
      <Card padding="p-7" hover={false}>
        {incident.assignment ? (
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="font-mono text-[10px] tracking-[.08em] text-muted-3 uppercase">Officer</div>
              <div className="text-[17px] font-display text-ink mt-1">{incident.assignment.officer_name}</div>
              <div className="flex items-center gap-3 mt-2.5 text-[12.5px] text-muted-3 flex-wrap">
                <span>Assigned {new Date(incident.assignment.assigned_at).toLocaleString()}</span>
                <span>·</span>
                <span>Expected by {new Date(incident.assignment.expected_completion).toLocaleString()}</span>
              </div>
            </div>
            <Badge tone="accent">{incident.assignment.priority} priority</Badge>
          </div>
        ) : (
          <div className="text-[13.5px] text-muted-3">Not yet assigned to an officer.</div>
        )}

        {canAssign && (
          <div className="flex flex-wrap items-center gap-2.5 mt-5 pt-5 border-t border-border-divider">
            <select
              value={selectedOfficerId}
              onChange={(e) => setSelectedOfficerId(e.target.value)}
              className="rounded-[10px] border border-border bg-white px-3 py-2.5 text-[13.5px] text-ink outline-none focus:border-accent cursor-pointer"
            >
              <option value="">{incident.assignment ? "Reassign to…" : "Assign to…"}</option>
              {officers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} · {o.region} · {o.status}
                </option>
              ))}
            </select>
            <Button
              variant="primary"
              size="sm"
              icon={<Check size={13} className="text-panel-accent" />}
              disabled={!selectedOfficerId || assignMutation.isPending}
              onClick={handleAssign}
            >
              {assignMutation.isPending ? "Assigning…" : incident.assignment ? "Reassign Officer" : "Assign Officer"}
            </Button>
          </div>
        )}
      </Card>
    </section>
  );
}
