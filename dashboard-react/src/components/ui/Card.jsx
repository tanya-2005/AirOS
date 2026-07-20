import { motion } from "framer-motion";
import { cn } from "../../lib/utils/cn";

/**
 * Base card primitive — white surface, 1px border, large radius, optional
 * hover lift (translateY + shadow, matches the source export's `.lift`).
 * `dark` renders the near-black hero/prediction-panel variant instead.
 */
export default function Card({
  as: Comp = motion.div,
  dark = false,
  hover = true,
  padding = "p-6",
  className,
  children,
  ...props
}) {
  return (
    <Comp
      whileHover={hover ? { y: -2, boxShadow: "0 14px 40px -22px rgba(20,22,24,.24)" } : undefined}
      transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
      className={cn(
        "rounded-card border",
        padding,
        dark
          ? "bg-panel border-panel text-white shadow-panel"
          : "bg-surface border-border",
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}
