import { useState } from "react";
import { NavLink as RouterNavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils/cn";

/**
 * One dropdown per navigation group (Monitoring / Operations / Analysis) —
 * replaces the old flat 11-link row, same dropdown mechanics as UserMenu.jsx
 * (click-outside-to-close via a fixed overlay) so the interaction pattern
 * is already familiar rather than a new one-off. The group label itself
 * highlights when any of its links is the active route, so "where am I"
 * stays obvious even with the page one level down in a menu.
 */
export default function NavGroup({ label, links, isActiveGroup }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex items-center gap-1 text-[14px] px-3 py-2 rounded-lg transition-colors duration-150 cursor-pointer",
          isActiveGroup ? "text-ink font-medium bg-[#F1EEE9]" : "text-muted-2 hover:bg-[#F1EEE9]/60"
        )}
      >
        {label}
        <ChevronDown size={13} className={cn("transition-transform duration-150", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-[42px] w-[220px] bg-white border border-border rounded-cardsm shadow-lift z-50 overflow-hidden py-1.5"
            >
              {links.map((link) => (
                <RouterNavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === "/"}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] transition-colors duration-150",
                      isActive ? "text-ink font-medium bg-search" : "text-muted-1 hover:bg-search"
                    )
                  }
                >
                  {link.label}
                </RouterNavLink>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
