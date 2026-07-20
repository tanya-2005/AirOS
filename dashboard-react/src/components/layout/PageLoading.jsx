import { SkeletonCard } from "../ui/Skeleton";

/** Route-level Suspense fallback while a lazy-loaded page chunk downloads. */
export default function PageLoading() {
  return (
    <main className="max-w-content mx-auto px-5 md:px-10 py-24 flex-1 w-full">
      <SkeletonCard lines={6} />
    </main>
  );
}
