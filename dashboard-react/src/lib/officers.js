// Phase 8 — shared user/officer utilities. Operates on the public User
// shape returned by GET /api/users (see backend/auth.py::public_user) —
// password fields never leave the backend, nothing to strip here.

export const USER_STATUS_TONE = { Available: "success", Busy: "warning", Offline: "muted" };
export const ROLE_TONE = { Administrator: "hazard", "Pollution Control Officer": "accent", Analyst: "muted" };

export function officersOnly(users) {
  return users.filter((u) => u.role === "Pollution Control Officer");
}

export function userLookup(users) {
  return new Map(users.map((u) => [u.id, u]));
}

export function officerName(users, officerId) {
  return users.find((u) => u.id === officerId)?.name ?? null;
}
