import { memo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Clock, CheckCircle2 } from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import { TASK_STATUS_TONE, isOverdue } from "../../lib/tasks";
import { useUpdateTask } from "../../lib/hooks/useApi";
import { staggerContainer, fadeUp } from "../../lib/motion";

const TaskRow = memo(function TaskRow({ task, showDue, showCompleted, last }) {
  const updateMutation = useUpdateTask();
  const overdue = isOverdue(task);
  const done = task.status === "Completed";

  return (
    <motion.div
      variants={fadeUp}
      className={`flex items-start gap-3.5 px-5 py-4 ${!last ? "border-b border-border-divider" : ""}`}
    >
      <button
        onClick={() => updateMutation.mutate({ taskId: task.id, status: done ? "Pending" : "Completed" })}
        aria-label={done ? "Mark as pending" : "Mark as completed"}
        aria-pressed={done}
        disabled={updateMutation.isPending}
        className="mt-0.5 shrink-0 cursor-pointer"
      >
        <CheckCircle2 size={18} className={done ? "text-success" : "text-muted-4"} strokeWidth={1.8} />
      </button>
      <div className="flex-1 min-w-0">
        <Link
          to={`/incidents/${encodeURIComponent(task.incident_id)}`}
          className={`text-[13.5px] font-medium hover:underline ${done ? "text-muted-3 line-through" : "text-ink"}`}
        >
          {task.title}
        </Link>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <Badge tone={TASK_STATUS_TONE[task.status]}>{task.status}</Badge>
          {showDue && (
            <span className={`flex items-center gap-1 text-[11.5px] font-mono ${overdue ? "text-danger" : "text-muted-4"}`}>
              <Clock size={11} /> due{" "}
              {new Date(task.due_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {showCompleted && task.completed_at && (
            <span className="text-[11.5px] font-mono text-muted-4">
              completed{" "}
              {new Date(task.completed_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
});

/** Shared list used for Pending / Upcoming / Recently Completed on the Officer Workspace, and reused as-is on the Incident Detail page's task checklist. */
export default function TaskList({ tasks, emptyLabel, showDue = false, showCompleted = false }) {
  if (tasks.length === 0) {
    return (
      <Card padding="p-7" hover={false} className="text-center text-[13.5px] text-muted-3">
        {emptyLabel}
      </Card>
    );
  }
  return (
    <Card padding="p-0" hover={false} className="overflow-hidden">
      <motion.div initial="hidden" animate="show" variants={staggerContainer}>
        {tasks.map((t, i) => (
          <TaskRow key={t.id} task={t} showDue={showDue} showCompleted={showCompleted} last={i === tasks.length - 1} />
        ))}
      </motion.div>
    </Card>
  );
}
