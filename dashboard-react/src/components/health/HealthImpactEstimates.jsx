import { HeartPulse, Wind, Users, Info } from "lucide-react";
import { motion } from "framer-motion";
import SectionHeading from "../ui/SectionHeading";
import StatTile from "../ui/StatTile";
import InsightTile from "../ui/InsightTile";
import { staggerContainer, fadeUp } from "../../lib/motion";
import { estimateHealthRiskImprovement, estimateExposureReduction, estimatePopulationBenefit } from "../../lib/healthAdvisory";

const ICON_PROPS = { size: 20, strokeWidth: 1.8 };

/** Scenario Lab's health-framed read on the same live /api/simulate result ImpactAssessment already shows — explicitly labeled "Model Estimate" on every tile per the milestone's requirement, since none of these three numbers are measured health outcomes. */
export default function HealthImpactEstimates({ baselineAqi, predictedAqi, aqiReduced }) {
  const riskImprovement = estimateHealthRiskImprovement(baselineAqi, predictedAqi);
  const exposureReduction = estimateExposureReduction(baselineAqi, predictedAqi);
  const populationBenefit = estimatePopulationBenefit(aqiReduced);

  return (
    <section className="mt-16">
      <SectionHeading eyebrow="HEALTH IMPACT" title="What this means for public health" className="mb-3" />
      <div className="flex items-center gap-2 mb-6 text-[12.5px] text-muted-3">
        <Info size={13} strokeWidth={1.8} />
        Model Estimates — derived from the live simulation result above, not measured health outcomes.
      </div>
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        variants={staggerContainer}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <motion.div variants={fadeUp}>
          <InsightTile
            icon={<HeartPulse {...ICON_PROPS} className="text-success" />}
            value={riskImprovement ? `${riskImprovement.beforeLevel} → ${riskImprovement.afterLevel}` : "—"}
            label="Health risk improvement (Model Estimate)"
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatTile
            icon={<Wind {...ICON_PROPS} className="text-accent" />}
            value={exposureReduction}
            suffix="%"
            label="Exposure reduction (Model Estimate)"
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatTile
            icon={<Users {...ICON_PROPS} className="text-accent" />}
            value={populationBenefit}
            label="Population benefit (Model Estimate)"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
