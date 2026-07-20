import { cn } from "../../lib/utils/cn";

export default function Avatar({ initials = "?", size = 34, className }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        "rounded-full bg-accent text-white flex items-center justify-center font-display text-[15px] cursor-pointer select-none",
        className
      )}
    >
      {initials}
    </div>
  );
}
