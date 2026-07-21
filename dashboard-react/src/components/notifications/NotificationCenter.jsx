import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useNotifications, useMarkNotificationRead } from "../../lib/hooks/useApi";
import { notificationMeta, unreadCount } from "../../lib/notifications";
import { cn } from "../../lib/utils/cn";
import { Skeleton } from "../ui/Skeleton";

/** Replaces the old decorative bell (Milestone 0-era placeholder that never did anything) with a real dropdown over live GET /api/notifications — polled every 30s (see useNotifications), so "task due soon" entries surface without a manual refresh. */
export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const notificationsQuery = useNotifications();
  const markRead = useMarkNotificationRead();
  const notifications = notificationsQuery.data?.data ?? [];
  const unread = unreadCount(notifications);

  return (
    <div className="relative">
      <button
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="relative w-[38px] h-[38px] rounded-[10px] hidden sm:flex items-center justify-center cursor-pointer hover:bg-[#F1EEE9] transition-colors duration-150"
      >
        <Bell size={19} className="text-[#44474B]" strokeWidth={1.7} />
        {unread > 0 && (
          <span className="absolute top-[6px] right-[7px] min-w-[15px] h-[15px] px-[3px] rounded-full bg-danger border-[1.5px] border-bg text-white text-[9px] font-mono font-medium flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
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
              className="absolute right-0 top-[46px] w-[340px] bg-white border border-border rounded-cardsm shadow-lift z-50 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-border-divider bg-search/50 font-mono text-[11px] tracking-[.08em] text-muted-3 uppercase">
                Notifications
              </div>
              <div className="max-h-[380px] overflow-y-auto">
                {notificationsQuery.isLoading ? (
                  <div className="flex flex-col gap-3 px-4 py-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Skeleton className="w-7 h-7 rounded-chip shrink-0" />
                        <div className="flex-1 flex flex-col gap-1.5">
                          <Skeleton className="h-3 w-2/3" />
                          <Skeleton className="h-3 w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[13px] text-muted-3">You're all caught up.</div>
                ) : (
                  notifications.map((n) => {
                    const meta = notificationMeta(n.type);
                    const Icon = meta.Icon;
                    return (
                      <Link
                        key={n.id}
                        to={n.link}
                        onClick={() => {
                          if (!n.read) markRead.mutate(n.id);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex items-start gap-3 px-4 py-3 border-b border-border-divider last:border-b-0 hover:bg-search/60 transition-colors duration-150",
                          !n.read && "bg-accent-tint/40"
                        )}
                      >
                        <div className="w-7 h-7 rounded-chip bg-search flex items-center justify-center shrink-0 mt-0.5">
                          <Icon size={13} className="text-muted-2" strokeWidth={1.8} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium text-ink truncate">{n.title}</div>
                          <div className="text-[12px] text-muted-3 mt-0.5 line-clamp-2">{n.message}</div>
                        </div>
                        {!n.read && <span className="w-[7px] h-[7px] rounded-full bg-accent shrink-0 mt-1.5" />}
                      </Link>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
