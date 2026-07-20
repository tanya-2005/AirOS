import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import SectionHeading from "../ui/SectionHeading";
import Button from "../ui/Button";
import Card from "../ui/Card";
import AnimatedNumber from "../ui/AnimatedNumber";
import { darkPanelCategoryFor } from "../../lib/aqi";

const SLOTS = ["A", "B", "C"];

function SlotCard({ id, data, isBest }) {
  if (!data) {
    return (
      <Card padding="p-[26px]" className="min-h-[200px] flex flex-col items-center justify-center text-center">
        <div className="w-11 h-11 rounded-xl bg-search flex items-center justify-center font-display text-[20px] text-muted-5">
          {id}
        </div>
        <div className="text-[14px] text-muted-4 mt-3.5">Empty — save a scenario</div>
      </Card>
    );
  }

  const cat = darkPanelCategoryFor(data.predicted);

  return (
    <Card padding="p-[26px]" className={isBest ? "border-accent shadow-[0_0_0_3px_rgba(31,122,133,.12)]" : ""}>
      <div className="flex items-center justify-between">
        <span className="font-display text-[20px] text-ink">Scenario {id}</span>
        {isBest && (
          <span className="font-mono text-[10px] tracking-[.06em] text-accent bg-accent-tint px-2 py-1 rounded-md">
            BEST OUTCOME
          </span>
        )}
      </div>
      <div className="flex items-end gap-2 mt-4">
        <span className="font-display text-[46px] leading-[.85] text-ink">
          <AnimatedNumber value={data.predicted} />
        </span>
        <span
          className="text-[12.5px] font-medium px-2.5 py-[3px] rounded-md mb-1.5"
          style={{ background: cat.bg, color: cat.fg }}
        >
          {cat.label}
        </span>
      </div>
      <div className="font-mono text-[11px] text-muted-4 mt-1">FORECAST AQI</div>
      <div className="flex flex-col gap-2.5 mt-4 pt-3.5 border-t border-border-divider text-[13px]">
        <div className="flex justify-between">
          <span className="text-muted-3">AQI prevented</span>
          <span className="text-success font-medium">−{Math.round(data.prevented)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-3">Daily cost</span>
          <span className="text-ink font-medium">₹{data.costCr}L</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-3">Confidence</span>
          <span className="text-ink font-medium">{data.confidence}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-3">Difficulty</span>
          <span className="text-ink font-medium">{data.difficulty}</span>
        </div>
      </div>
    </Card>
  );
}

export default function CompareScenarios({ slots, onSave }) {
  const filled = SLOTS.filter((s) => slots[s]);
  const best = filled.reduce((acc, s) => (!acc || slots[s].predicted < slots[acc].predicted ? s : acc), null);

  return (
    <section className="mt-16">
      <div className="flex items-end justify-between gap-3.5 flex-wrap">
        <SectionHeading eyebrow="09 · COMPARE SCENARIOS" title="Save & compare" />
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] text-muted-3">Save current as:</span>
          {SLOTS.map((id) => (
            <Button key={id} variant="ghost" size="sm" onClick={() => onSave(id)}>
              {id}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        {SLOTS.map((id) => (
          <SlotCard key={id} id={id} data={slots[id]} isBest={id === best && filled.length >= 2} />
        ))}
      </div>

      <AnimatePresence>
        {filled.length >= 2 && best && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2.5 mt-[18px] bg-success-bg border border-success/25 rounded-2xl px-5 py-4"
          >
            <CheckCircle2 size={18} className="text-success shrink-0" strokeWidth={1.9} />
            <div className="text-[15px] text-success font-medium">
              Scenario {best} delivers the lowest forecast AQI ({Math.round(slots[best].predicted)}) — the best
              outcome of the {filled.length} compared.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
