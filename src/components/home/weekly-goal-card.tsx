"use client";

import { motion } from "framer-motion";
import { Target, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { toBn } from "@/lib/date-bn";
import { cn } from "@/lib/utils";

interface StatsLite {
  weekly: { done: number; scheduled: number; rate: number };
  today: { done: number; total: number };
}

/**
 * Weekly goal progress card — shows the user's weekly completion
 * progress with a visual bar and motivational message.
 *
 * Uses the /api/stats `weekly` data (done/scheduled/rate).
 */
export function WeeklyGoalCard() {
  const { data: stats } = useQuery<StatsLite>({
    queryKey: ["stats"],
    queryFn: () => api.get<StatsLite>("/api/stats"),
    staleTime: 30_000,
  });

  const done = stats?.weekly.done ?? 0;
  const scheduled = stats?.weekly.scheduled ?? 0;
  const rate = stats?.weekly.rate ?? 0;
  const pct = Math.round(rate * 100);

  const message = getMessage(pct);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="rounded-2xl border bg-gradient-to-br from-primary/5 via-card to-card p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Target size={16} className="text-primary" />
          সাপ্তাহিক লক্ষ্য
        </h3>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold",
            pct >= 80
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : pct >= 50
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "bg-muted text-muted-foreground",
          )}
        >
          {toBn(pct)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={cn(
            "h-full rounded-full",
            pct >= 80
              ? "bg-gradient-to-r from-emerald-500 to-teal-500"
              : pct >= 50
                ? "bg-gradient-to-r from-amber-500 to-orange-500"
                : "bg-gradient-to-r from-primary to-teal-500",
          )}
        />
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <Check size={14} className="text-emerald-500" />
          <span className="tabular font-medium">
            {toBn(done)} / {toBn(scheduled)} সম্পন্ন
          </span>
        </div>
        <span className="text-muted-foreground">{message}</span>
      </div>
    </motion.div>
  );
}

function getMessage(pct: number): string {
  if (pct >= 100) return "অসাধারণ! লক্ষ্য অর্জন!";
  if (pct >= 80) return "প্রায় শেষ! চালিয়ে যান";
  if (pct >= 50) return "অর্ধেক পথ পার হয়েছে";
  if (pct >= 25) return "ভালো শুরু! চালিয়ে যান";
  if (pct > 0) return "শুরু করুন — প্রতিটি ধাপ গুরুত্বপূর্ণ";
  return "এই সপ্তাহে শুরু করুন";
}
