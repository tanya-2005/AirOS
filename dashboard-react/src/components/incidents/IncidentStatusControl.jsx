import { useState } from "react";
import { Check } from "lucide-react";
import Card from "../ui/Card";
import SectionHeading from "../ui/SectionHeading";
import Button from "../ui/Button";
import { INCIDENT_STATUSES } from "../../lib/incidents";
import { useUpdateIncident } from "../../lib/hooks/useApi";

/** Status transitions + resolution notes — the one part of the Incident Detail page that writes, via PATCH /api/incidents/{id} (see backend/routers/incidents.py). Notes save independently of status so an operator can jot progress before the case is actually Resolved. */
export default function IncidentStatusControl({ incident }) {
  const [notes, setNotes] = useState(incident.resolution_notes ?? "");
  const updateMutation = useUpdateIncident();
  const notesChanged = notes !== (incident.resolution_notes ?? "");

  function setStatus(status) {
    if (status === incident.status) return;
    updateMutation.mutate({ incidentId: incident.id, status });
  }

  function saveNotes() {
    updateMutation.mutate({ incidentId: incident.id, resolution_notes: notes });
  }

  return (
    <section>
      <SectionHeading eyebrow="RESOLUTION" title="Status & resolution notes" className="mb-6" />
      <Card padding="p-7" hover={false} className="flex flex-col gap-5">
        <div>
          <div className="font-mono text-[10.5px] tracking-[.08em] text-muted-3 uppercase mb-2.5">Case status</div>
          <div className="flex flex-wrap gap-2">
            {INCIDENT_STATUSES.map((s) => {
              const active = incident.status === s;
              return (
                <Button
                  key={s}
                  variant={active ? "primary" : "ghost"}
                  size="sm"
                  disabled={active || updateMutation.isPending}
                  aria-pressed={active}
                  icon={active ? <Check size={13} className="text-panel-accent" /> : undefined}
                  onClick={() => setStatus(s)}
                >
                  {s}
                </Button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="font-mono text-[10.5px] tracking-[.08em] text-muted-3 uppercase" htmlFor="resolution-notes">
            Resolution notes
          </label>
          <textarea
            id="resolution-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Record what the field team found and what action was taken…"
            rows={4}
            className="w-full mt-2.5 rounded-[12px] border border-border bg-white px-3.5 py-3 text-[13.5px] text-ink outline-none focus:border-accent focus:shadow-[0_0_0_4px_rgba(31,122,133,.10)] transition-[border-color,box-shadow] duration-200 resize-none placeholder:text-muted-4"
          />
          <div className="flex justify-end mt-2.5">
            <Button variant="ghost" size="sm" onClick={saveNotes} disabled={updateMutation.isPending || !notesChanged}>
              {updateMutation.isPending ? "Saving…" : "Save notes"}
            </Button>
          </div>
        </div>
      </Card>
    </section>
  );
}
