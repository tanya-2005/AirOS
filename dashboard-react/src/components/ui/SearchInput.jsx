import { Search } from "lucide-react";
import { cn } from "../../lib/utils/cn";

export default function SearchInput({ className, ...props }) {
  return (
    <label
      className={cn(
        "flex items-center gap-2 bg-search border border-border-nav rounded-[10px] px-3 py-2 w-[200px]",
        "transition-[border-color,background,box-shadow] duration-200",
        "focus-within:border-accent focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(31,122,133,.10)]",
        className
      )}
    >
      <Search size={16} className="text-muted-4 shrink-0" />
      <input
        className="text-[13.5px] text-ink w-full border-none bg-transparent outline-none placeholder:text-muted-4"
        {...props}
      />
    </label>
  );
}
