import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import AnimatedNumber from "../ui/AnimatedNumber";
import { Skeleton } from "../ui/Skeleton";
import SectionHeading from "../ui/SectionHeading";

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between bg-panel-nested rounded-xl px-[18px] py-4">
      <span className="text-[14px] text-[#D8DADE]">{label}</span>
      <span className="font-display text-[26px] text-white">{children}</span>
    </div>
  );
}

export default function AiPickPanel({ predictedAqi, prevented, confidence, costVsFullPct, isPending, onApply }) {
  return (
    <section className="mt-16">
      <SectionHeading eyebrow="08 · THE AI'S PICK" title="Recommended combination" />
      <Card dark hover={false} padding="p-9" className="mt-6 grid md:grid-cols-2 gap-11">
        <div>
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <Sparkles size={18} className="text-panel-accent" strokeWidth={1.6} />
              <span className="font-mono text-[11px] tracking-[.08em] text-panel-muted">OPTIMAL BALANCE</span>
            </div>
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-panel-accent">
              <motion.span
                animate={{ opacity: isPending ? [1, 0.35, 1] : 1 }}
                transition={{ duration: 1.2, repeat: isPending ? Infinity : 0 }}
                className="w-1.5 h-1.5 rounded-full bg-panel-accent"
              />
              {isPending ? "RECOMPUTING" : "SYNCED"}
            </span>
          </div>
          <h3 className="font-display text-[28px] leading-[1.2] mt-4 text-white">
            Target the two highest-leverage sources, not everything at once.
          </h3>
          <p className="text-[15.5px] leading-[1.55] text-[#9AA5AA] mt-4">
            The model recommends <strong className="text-white font-medium">suspending most construction</strong>{" "}
            and <strong className="text-white font-medium">enforcing waste-burning bans</strong>, paired with a{" "}
            <strong className="text-white font-medium">partial heavy-vehicle restriction</strong>. Together they
            capture most of the achievable reduction at a fraction of the cost of shutting everything down —
            because construction and waste burning are this station's real drivers right now.
          </p>
          <Button variant="dark" size="md" className="mt-[22px]" onClick={onApply}>
            Apply this combination
          </Button>
        </div>
        <div className="flex flex-col justify-center gap-3.5">
          <Row label="Predicted AQI">
            {predictedAqi == null ? <Skeleton className="h-6 w-16 bg-[#26292c]" /> : <span className="text-panel-accent"><AnimatedNumber value={predictedAqi} /></span>}
          </Row>
          <Row label="AQI prevented">
            {prevented == null ? <Skeleton className="h-6 w-16 bg-[#26292c]" /> : `−${Math.round(prevented)}`}
          </Row>
          <Row label="Confidence">{confidence == null ? "—" : <><AnimatedNumber value={confidence} />%</>}</Row>
          <Row label="Cost vs full shutdown">
            <span className="text-panel-accent">−<AnimatedNumber value={costVsFullPct ?? 0} />%</span>
          </Row>
        </div>
      </Card>
    </section>
  );
}
