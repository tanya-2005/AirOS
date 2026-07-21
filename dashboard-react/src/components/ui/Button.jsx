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
  disabled,
  ...props
}) {
  const sizes = {
    sm: "px-3.5 py-2 text-[13px]",
    md: "px-[18px] py-[11px] text-[13.5px]",
  };

  return (
    <Comp
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { y: 0 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "inline-flex items-center gap-2 rounded-control font-medium",
        "transition-colors duration-200",
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
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
