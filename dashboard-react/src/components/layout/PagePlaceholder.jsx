import { motion } from "framer-motion";
import { Construction } from "lucide-react";
import SectionHeading from "../ui/SectionHeading";
import Badge from "../ui/Badge";
import { fadeUp } from "../../lib/motion";

/**
 * Honest "not built yet" state for a route whose milestone hasn't landed —
 * used only during incremental build-out, never shown with fake data
 * standing in for real content. Swapped for the real page as each
 * milestone ships (see the implementation plan).
 */
export default function PagePlaceholder({ eyebrow, title, description, milestone }) {
  return (
    <main className="max-w-content mx-auto px-5 md:px-10 py-24 flex-1 w-full">
      <motion.div initial="hidden" animate="show" variants={fadeUp} className="max-w-[640px]">
        <SectionHeading eyebrow={eyebrow} title={title} description={description} />
        <div className="mt-8 flex items-center gap-3 rounded-card border border-border bg-surface p-5">
          <div className="w-10 h-10 rounded-[10px] bg-search flex items-center justify-center shrink-0">
            <Construction size={18} className="text-muted-3" strokeWidth={1.8} />
          </div>
          <div>
            <div className="text-[14px] text-ink font-medium">In active development</div>
            <div className="text-[13px] text-muted-1 mt-0.5">
              This page is scheduled as <Badge tone="accent">{milestone}</Badge> in the build plan — not yet
              wired to live data.
            </div>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
