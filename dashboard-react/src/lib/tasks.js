// Phase 8 — shared task utilities. Operates on the Task shape from
// GET /api/tasks (see agents/task_agent.py).

export const TASK_STATUSES = ["Pending", "In Progress", "Completed"];
export const TASK_STATUS_TONE = { Pending: "muted", "In Progress": "warning", Completed: "success" };

export function isOverdue(task) {
  return task.status !== "Completed" && new Date(task.due_at).getTime() < Date.now();
}

export function tasksForIncident(tasks, incidentId) {
  return tasks.filter((t) => t.incident_id === incidentId).sort((a, b) => a.sequence - b.sequence);
}

export function tasksForOfficer(tasks, officerId) {
  return tasks.filter((t) => t.assigned_officer_id === officerId);
}

/** Completed/total for an incident's checklist — the Incident Detail page's "Inspection Progress" bar. */
export function taskProgress(tasks) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "Completed").length;
  return { completed, total, pct: total ? Math.round((completed / total) * 100) : 0 };
}

export function pendingTasks(tasks) {
  return tasks.filter((t) => t.status !== "Completed");
}

export function completedTasks(tasks) {
  return tasks.filter((t) => t.status === "Completed");
}

export function upcomingTasks(tasks, withinHours = 48) {
  const cutoff = Date.now() + withinHours * 3600_000;
  return pendingTasks(tasks)
    .filter((t) => new Date(t.due_at).getTime() <= cutoff)
    .sort((a, b) => new Date(a.due_at) - new Date(b.due_at));
}

/** Real derived stat from an officer's own incidents — no invented benchmark, null when there isn't yet enough data to compute one. */
export function avgResolutionHours(incidents) {
  const hours = incidents
    .filter((i) => i.status === "Resolved")
    .map((i) => {
      const resolvedEvent = i.timeline.find((t) => t.event === "Resolved");
      return resolvedEvent ? (new Date(resolvedEvent.at) - new Date(i.created_at)) / 3600000 : null;
    })
    .filter((h) => h != null);
  if (!hours.length) return null;
  return Math.round((hours.reduce((s, h) => s + h, 0) / hours.length) * 10) / 10;
}

export function onTimeRate(tasks) {
  const completed = tasks.filter((t) => t.status === "Completed" && t.completed_at);
  if (!completed.length) return null;
  const onTime = completed.filter((t) => new Date(t.completed_at) <= new Date(t.due_at)).length;
  return Math.round((onTime / completed.length) * 100);
}
