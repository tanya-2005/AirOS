import { motion } from "framer-motion";
import SectionHeading from "../ui/SectionHeading";
import GroupAdvisoryCard from "./GroupAdvisoryCard";
import { staggerContainer, fadeUp } from "../../lib/motion";
import { GROUP_ORDER } from "../../lib/healthAdvisory";

/** The full 10-group breakdown the Health Advisory Engine produces — lives on the Incident Detail page (see pages/Incidents/IncidentDetail.jsx), the natural "drill into everything about this situation" home in this app, rather than a new top-level page. */
export default function HealthAdvisoryPanel({ advisories }) {
  if (!advisories) return null;
  return (
    <section>
      <SectionHeading
        eyebrow="CITIZEN HEALTH ADVISORY"
        title="Guidance by group"
        description="Deterministic, CPCB/WHO-style guidance — every recommendation traces back to the live AQI, forecast trend, and dominant attributed source. No AI-generated text."
        className="mb-6"
      />
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        variants={staggerContainer}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {GROUP_ORDER.map((key) => (
          <motion.div key={key} variants={fadeUp}>
            <GroupAdvisoryCard groupKey={key} advisory={advisories[key]} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
