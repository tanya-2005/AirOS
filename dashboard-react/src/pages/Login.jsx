import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogIn, ShieldCheck, HardHat, LineChart, Sparkles, KeyRound } from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { useAuth } from "../lib/auth/useAuth";
import { describeApiError } from "../lib/api/client";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../lib/auth/demoAccounts";
import { dashboardForRole } from "../lib/auth/roleRouting";
import { fadeUp, staggerContainer } from "../lib/motion";

const ROLE_ICON = { Administrator: ShieldCheck, "Pollution Control Officer": HardHat, Analyst: LineChart };
const ROLE_TONE = { Administrator: "hazard", "Pollution Control Officer": "accent", Analyst: "muted" };

export default function Login() {
  const { login, user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!isLoading && isAuthenticated) {
    // Same target logic as completeLogin below — e.g. an already-signed-in
    // Officer hitting /login directly (back button, stale tab) still lands
    // on My Workspace, not a hardcoded fallback.
    const redirectTo = location.state?.from?.pathname || dashboardForRole(user.role);
    return <Navigate to={redirectTo} replace />;
  }

  // Demo buttons pass hardcoded JS constants that are always clean; the
  // manual form's values come straight from real <input> DOM elements,
  // the one path exposed to a stray trailing space from typing or
  // copy-pasting the credentials shown below (e.g. selecting "airos2026"
  // out of the "Seeded demo credentials" block can grab trailing
  // whitespace depending on the browser). Trim both here so every caller
  // gets the same treatment instead of only fixing the symptom for one.
  async function completeLogin(loginEmail, loginPassword) {
    setError(null);
    setBusy(true);
    try {
      const user = await login(loginEmail.trim(), loginPassword.trim());
      // A direct link (e.g. "sign in to view this incident") still wins over
      // the role default, so a judge who followed a deep link lands back on it.
      const target = location.state?.from?.pathname || dashboardForRole(user.role);
      navigate(target, { replace: true });
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    completeLogin(email, password);
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-5 py-12">
      <motion.div initial="hidden" animate="show" variants={fadeUp} className="w-full max-w-[560px]">
        <div className="flex items-center gap-[11px] justify-center mb-8">
          <div className="w-[34px] h-[34px] rounded-[9px] bg-ink flex items-center justify-center">
            <div className="w-[10px] h-[10px] rounded-full bg-success-soft shadow-[0_0_0_3px_rgba(76,175,125,.28)]" />
          </div>
          <span className="font-display text-[26px] tracking-[-.01em] text-ink">AirOS</span>
        </div>

        {/* Enter Demo Mode — the one button a judge can't miss */}
        <Card padding="p-6" hover={false} dark className="flex items-center justify-between gap-4 flex-wrap mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-white/10 flex items-center justify-center shrink-0">
              <Sparkles size={18} className="text-panel-accent" strokeWidth={1.8} />
            </div>
            <div>
              <div className="font-display text-[17px] text-white leading-tight">Enter Demo Mode</div>
              <div className="text-[12.5px] text-panel-muted mt-0.5">Instantly signs in as the Administrator.</div>
            </div>
          </div>
          <Button
            variant="dark"
            size="md"
            icon={<LogIn size={14} />}
            disabled={busy}
            onClick={() => completeLogin("admin@airos.gov.in", DEMO_PASSWORD)}
          >
            {busy ? "Signing in…" : "Enter Demo Mode"}
          </Button>
        </Card>

        <Card padding="p-7" hover={false}>
          <div className="flex items-center gap-2.5 mb-1">
            <ShieldCheck size={16} className="text-accent" strokeWidth={1.8} />
            <span className="font-mono text-[11px] tracking-[.08em] text-muted-3 uppercase">Operator sign-in</span>
          </div>
          <h1 className="font-display font-normal text-[26px] text-ink mt-1">Pollution Control Board Ops</h1>
          <p className="text-[13.5px] text-muted-2 mt-2">
            Choose a demo account below, or sign in with your own credentials.
          </p>

          {/* Demo Accounts — one click, no typing */}
          <motion.div initial="hidden" animate="show" variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
            {DEMO_ACCOUNTS.map((acct) => {
              const Icon = ROLE_ICON[acct.role];
              return (
                <motion.div
                  key={acct.email}
                  variants={fadeUp}
                  className="flex flex-col gap-2.5 rounded-[14px] border border-border p-4 bg-search/40"
                >
                  <div className="w-8 h-8 rounded-chip bg-white flex items-center justify-center border border-border">
                    <Icon size={15} className="text-ink" strokeWidth={1.8} />
                  </div>
                  <div>
                    <Badge tone={ROLE_TONE[acct.role]} className="mb-1.5">
                      {acct.role}
                    </Badge>
                    <div className="text-[13px] font-medium text-ink">{acct.name}</div>
                    <div className="text-[11px] text-muted-3 font-mono mt-0.5 truncate">{acct.email}</div>
                    <div className="text-[11.5px] text-muted-3 mt-1.5 leading-snug">{acct.description}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => completeLogin(acct.email, DEMO_PASSWORD)}
                    className="justify-center mt-auto"
                  >
                    Login as Demo User
                  </Button>
                </motion.div>
              );
            })}
          </motion.div>

          <div className="flex items-center gap-3 my-7">
            <div className="h-px flex-1 bg-border-divider" />
            <span className="font-mono text-[10.5px] tracking-[.08em] text-muted-4 uppercase">Or sign in manually</span>
            <div className="h-px flex-1 bg-border-divider" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="font-mono text-[10.5px] tracking-[.08em] text-muted-3 uppercase">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-2 rounded-[12px] border border-border bg-white px-3.5 py-3 text-[14px] text-ink outline-none focus:border-accent focus:shadow-[0_0_0_4px_rgba(31,122,133,.10)] transition-[border-color,box-shadow] duration-200"
                placeholder="you@airos.gov.in"
              />
            </div>
            <div>
              <label htmlFor="password" className="font-mono text-[10.5px] tracking-[.08em] text-muted-3 uppercase">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-2 rounded-[12px] border border-border bg-white px-3.5 py-3 text-[14px] text-ink outline-none focus:border-accent focus:shadow-[0_0_0_4px_rgba(31,122,133,.10)] transition-[border-color,box-shadow] duration-200"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-[13px] text-danger bg-danger-bg border border-danger/25 rounded-lg px-3.5 py-2.5">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              icon={<LogIn size={14} className="text-panel-accent" />}
              disabled={busy}
              className="justify-center mt-1"
            >
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          {/* Seeded credentials, visible — not hidden in a README */}
          <div className="mt-7 pt-6 border-t border-border-divider">
            <div className="flex items-center gap-2 mb-3">
              <KeyRound size={13} className="text-muted-3" strokeWidth={1.8} />
              <span className="font-mono text-[10.5px] tracking-[.08em] text-muted-3 uppercase">
                Seeded demo credentials
              </span>
            </div>
            <div className="rounded-[10px] bg-search px-4 py-3.5 flex flex-col gap-1.5">
              {DEMO_ACCOUNTS.map((acct) => (
                <div key={acct.email} className="flex items-center justify-between gap-3 text-[12px] font-mono">
                  <span className="text-ink">{acct.email}</span>
                  <span className="text-muted-3">{acct.role}</span>
                </div>
              ))}
              <div className="border-t border-border-divider mt-1.5 pt-1.5 text-[12px] font-mono text-muted-2">
                Password for every account: <span className="text-ink font-medium">{DEMO_PASSWORD}</span>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
