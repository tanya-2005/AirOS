import { useAnimatedNumber } from "../../lib/hooks/useAnimatedNumber";

export default function AnimatedNumber({ value, decimals = 0, prefix = "", suffix = "", duration = 0.5 }) {
  const display = useAnimatedNumber(value, { duration, decimals });
  return (
    <>
      {prefix}
      {display.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </>
  );
}
