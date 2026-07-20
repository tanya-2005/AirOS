import { cn } from "../../lib/utils/cn";

/** Shimmering placeholder block for loading states — never shown alongside real data, only in place of it. */
export function Skeleton({ className }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[#F1EFEA] rounded-md",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent",
        "before:animate-shimmer",
        className
      )}
    />
  );
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="rounded-card border border-border bg-surface p-6">
      <Skeleton className="h-3 w-24 mb-4" />
      <Skeleton className="h-8 w-32 mb-5" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-full mb-2" />
      ))}
    </div>
  );
}

export function SkeletonText({ width = "w-full" }) {
  return <Skeleton className={cn("h-3", width)} />;
}
