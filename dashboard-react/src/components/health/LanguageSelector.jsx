import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Languages, ChevronDown, Check } from "lucide-react";
import { SUPPORTED_LANGUAGES, languageMeta } from "../../lib/languages";
import { cn } from "../../lib/utils/cn";

/**
 * "Language: [ English v ]" — same compact button + slide-down panel
 * pattern as the header's CitySelector (components/layout/CitySelector.jsx),
 * deliberately plain/government-styled rather than a colorful
 * Google-Translate-style widget: one mono label, one bordered pill, no
 * flags or bright accent colors.
 */
export default function LanguageSelector({ language, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const current = languageMeta(language);

  return (
    <div className="relative shrink-0">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10.5px] tracking-[.08em] text-muted-3 uppercase">Language</span>
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={disabled}
          aria-label="Select advisory language"
          aria-expanded={open}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] border border-border bg-white transition-colors duration-150",
            disabled ? "opacity-50 cursor-not-allowed" : "hover:border-border-hover cursor-pointer"
          )}
        >
          <Languages size={13} className="text-accent shrink-0" strokeWidth={1.8} />
          <span className="text-[13px] font-medium text-ink">{current.label}</span>
          <ChevronDown size={12} className="text-muted-4 shrink-0" strokeWidth={2} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-[38px] w-[200px] bg-white border border-border rounded-cardsm shadow-lift z-50 overflow-hidden"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    onChange(l.code);
                    setOpen(false);
                  }}
                  aria-pressed={l.code === language}
                  className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-search transition-colors duration-150 cursor-pointer"
                >
                  <div>
                    <div className="text-[13px] font-medium text-ink">{l.label}</div>
                    {l.nativeLabel !== l.label && <div className="text-[11.5px] text-muted-3 mt-0.5">{l.nativeLabel}</div>}
                  </div>
                  {l.code === language && <Check size={14} className="text-accent shrink-0" strokeWidth={2.2} />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
