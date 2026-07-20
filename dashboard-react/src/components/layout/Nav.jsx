import { useState } from "react";
import { NavLink as RouterNavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Bell, Menu, X } from "lucide-react";
import Avatar from "../ui/Avatar";
import { cn } from "../../lib/utils/cn";

const LINKS = [
  { to: "/", label: "Command Center" },
  { to: "/map", label: "Map" },
  { to: "/attribution", label: "Sources" },
  { to: "/forecast", label: "Forecast" },
  { to: "/report", label: "Report" },
  { to: "/simulate", label: "Simulate" },
];

function linkClass({ isActive }) {
  return cn(
    "text-[14px] px-3 py-2 rounded-lg transition-colors duration-150",
    isActive ? "text-ink font-medium bg-[#F1EEE9]" : "text-muted-2 hover:bg-[#F1EEE9]/60"
  );
}

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="print:hidden sticky top-0 z-50 bg-bg/85 backdrop-blur-md backdrop-saturate-150 border-b border-border-nav">
      <div className="max-w-content mx-auto px-5 md:px-10 h-[72px] flex items-center gap-7">
        <a href="/" className="flex items-center gap-[11px] shrink-0">
          <div className="w-[30px] h-[30px] rounded-[9px] bg-ink flex items-center justify-center">
            <div className="w-[9px] h-[9px] rounded-full bg-success-soft shadow-[0_0_0_3px_rgba(76,175,125,.28)]" />
          </div>
          <span className="font-display text-[22px] tracking-[-.01em] text-ink">AirOS</span>
        </a>

        <nav className="hidden lg:flex items-center gap-1 ml-2">
          {LINKS.map((link) => (
            <RouterNavLink key={link.to} to={link.to} end={link.to === "/"} className={linkClass}>
              {link.label}
            </RouterNavLink>
          ))}
        </nav>

        <div className="flex-1" />

        <label className="hidden md:flex items-center gap-2 bg-search border border-border-nav rounded-[10px] px-3 py-2 w-[200px] transition-[border-color,background,box-shadow] duration-200 focus-within:border-accent focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(31,122,133,.10)]">
          <Search size={16} className="text-muted-4 shrink-0" />
          <input
            placeholder="Search stations…"
            className="text-[13.5px] text-ink w-full border-none bg-transparent outline-none placeholder:text-muted-4"
          />
        </label>

        <button
          aria-label="Notifications"
          className="relative w-[38px] h-[38px] rounded-[10px] hidden sm:flex items-center justify-center cursor-pointer hover:bg-[#F1EEE9] transition-colors duration-150"
        >
          <Bell size={19} className="text-[#44474B]" strokeWidth={1.7} />
          <span className="absolute top-[7px] right-[8px] w-[7px] h-[7px] rounded-full bg-danger border-[1.5px] border-bg" />
        </button>

        <div className="hidden sm:block">
          <Avatar initials="OP" />
        </div>

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
            <div className="px-5 py-3 flex flex-col gap-1">
              {LINKS.map((link) => (
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
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
