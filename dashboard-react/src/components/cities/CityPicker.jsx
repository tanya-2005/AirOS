import { cn } from "../../lib/utils/cn";

/** Inline checkbox row for picking a subset of cities — used by the Intelligence Report's Multiple Cities mode. */
export default function CityPicker({ cities, selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {cities.map((c) => {
        const checked = selected.includes(c.id);
        return (
          <button
            key={c.id}
            type="button"
            role="checkbox"
            aria-checked={checked}
            onClick={() => onToggle(c.id)}
            className={cn(
              "inline-flex items-center gap-2 px-3.5 py-2 rounded-control border text-[13px] font-medium transition-colors duration-150 cursor-pointer",
              checked ? "bg-ink text-white border-ink" : "bg-white text-ink border-border hover:border-border-hover"
            )}
          >
            <span
              className={cn(
                "w-[14px] h-[14px] rounded-[4px] border flex items-center justify-center shrink-0",
                checked ? "bg-white border-white" : "border-border-hover"
              )}
            >
              {checked && <span className="w-[6px] h-[6px] rounded-[1.5px] bg-ink" />}
            </span>
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
