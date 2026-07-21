import { useState } from "react";
import { NavLink as RouterNavLink, Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Menu, X } from "lucide-react";
import NotificationCenter from "../notifications/NotificationCenter";
import UserMenu from "./UserMenu";
import CitySelector from "./CitySelector";
import NavGroup from "./NavGroup";
import { useAuth } from "../../lib/auth/useAuth";
import { cn } from "../../lib/utils/cn";

// Grouped by what an officer is trying to DO, not by software category —
// "Monitoring / Operations / Analysis" read as engineering module names;
// these read as the actual SIH chain (detect -> understand -> respond ->
// protect -> decide -> report -> trust) an officer walks through on a real
// pollution event, start to finish.
const NAV_GROUPS = [
  {
    label: "Detect & Understand",
    links: [
      { to: "/mission-control", label: "Command Centre" },
      { to: "/city-operations", label: "City Operations" },
      { to: "/map", label: "Map" },
      { to: "/forecast", label: "Prediction Engine" },
      { to: "/attribution", label: "Attribution" },
      { to: "/compare", label: "Compare Cities" },
    ],
  },
  {
    label: "Respond & Protect",
    links: [
      { to: "/incidents", label: "Response Coordination" },
      { to: "/advisory", label: "Public Protection" },
    ],
  },
  {
    label: "Decide & Report",
    links: [
      { to: "/simulate", label: "Decision Support" },
      { to: "/report", label: "Executive Briefing" },
      { to: "/validation", label: "Trust & Reliability" },
    ],
  },
];
const OFFICER_LINK = { to: "/officer", label: "My Workspace" };

function linkClass({ isActive }) {
  return cn(
    "text-[14px] px-3 py-2 rounded-lg transition-colors duration-150",
    isActive ? "text-ink font-medium bg-[#F1EEE9]" : "text-muted-2 hover:bg-[#F1EEE9]/60"
  );
}

export default function Nav() {
  const [open, setOpen] = useState(false);
  const { hasRole } = useAuth();
  const location = useLocation();
  const isOfficer = hasRole("Pollution Control Officer");

  const groups = isOfficer
    ? NAV_GROUPS.map((g) => (g.label === "Respond & Protect" ? { ...g, links: [...g.links, OFFICER_LINK] } : g))
    : NAV_GROUPS;

  return (
    <header className="print:hidden sticky top-0 z-50 bg-bg/85 backdrop-blur-md backdrop-saturate-150 border-b border-border-nav">
      <div className="max-w-content mx-auto px-5 md:px-10 h-[72px] flex items-center gap-7">
        <Link to="/mission-control" className="flex items-center gap-[11px] shrink-0">
          <div className="w-[30px] h-[30px] rounded-[9px] bg-ink flex items-center justify-center">
            <div className="w-[9px] h-[9px] rounded-full bg-success-soft shadow-[0_0_0_3px_rgba(76,175,125,.28)]" />
          </div>
          <span className="font-display text-[22px] tracking-[-.01em] text-ink">AirOS</span>
        </Link>

        <CitySelector />

        <nav className="hidden lg:flex items-center gap-1 ml-2">
          {groups.map((g) => (
            <NavGroup
              key={g.label}
              label={g.label}
              links={g.links}
              isActiveGroup={g.links.some((l) => location.pathname.startsWith(l.to))}
            />
          ))}
        </nav>

        <div className="flex-1" />

        <label className="hidden md:flex items-center gap-2 bg-search border border-border-nav rounded-[10px] px-3 py-2 w-[200px] transition-[border-color,background,box-shadow] duration-200 focus-within:border-accent focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(31,122,133,.10)]">
          <Search size={16} className="text-muted-4 shrink-0" />
          <input
            aria-label="Search stations"
            placeholder="Search stations…"
            className="text-[13.5px] text-ink w-full border-none bg-transparent outline-none placeholder:text-muted-4"
          />
        </label>

        <NotificationCenter />
        <UserMenu />

        <button
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden w-[38px] h-[38px] rounded-[10px] flex items-center justify-center cursor-pointer hover:bg-[#F1EEE9] transition-colors duration-150"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
            className="lg:hidden overflow-hidden border-t border-border-nav bg-bg"
          >
            <div className="px-5 py-3 flex flex-col gap-4">
              {groups.map((g) => (
                <div key={g.label}>
                  <div className="font-mono text-[10.5px] tracking-[.08em] text-muted-4 uppercase px-3 mb-1">{g.label}</div>
                  <div className="flex flex-col gap-1">
                    {g.links.map((link) => (
                      <RouterNavLink
                        key={link.to}
                        to={link.to}
                        end={link.to === "/"}
                        onClick={() => setOpen(false)}
                        className={linkClass}
                      >
                        {link.label}
                      </RouterNavLink>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
