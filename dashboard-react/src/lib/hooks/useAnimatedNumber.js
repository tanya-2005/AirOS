import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

/**
 * Count-up hook built on Framer Motion's animate(), replacing the
 * hand-rolled requestAnimationFrame tween from the original static export.
 * Used by <AnimatedNumber> and any card/tile that needs a smooth counter.
 */
export function useAnimatedNumber(value, { duration = 0.5, decimals = 0 } = {}) {
  const [display, setDisplay] = useState(value ?? 0);
  const prevValue = useRef(value ?? 0);

  useEffect(() => {
    if (value == null || Number.isNaN(value)) return;
    const from = prevValue.current;
    const controls = animate(from, value, {
      duration,
      ease: [0.33, 1, 0.68, 1], // ease-out cubic, matches the source export's tween
      onUpdate: (v) => setDisplay(v),
    });
    prevValue.current = value;
    return () => controls.stop();
  }, [value, duration]);

  const factor = 10 ** decimals;
  return Math.round(display * factor) / factor;
}
