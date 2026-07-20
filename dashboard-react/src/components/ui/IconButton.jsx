import { motion } from "framer-motion";
import { cn } from "../../lib/utils/cn";

export default function IconButton({ children, dot = false, className, ...props }) {
  return (
    <motion.button
      whileHover={{ backgroundColor: "#F1EEE9" }}
      transition={{ duration: 0.18 }}
      className={cn(
        "relative w-[38px] h-[38px] rounded-[10px] flex items-center justify-center cursor-pointer text-ink",
        className
      )}
      {...props}
    >
      {children}
      {dot && (
        <span className="absolute top-[7px] right-[8px] w-[7px] h-[7px] rounded-full bg-danger border-[1.5px] border-bg" />
      )}
    </motion.button>
  );
}
