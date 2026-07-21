import SectionHeading from "../ui/SectionHeading";
import ConfidenceBar from "../ui/ConfidenceBar";
import TaskList from "../officer/TaskList";
import { taskProgress } from "../../lib/tasks";

/** Reuses ConfidenceBar (already the app's one "animated 0-1 progress fill" primitive, see Command Center/Attribution) for Inspection Progress instead of a bespoke bar, and officer/TaskList for the checklist itself instead of a second task-row renderer. */
export default function IncidentTaskChecklist({ tasks }) {
  const progress = taskProgress(tasks);

  return (
    <section>
      <SectionHeading eyebrow="TASK CHECKLIST" title="Inspection progress" className="mb-5" />
      <div className="mb-6">
        <ConfidenceBar
          label="Checklist complete"
          value={progress.total ? progress.completed / progress.total : 0}
          tone="accent"
          sublabel={`${progress.completed}/${progress.total} tasks`}
        />
      </div>
      <TaskList tasks={tasks} emptyLabel="No tasks generated for this incident yet." showDue />
    </section>
  );
}
