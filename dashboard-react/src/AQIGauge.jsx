import { CPCB_CATEGORIES, categoryFor } from "./data";

const CX = 110, CY = 110, R = 90;

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 180) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export default function AQIGauge({ value, label, size = 220 }) {
  const maxAqi = 500;
  const scale = size / 220;
  const needleAngle = Math.min(value, maxAqi) / maxAqi * 180;
  const needleTip = polarToCartesian(CX, CY, R - 14, needleAngle);
  const cat = categoryFor(value);

  return (
    <div className="flex flex-col items-center">
      <svg width={220 * scale} height={140 * scale} viewBox="0 0 220 140" className="overflow-visible">
        {/* band segments */}
        {CPCB_CATEGORIES.map((c, i) => {
          const startAngle = (c.range[0] / maxAqi) * 180;
          const endAngle = (Math.min(c.range[1], maxAqi) / maxAqi) * 180;
          return (
            <path
              key={i}
              d={arcPath(CX, CY, R, startAngle, endAngle)}
              stroke={c.color}
              strokeWidth={14}
              fill="none"
              strokeLinecap="butt"
              opacity={c.label === cat.label ? 1 : 0.35}
            />
          );
        })}
        {/* tick marks */}
        {[0, 100, 200, 300, 400, 500].map((t) => {
          const p1 = polarToCartesian(CX, CY, R + 10, (t / maxAqi) * 180);
          const p2 = polarToCartesian(CX, CY, R + 2, (t / maxAqi) * 180);
          return <line key={t} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#8993a1" strokeWidth={1} />;
        })}
        {/* needle */}
        <line x1={CX} y1={CY} x2={needleTip.x} y2={needleTip.y} stroke="#e7e2d6" strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={CX} cy={CY} r={5} fill="#e7e2d6" />
        {/* readout */}
        <text x={CX} y={CY - 20} textAnchor="middle" className="font-mono" fontSize={30} fill="#e7e2d6" fontWeight={600}>
          {Math.round(value)}
        </text>
        <text x={CX} y={CY - 2} textAnchor="middle" className="font-display" fontSize={11} fill={cat.color} fontWeight={600} letterSpacing={1}>
          {cat.label.toUpperCase()}
        </text>
      </svg>
      {label && <div className="text-xs text-inkMuted font-display tracking-wide mt-1">{label}</div>}
    </div>
  );
}
