"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Target } from "lucide-react";
import { api } from "@/lib/api-client";
import { toBn } from "@/lib/date-bn";
import { useUIStore } from "@/stores/ui-store";
import type { GoalsResponse } from "@/types/goals";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * GoalsSummaryCard — Home's window into the লক্ষ্য system: overall progress,
 * top active goals with mini bars, and due-soon warnings. Tap → লক্ষ্য view.
 */
export function GoalsSummaryCard() {
  const setView = useUIStore((s) => s.setView);
  const { data, isLoading } = useQuery<GoalsResponse>({
    queryKey: ["goals"],
    queryFn: () => api.get<GoalsResponse>("/api/goals"),
    staleTime: 60_000,
  });

  if (isLoading) {
    return <Skeleton className="h-32 rounded-2xl" />;
  }

  const active = (data?.goals ?? []).filter((g) => g.active && !g.completedAt);
  if (active.length === 0) return null;

  const summary = data!.summary;
  const top = [...active]
    .sort((a, b) => b.currentValue / b.targetValue - a.currentValue / a.targetValue)
    .slice(0, 3);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      aria-labelledby="goals-summary-title"
      className="rounded-2xl border bg-card p-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h2 id="goals-summary-title" className="flex items-center gap-2 text-sm font-bold">
          <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Target className="size-4" aria-hidden />
          </span>
          চলমান লক্ষ্য
          <span className="text-xs font-normal text-muted-foreground">
            ({toBn(summary.active)}টি)
          </span>
        </h2>
        <button
          type="button"
          onClick={() => setView("goals")}
          className="focus-visible:ring-ring/70 inline-flex items-center gap-0.5 rounded-lg text-xs font-semibold text-primary transition hover:underline focus-visible:ring-2 focus-visible:outline-none"
        >
          সব দেখুন
          <ArrowRight className="size-3.5" aria-hidden />
        </button>
      </div>

      <ul className="mt-3 space-y-2.5">
        {top.map((g) => {
          const pct = Math.min(100, Math.round((g.currentValue / g.targetValue) * 100));
          return (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => setView("goals")}
                className="focus-visible:ring-ring/70 w-full rounded-lg text-left focus-visible:ring-2 focus-visible:outline-none"
              >
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-medium">{g.title}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {toBn(Math.round(g.currentValue))}/{toBn(Math.round(g.targetValue))} {g.unit}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: g.color }}
                  />
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {(summary.overdue > 0 || summary.dueSoon > 0) && (
        <p className="mt-2.5 text-[10px] text-muted-foreground">
          {summary.overdue > 0
            ? `⚠ ${toBn(summary.overdue)}টি লক্ষ্যের সময় পার হয়েছে — আজই এগোন।`
            : `${toBn(summary.dueSoon)}টি লক্ষ্য শীঘ্রই শেষ হবে।`}
        </p>
      )}
    </motion.section>
  );
}
