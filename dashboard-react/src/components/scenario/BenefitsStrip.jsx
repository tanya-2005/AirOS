import { TrendingDown, Users, Building2, School, Leaf } from "lucide-react";
import SectionHeading from "../ui/SectionHeading";
import StatTile from "../ui/StatTile";
import { staggerContainer, fadeUp } from "../../lib/motion";
import { motion } from "framer-motion";

const ICON_PROPS = { size: 20, strokeWidth: 1.8 };

export default function BenefitsStrip({ aqiReduced, co2SavedTonnes }) {
  const red = Math.max(0, aqiReduced ?? 0);
  const peopleProtected = Math.round(red * 12400);
  const hospitals = Math.round(red / 6);
  const schools = Math.round(red / 2.2);

  return (
    <section className="mt-16">
      <SectionHeading eyebrow="06 · EXPECTED BENEFITS" title="What this buys the city" />
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        variants={staggerContainer}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-6"
      >
        <motion.div variants={fadeUp}>
          <StatTile icon={<TrendingDown {...ICON_PROPS} className="text-success" />} value={red} label="AQI reduction" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatTile icon={<Users {...ICON_PROPS} className="text-neutralchip-text1" />} value={peopleProtected} label="People protected" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatTile icon={<Building2 {...ICON_PROPS} className="text-neutralchip-text1" />} value={hospitals} label="Hospitals benefited" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatTile icon={<School {...ICON_PROPS} className="text-neutralchip-text1" />} value={schools} label="Schools benefited" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatTile
            icon={<Leaf {...ICON_PROPS} className="text-success" />}
            value={co2SavedTonnes ?? 0}
            label="Tonnes CO₂ / day"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
