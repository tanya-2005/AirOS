import { TrendingDown, Wind, Cloud, Users, School, Building2, Info } from "lucide-react";
import SectionHeading from "../ui/SectionHeading";
import StatTile from "../ui/StatTile";
import { staggerContainer, fadeUp } from "../../lib/motion";
import { motion } from "framer-motion";
import { estimatePM25, estimatePM10 } from "../../lib/policies";

const ICON_PROPS = { size: 20, strokeWidth: 1.8 };

/**
 * Milestone 5 Task 3 — every figure here except AQI improvement is a
 * modeled estimate, not measured data, and is labeled as such directly on
 * the tile (not just in a code comment) since that's the explicit
 * requirement: "never present modeled values as measured data." AQI
 * improvement is the one real, live number — it comes straight from
 * simulation_agent.py via /api/simulate. PM2.5/PM10 use the same disclosed
 * AQI-to-pollutant conversion Scenario Lab's prediction panel already
 * used; population/schools/hospitals use the same disclosed
 * density-proxy formulas the pre-Milestone-5 Benefits Strip used — there
 * is no real population/school/hospital location dataset in this project.
 */
export default function ImpactAssessment({ baselineAqi, predictedAqi, aqiReduced }) {
  const red = Math.max(0, aqiReduced ?? 0);
  const pm25Reduction =
    baselineAqi != null && predictedAqi != null ? Math.max(0, estimatePM25(baselineAqi) - estimatePM25(predictedAqi)) : 0;
  const pm10Reduction =
    baselineAqi != null && predictedAqi != null ? Math.max(0, estimatePM10(baselineAqi) - estimatePM10(predictedAqi)) : 0;
  const population = Math.round(red * 12400);
  const schools = Math.round(red / 2.2);
  const hospitals = Math.round(red / 6);

  return (
    <section className="mt-16">
      <SectionHeading
        eyebrow="IMPACT ASSESSMENT"
        title="What this buys the city"
        className="mb-3"
      />
      <div className="flex items-center gap-2 mb-6 text-[12.5px] text-muted-3">
        <Info size={13} strokeWidth={1.8} />
        AQI improvement is live from the simulation agent. Everything else below is a modeled estimate derived
        from it, not measured field data.
      </div>
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        variants={staggerContainer}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
      >
        <motion.div variants={fadeUp}>
          <StatTile icon={<TrendingDown {...ICON_PROPS} className="text-success" />} value={red} label="AQI improvement (live)" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatTile icon={<Wind {...ICON_PROPS} className="text-accent" />} value={pm25Reduction} label="PM2.5 reduction (modeled)" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatTile icon={<Cloud {...ICON_PROPS} className="text-accent" />} value={pm10Reduction} label="PM10 reduction (modeled)" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatTile icon={<Users {...ICON_PROPS} className="text-neutralchip-text1" />} value={population} label="Population affected (modeled)" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatTile icon={<School {...ICON_PROPS} className="text-neutralchip-text1" />} value={schools} label="Schools nearby (modeled)" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatTile icon={<Building2 {...ICON_PROPS} className="text-neutralchip-text1" />} value={hospitals} label="Hospitals nearby (modeled)" />
        </motion.div>
      </motion.div>
    </section>
  );
}
