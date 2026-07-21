import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, ChevronDown } from "lucide-react";
import Avatar from "../ui/Avatar";
import { useAuth } from "../../lib/auth/useAuth";

/**
 * Replaces the old hardcoded "OP" avatar placeholder with the real
 * logged-in user's identity — name + role are visible directly in the nav
 * bar (not just inside the dropdown) so it's obvious at a glance who's
 * signed in, plus a real, clearly-labeled sign-out action.
 */
export default function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) return null;

  return (
    <div className="relative hidden sm:block">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 cursor-pointer rounded-[10px] px-1.5 py-1 hover:bg-[#F1EEE9] transition-colors duration-150"
      >
        <Avatar initials={user.avatar_initials} size={32} />
        <div className="hidden lg:flex flex-col items-start leading-tight">
          <span className="text-[12.5px] font-medium text-ink">{user.name}</span>
          <span className="text-[10.5px] text-muted-3 font-mono">{user.role}</span>
        </div>
        <ChevronDown size={14} className="hidden lg:block text-muted-4" strokeWidth={2} />
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
              className="absolute right-0 top-[46px] w-[240px] bg-white border border-border rounded-cardsm shadow-lift z-50 overflow-hidden"
            >
              <div className="px-4 py-3.5 border-b border-border-divider">
                <div className="text-[14px] font-medium text-ink">{user.name}</div>
                <div className="text-[12px] text-muted-3 mt-0.5 truncate">{user.email}</div>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="font-mono text-[10.5px] text-muted-3 uppercase">{user.role}</span>
                  <span className="text-muted-4">·</span>
                  <span className="text-[11px] text-muted-3">{user.region}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-[13.5px] font-medium text-danger hover:bg-danger-bg transition-colors duration-150 cursor-pointer"
              >
                <LogOut size={14} /> Sign out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
