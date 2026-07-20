import clsx from "clsx";

/** Thin wrapper so call sites read `cn(...)` — swap in tailwind-merge later if class collisions appear. */
export function cn(...args) {
  return clsx(...args);
}
