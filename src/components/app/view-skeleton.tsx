"use client";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton fallback shown while a lazy-loaded view chunk is downloading.
 * Mirrors the visual structure of a typical view (title + hero card + grid)
 * so the layout doesn't jump when the real view hydrates.
 *
 * Used by `next/dynamic` `loading:` in `view-router.tsx`.
 */
export function ViewSkeleton() {
  return (
    <div
      className="mx-auto max-w-5xl space-y-4 px-4 py-5"
      role="status"
      aria-label="ভিউ লোড হচ্ছে"
      aria-live="polite"
    >
      <div className="space-y-1.5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
      <Skeleton className="h-28 rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-56 rounded-3xl" />
      <Skeleton className="h-40 rounded-3xl" />
      <span className="sr-only">অনুগ্রহ করে অপেক্ষা করুন…</span>
    </div>
  );
}
