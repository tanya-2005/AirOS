import { useState } from "react";
import { StickyNote, Send } from "lucide-react";
import Card from "../ui/Card";
import SectionHeading from "../ui/SectionHeading";
import Button from "../ui/Button";
import { useAddIncidentNote } from "../../lib/hooks/useApi";

/** Any authenticated role can add a note (Administrator, Officer, or Analyst annotating the case) — separate from resolution_notes/IncidentStatusControl, which is the one formal field tied to the Resolved status. */
export default function IncidentNotes({ incident }) {
  const [text, setText] = useState("");
  const addNoteMutation = useAddIncidentNote();

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    addNoteMutation.mutate({ incidentId: incident.id, text: text.trim() }, { onSuccess: () => setText("") });
  }

  return (
    <section>
      <SectionHeading eyebrow="INTERNAL NOTES" title="Case notes" className="mb-6" />
      <Card padding="p-7" hover={false} className="flex flex-col gap-5">
        {incident.internal_notes.length === 0 ? (
          <p className="text-[13.5px] text-muted-3">No notes yet — add one below.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {incident.internal_notes.map((n) => (
              <div key={n.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-chip bg-search flex items-center justify-center shrink-0">
                  <StickyNote size={13} className="text-muted-2" strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[12.5px] flex-wrap">
                    <span className="font-medium text-ink">{n.author_name}</span>
                    <span className="text-muted-4 font-mono text-[11px]">{new Date(n.at).toLocaleString()}</span>
                  </div>
                  <p className="text-[13.5px] text-ink mt-1 leading-[1.5]">{n.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2.5 pt-4 border-t border-border-divider">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a note for the case file…"
            className="flex-1 rounded-[10px] border border-border bg-white px-3.5 py-2.5 text-[13.5px] text-ink outline-none focus:border-accent focus:shadow-[0_0_0_4px_rgba(31,122,133,.10)] transition-[border-color,box-shadow] duration-200"
          />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            icon={<Send size={13} />}
            disabled={!text.trim() || addNoteMutation.isPending}
          >
            {addNoteMutation.isPending ? "Adding…" : "Add Note"}
          </Button>
        </form>
      </Card>
    </section>
  );
}
