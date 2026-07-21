import { motion } from "framer-motion";
import { Trophy, AlertOctagon, TrendingDown, ShieldAlert } from "lucide-react";

import Card from "../ui/Card";
import Badge from "../ui/Badge";
import { fadeUp, staggerContainer } from "../../lib/motion";
import { EMERGENCY_TONE } from "../../lib/healthAdvisory";
import { bestPerformingCity, worstPerformingCity, improvingCities, criticalCities } from "../../lib/cityComparison";

/**
 * Best/Worst Performing City + Improving Cities + Cities Requiring Immediate
 * Attention — all derived from the same /api/cities/compare rows the
 * rankings table uses (current AQI, 24h forecast, emergency level), no
 * separate metric or backend call. Shared by the City Comparison page and
 * the Intelligence Report's Multiple Cities / National Comparison modes.
 */
export default function CityTrendAnalysis({ rows }) {
  const best = bestPerformingCity(rows);
  const worst = worstPerformingCity(rows);
  const improving = improvingCities(rows);
  const critical = criticalCities(rows);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={staggerContainer}
      className="grid grid-cols-1 md:grid-cols-2 gap-6"
    >
      <motion.div variants={fadeUp}>
        <TrendCard
          icon={<Trophy size={18} className="text-success" strokeWidth={1.8} />}
          title="Best performing city"
          city={best}
        />
      </motion.div>
      <motion.div variants={fadeUp}>
        <TrendCard
          icon={<AlertOctagon size={18} className="text-danger" strokeWidth={1.8} />}
          title="Worst performing city"
          city={worst}
        />
      </motion.div>
      <motion.div variants={fadeUp}>
        <TrendListCard
          icon={<TrendingDown size={18} className="text-success" strokeWidth={1.8} />}
          title="Improving cities (24h forecast trending down)"
          rows={improving}
          emptyLabel="No city's forecast currently trends below its current AQI."
        />
      </motion.div>
      <motion.div variants={fadeUp}>
        <TrendListCard
          icon={<ShieldAlert size={18} className="text-hazard" strokeWidth={1.8} />}
          title="Cities requiring immediate attention"
          rows={critical}
          emptyLabel="None currently at Severe or Emergency level."
          showEmergency
        />
      </motion.div>
    </motion.div>
  );
}

function TrendCard({ icon, title, city }) {
  return (
    <Card padding="p-6">
      <div className="flex items-center gap-2.5">
        {icon}
        <span className="text-[13px] font-mono uppercase tracking-wider text-muted-2">{title}</span>
      </div>
      {city ? (
        <>
          <div className="font-display text-[28px] text-ink mt-3">{city.label}</div>
          <div className="text-[13px] text-muted-2 mt-1">
            AQI {Math.round(city.current_aqi)} · {city.emergency_level} emergency level
          </div>
        </>
      ) : (
        <div className="text-[14px] text-muted-2 mt-3">No cities with live data yet.</div>
      )}
    </Card>
  );
}

function TrendListCard({ icon, title, rows, emptyLabel = "None right now.", showEmergency = false }) {
  return (
    <Card padding="p-6">
      <div className="flex items-center gap-2.5">
        {icon}
        <span className="text-[13px] font-mono uppercase tracking-wider text-muted-2">{title}</span>
      </div>
      {rows.length ? (
        <ul className="mt-3.5 flex flex-col gap-2.5">
          {rows.map((r) => (
            <li key={r.city} className="flex items-center justify-between text-[14px] gap-3">
              <span className="text-ink">{r.label}</span>
              {showEmergency ? (
                <Badge tone={EMERGENCY_TONE[r.emergency_level]}>{r.emergency_level}</Badge>
              ) : (
                <span className="font-mono text-[12px] text-muted-2 tabular-nums">
                  {Math.round(r.current_aqi)} → {r.forecast_aqi != null ? Math.round(r.forecast_aqi) : "—"}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-[14px] text-muted-2 mt-3">{emptyLabel}</div>
      )}
    </Card>
  );
}
