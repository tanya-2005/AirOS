// Phase 8 — shared notification utilities. Operates on the Notification
// shape from GET /api/notifications (see agents/notification_agent.py).
import { AlertTriangle, ClipboardCheck, UserPlus, Bell, Clock } from "lucide-react";

export const NOTIFICATION_META = {
  new_incident: { label: "New incident", Icon: Bell, tone: "accent" },
  high_severity: { label: "High severity", Icon: AlertTriangle, tone: "danger" },
  incident_assigned: { label: "Assigned to you", Icon: UserPlus, tone: "accent" },
  incident_resolved: { label: "Resolved", Icon: ClipboardCheck, tone: "success" },
  task_due_soon: { label: "Due soon", Icon: Clock, tone: "warning" },
};

export function notificationMeta(type) {
  return NOTIFICATION_META[type] || { label: type, Icon: Bell, tone: "muted" };
}

export function unreadCount(notifications) {
  return notifications.filter((n) => !n.read).length;
}
