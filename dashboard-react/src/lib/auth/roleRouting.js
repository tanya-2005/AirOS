// Where each role lands right after login. Officer Workspace (their task
// queue) and the Intelligence Report (Analyst's reporting view) stay
// role-specific landings — Operational Continuity's Mission Control
// replaces Command Center as the Administrator's entry point ("the primary
// entry point after login" per that milestone's spec) since it's the one
// role that oversees the whole operation end-to-end; Command Center itself
// is untouched and still reachable via its own nav link at "/".
export const DASHBOARD_BY_ROLE = {
  Administrator: "/mission-control",
  "Pollution Control Officer": "/officer",
  Analyst: "/report",
};

export function dashboardForRole(role) {
  return DASHBOARD_BY_ROLE[role] || "/mission-control";
}
