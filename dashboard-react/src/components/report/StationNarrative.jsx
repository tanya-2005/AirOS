import { motion } from "framer-motion";
import Card from "../ui/Card";
import { categoryFor } from "../../lib/aqi";
import { stationNarrative } from "../../lib/report";
import { fadeUp } from "../../lib/motion";

export default function StationNarrative({ station, forecast, enforcementForStation }) {
  const cat = categoryFor(station.aqi);
  const text = stationNarrative(station, forecast, enforcementForStation);

  return (
    <motion.div variants={fadeUp}>
      <Card padding="p-7" hover>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-[21px] text-ink">{station.station}</h3>
          </div>
          <span
            className="text-[12px] font-medium px-2.5 py-1 rounded-[7px] shrink-0"
            style={{ background: cat.bg, color: cat.color }}
          >
            {Math.round(station.aqi)} · {cat.label}
          </span>
        </div>
        <p className="text-[14.5px] leading-[1.6] text-muted-1 mt-3.5">{text}</p>
      </Card>
    </motion.div>
  );
}
