import { motion } from "framer-motion";
import Card from "../ui/Card";

/**
 * Stylized, illustrative "city response" heat sketch — NOT the real
 * geodata map (that's the City Intelligence Map page, M4, backed by
 * MapLibre + real station/registry coordinates). This is a lightweight
 * visual cue that hotspots cool down as the scenario improves.
 */
export default function CityResponseMap({ reductionFraction = 0, hotspotCount }) {
  const frac = Math.min(1, Math.max(0, reductionFraction));
  const heatOpacity = Math.max(0.12, 1 - frac * 0.9);
  const hs1Opacity = Math.max(0.15, 1 - frac);
  const hs2Opacity = Math.max(0.15, 1 - frac * 1.2);
  const label = hotspotCount != null ? `${hotspotCount} hotspot${hotspotCount === 1 ? "" : "s"}` : frac > 0.75 ? "0 hotspots" : frac > 0.4 ? "1 hotspot" : "2 hotspots";
  const labelColor = frac > 0.75 ? "#2E7D52" : "#B7502C";

  return (
    <Card padding="p-4">
      <div className="flex items-center justify-between mb-3 px-1.5">
        <span className="font-mono text-[11px] tracking-[.08em] text-muted-3">05 · CITY RESPONSE</span>
        <span className="font-mono text-[11px]" style={{ color: labelColor }}>
          {label}
        </span>
      </div>
      <svg
        viewBox="0 0 340 200"
        className="w-full h-auto rounded-xl"
        style={{ background: "linear-gradient(180deg,#F7F5F1,#F1EFEA)" }}
      >
        <defs>
          <pattern id="scMapGrid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M28 0H0V28" fill="none" stroke="#E7E4DE" strokeWidth="1" />
          </pattern>
          <radialGradient id="scMapHeat" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#B23B4E" stopOpacity=".45" />
            <stop offset="100%" stopColor="#B23B4E" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="340" height="200" fill="url(#scMapGrid)" />
        <path d="M40 30 L120 24 L150 80 L100 120 L36 100 Z" fill="#EFEDE7" stroke="#E2DFD8" strokeWidth="1" />
        <path d="M150 80 L230 50 L300 90 L260 150 L170 140 Z" fill="#F3E7DF" stroke="#EBD9CE" strokeWidth="1" />
        <path d="M100 120 L170 140 L150 185 L70 180 Z" fill="#F6EEE6" stroke="#ECDFCF" strokeWidth="1" />
        <motion.g animate={{ opacity: heatOpacity }} transition={{ duration: 0.5 }}>
          <circle cx="215" cy="90" r="70" fill="url(#scMapHeat)" />
          <circle cx="245" cy="120" r="55" fill="url(#scMapHeat)" />
        </motion.g>
        <motion.circle
          cx="215"
          cy="90"
          r="9"
          fill="#B23B4E"
          stroke="#fff"
          strokeWidth="2.5"
          animate={{ opacity: hs1Opacity }}
          transition={{ duration: 0.5 }}
        />
        <motion.circle
          cx="245"
          cy="120"
          r="8"
          fill="#D4663B"
          stroke="#fff"
          strokeWidth="2.5"
          animate={{ opacity: hs2Opacity }}
          transition={{ duration: 0.5 }}
        />
        <circle cx="80" cy="70" r="7" fill="#4CAF7D" stroke="#fff" strokeWidth="2.5" />
        <circle cx="110" cy="150" r="7" fill="#E0A83B" stroke="#fff" strokeWidth="2.5" />
      </svg>
    </Card>
  );
}
