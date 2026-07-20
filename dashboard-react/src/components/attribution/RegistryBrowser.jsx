import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import SearchInput from "../ui/SearchInput";
import { cn } from "../../lib/utils/cn";
import { sourceMeta, PERMIT_TONE, SOURCE_META } from "../../lib/sources";
import { staggerContainer, fadeUp } from "../../lib/motion";

const TYPE_FILTERS = ["all", ...Object.keys(SOURCE_META)];

function RegistryRow({ record, last }) {
  const meta = sourceMeta(record.source_type);
  const Icon = meta.Icon;

  return (
    <motion.div
      variants={fadeUp}
      className={cn(
        "flex items-center gap-3.5 px-5 py-3.5",
        !last && "border-b border-border-divider"
      )}
    >
      <div className="w-8 h-8 rounded-chip bg-search flex items-center justify-center shrink-0">
        <Icon size={14} strokeWidth={1.8} className="text-muted-2" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-medium text-ink truncate">{record.registered_name}</div>
        <div className="text-[11.5px] text-muted-3 font-mono mt-0.5">
          {record.id} · {record.ward}
        </div>
      </div>
      <span className={cn("w-[7px] h-[7px] rounded-full shrink-0", record.active ? "bg-success" : "bg-muted-5")} />
      <Badge tone={PERMIT_TONE[record.permit_status] || "muted"} className="shrink-0">
        {record.permit_status}
      </Badge>
      <span className="text-[11.5px] text-muted-4 font-mono shrink-0 hidden sm:inline w-[92px] text-right">
        {record.last_inspection_days_ago}d ago
      </span>
    </motion.div>
  );
}

export default function RegistryBrowser({ records }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((r) => {
      if (typeFilter !== "all" && r.source_type !== typeFilter) return false;
      if (!q) return true;
      return (
        r.registered_name.toLowerCase().includes(q) ||
        r.ward.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    });
  }, [records, query, typeFilter]);

  return (
    <Card padding="p-0" hover={false} className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border-divider bg-search/50">
        <div className="flex flex-wrap gap-1.5">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                "px-2.5 py-1.5 rounded-full text-[11.5px] font-mono uppercase tracking-wide border transition-colors duration-150 cursor-pointer",
                typeFilter === t ? "bg-ink text-white border-ink" : "bg-white text-muted-2 border-border hover:border-border-hover"
              )}
            >
              {t === "all" ? "All" : sourceMeta(t).label}
            </button>
          ))}
        </div>
        <SearchInput
          placeholder="Search registry…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:w-[220px]"
        />
      </div>

      <div className="max-h-[460px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-[13.5px] text-muted-3">No registry records match.</div>
        ) : (
          <motion.div initial="hidden" animate="show" variants={staggerContainer}>
            {filtered.map((r, i) => (
              <RegistryRow key={r.id} record={r} last={i === filtered.length - 1} />
            ))}
          </motion.div>
        )}
      </div>

      <div className="px-5 py-3 border-t border-border-divider text-[11.5px] font-mono text-muted-4 bg-search/30">
        {filtered.length} of {records.length} registry sources
      </div>
    </Card>
  );
}
