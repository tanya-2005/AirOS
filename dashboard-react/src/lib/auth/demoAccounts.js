// Demo accounts shown on the Login page — real seeded users (see
// data/users.json, appended to by this milestone: usr-001, usr-006,
// usr-007), all authenticated through the real /api/auth/login endpoint
// with real PBKDF2 password verification (backend/auth.py). "One-click"
// login here means the button fills in and submits these real credentials
// for you — it is not a bypass of authentication.
export const DEMO_PASSWORD = "airos2026";

export const DEMO_ACCOUNTS = [
  {
    role: "Administrator",
    name: "Anjali Sharma",
    email: "admin@airos.gov.in",
    description: "Assigns incidents, sees every dashboard.",
  },
  {
    role: "Pollution Control Officer",
    name: "Demo Officer",
    email: "officer@airos.gov.in",
    description: "Works assigned incidents from My Workspace.",
  },
  {
    role: "Analyst",
    name: "Demo Analyst",
    email: "analyst@airos.gov.in",
    description: "Read-only — reporting and intelligence views.",
  },
];
