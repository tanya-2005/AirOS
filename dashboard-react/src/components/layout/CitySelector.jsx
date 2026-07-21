import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, MapPin, Check } from "lucide-react";
import { useCity } from "../../lib/city/useCity";

/**
 * Global city selector — lives in Nav, so it's on every page. Changing the
 * city here is the ONLY place selected-city state changes (lib/city/CityProvider.jsx);
 * every page's data hooks read it from there, so nothing here talks to
 * individual pages directly — that's what makes "every page updates
 * automatically" true without each page wiring up its own listener.
 */
export default function CitySelector() {
  const { city, setCity, cities, cityMeta } = useCity();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Select city"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] border border-border-nav bg-search hover:border-border-hover transition-colors duration-150 cursor-pointer"
      >
        <MapPin size={14} className="text-accent shrink-0" strokeWidth={1.8} />
        <span className="text-[13.5px] font-medium text-ink hidden sm:inline">{cityMeta.label}</span>
        <ChevronDown size={13} className="text-muted-4 shrink-0" strokeWidth={2} />
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
              className="absolute left-0 top-[46px] w-[220px] bg-white border border-border rounded-cardsm shadow-lift z-50 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-border-divider bg-search/50 font-mono text-[11px] tracking-[.08em] text-muted-3 uppercase">
                Select city
              </div>
              <div className="max-h-[320px] overflow-y-auto">
                {cities.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCity(c.id);
                      setOpen(false);
                    }}
                    aria-pressed={c.id === city}
                    className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-search transition-colors duration-150 cursor-pointer"
                  >
                    <div>
                      <div className="text-[13.5px] font-medium text-ink">{c.label}</div>
                      <div className="text-[11px] text-muted-3">{c.state}</div>
                    </div>
                    {c.id === city && <Check size={14} className="text-accent shrink-0" strokeWidth={2.2} />}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
