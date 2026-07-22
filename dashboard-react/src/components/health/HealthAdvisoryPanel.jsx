import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import SectionHeading from "../ui/SectionHeading";
import GroupAdvisoryCard from "./GroupAdvisoryCard";
import LanguageSelector from "./LanguageSelector";
import { SkeletonCard } from "../ui/Skeleton";
import { staggerContainer, fadeUp } from "../../lib/motion";
import { GROUP_ORDER } from "../../lib/healthAdvisory";
import { getStoredLanguage, setStoredLanguage } from "../../lib/languages";
import { useTranslatedStationHealth } from "../../lib/hooks/useApi";

/**
 * The full 10-group breakdown the Health Advisory Engine produces — lives
 * on the Incident Detail and Citizen Advisory pages (both pass a
 * `stationName`, needed here to fetch a translation; `advisories` itself
 * is unchanged, still fetched once by the parent page exactly as before
 * this feature existed).
 *
 * Multilingual Citizen Communication wraps around, rather than replaces,
 * the existing engine: `advisories` (English, deterministic, computed by
 * health_advisory_agent.py) is always what's shown for English and always
 * what's shown the instant translation fails — the language selector only
 * ever changes which RENDERING of that same decided content is on screen.
 */
export default function HealthAdvisoryPanel({ advisories, stationName }) {
  const [language, setLanguage] = useState(getStoredLanguage());
  const translationQuery = useTranslatedStationHealth(stationName, language);

  function handleLanguageChange(code) {
    setStoredLanguage(code);
    setLanguage(code);
  }

  if (!advisories) return null;

  const isEnglish = language === "en";
  const isLoading = !isEnglish && translationQuery.isFetching;
  const translatedPayload = translationQuery.data?.data;
  // Covers both failure shapes: a clean 200 with translated:false (the LLM
  // itself failed — no key configured, model error) AND a genuine
  // network/HTTP-level failure (backend unreachable, unexpected 5xx) —
  // either way the badge is honest about it instead of only catching the
  // case the backend explicitly flagged.
  const translationFailed = !isEnglish && (translationQuery.isError || translatedPayload?.translated === false);
  const displayAdvisories = !isEnglish && translatedPayload?.advisories ? translatedPayload.advisories : advisories;

  return (
    <section>
      <SectionHeading
        eyebrow="CITIZEN HEALTH ADVISORY"
        title="Guidance by group"
        description="Deterministic, CPCB/WHO-style guidance — the risk levels and recommendations are rule-based, not AI-generated. Non-English text is produced by an AI translation model rendering this same content naturally; English never touches it."
        className="mb-6"
        right={
          <div className="flex items-center gap-3 shrink-0">
            {isLoading && (
              <span className="flex items-center gap-1.5 text-[11.5px] text-muted-3">
                <Loader2 size={13} className="animate-spin" strokeWidth={2} />
                Translating — can take a minute on the free model…
              </span>
            )}
            <LanguageSelector language={language} onChange={handleLanguageChange} disabled={isLoading} />
          </div>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GROUP_ORDER.map((key) => (
            <SkeletonCard key={key} lines={3} />
          ))}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={language}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              initial="hidden"
              animate="show"
              variants={staggerContainer}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {GROUP_ORDER.map((key) => (
                <motion.div key={key} variants={fadeUp}>
                  <GroupAdvisoryCard groupKey={key} advisory={displayAdvisories[key]} translationUnavailable={translationFailed} />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </section>
  );
}
