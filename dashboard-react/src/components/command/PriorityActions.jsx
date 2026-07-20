import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import LinkButton from "../ui/LinkButton";
import { sourceMeta, PERMIT_TONE } from "../../lib/sources";
import { staggerContainer, fadeUp } from "../../lib/motion";

function ActionRow({ item, last }) {
  const meta = sourceMeta(item.source_type);
  const permitTone = PERMIT_TONE[item.permit_status] || "muted";
  const Icon = meta.Icon;

  return (
    <motion.div
      variants={fadeUp}
      className={`flex items-start gap-4 px-5 py-4 ${!last ? "border-b border-border-divider" : ""}`}
    >
      <div className="w-9 h-9 rounded-chip bg-search flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={16} strokeWidth={1.8} className="text-muted-2" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[14px] font-medium text-ink">{item.source_name}</span>
          <Badge tone={permitTone}>{item.permit_status}</Badge>
        </div>
        <div className="text-[12.5px] text-muted-2 mt-1">{item.action}</div>
        <div className="text-[11.5px] text-muted-4 mt-1 font-mono">
          {item.station} · {item.distance_km}km · last inspected {item.evidence?.last_inspection_days_ago}d ago
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[14px] font-medium text-success font-mono">
          −{item.expected_aqi_improvement_pct}%
        </div>
        <div className="text-[10.5px] text-muted-4 mt-0.5">projected AQI</div>
      </div>
    </motion.div>
  );
}

export default function PriorityActions({ items, limit = 5 }) {
  const top = items.slice(0, limit);

  return (
    <Card padding="p-0" hover={false} className="overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-divider bg-search/50">
        <div className="flex items-center gap-2">
          <ShieldAlert size={16} className="text-danger" strokeWidth={1.8} />
          <span className="font-mono text-[11px] tracking-[.08em] text-muted-2 uppercase">
            Top priority · {items.length} total
          </span>
        </div>
        <LinkButton to="/attribution" variant="ghost" size="sm">
          View all
        </LinkButton>
      </div>
      <motion.div initial="hidden" animate="show" variants={staggerContainer}>
        {top.map((item, i) => (
          <ActionRow key={`${item.source_id}-${item.station}`} item={item} last={i === top.length - 1} />
        ))}
      </motion.div>
    </Card>
  );
}
