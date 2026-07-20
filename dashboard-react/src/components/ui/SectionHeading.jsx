import { cn } from "../../lib/utils/cn";

/**
 * Mono uppercase eyebrow + serif H2 — the section-intro pattern used
 * throughout the source export ("02 · INTERVENTION CONTROLS" / "Adjust the levers").
 */
export default function SectionHeading({ eyebrow, title, description, className, right }) {
  return (
    <div className={cn("flex items-end justify-between gap-4 flex-wrap", className)}>
      <div>
        {eyebrow && (
          <div className="font-mono text-[12px] tracking-[.14em] text-accent uppercase">
            {eyebrow}
          </div>
        )}
        {title && (
          <h2 className="font-display font-normal text-[30px] md:text-[34px] leading-[1.05] tracking-[-.015em] mt-2 text-ink">
            {title}
          </h2>
        )}
        {description && <p className="text-[15px] text-muted-1 mt-2 max-w-[620px]">{description}</p>}
      </div>
      {right}
    </div>
  );
}
