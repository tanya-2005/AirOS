import { motion } from "framer-motion";
import { cn } from "../../lib/utils/cn";

const VARIANTS = {
  primary: "bg-ink text-white border border-ink hover:bg-[#0d0f11]",
  ghost: "bg-white text-ink border border-border hover:bg-search hover:border-border-hover",
  dark: "bg-white text-ink border border-transparent hover:bg-[#f2f2f0]",
};

/**
 * Primary CTA / ghost secondary button, matching the source export's
 * `.btn` / `.ghost` classes (background+transform+shadow transition on hover).
 */
export default function Button({
  as: Comp = motion.button,
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  ...props
}) {
  const sizes = {
    sm: "px-3.5 py-2 text-[13px]",
    md: "px-[18px] py-[11px] text-[13.5px]",
  };

  return (
    <Comp
      whileHover={{ y: -1 }}
      whileTap={{ y: 0 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "inline-flex items-center gap-2 rounded-control font-medium cursor-pointer",
        "transition-colors duration-200",
        VARIANTS[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </Comp>
  );
}
