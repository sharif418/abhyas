"use client";

import { motion } from "framer-motion";
import { Snowflake, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { toBn, getISOWeekKey } from "@/lib/date-bn";
import { cn } from "@/lib/utils";

interface HabitLite {
  id: string;
  name: string;
  streak: number;
  frozenDate: string | null;
  freezeUsedWeek: string | null;
}

/**
 * Streak freeze availability indicator — shows how many streak freezes
 * are still available this week.
 *
 * Rules (from the existing freeze system):
 * - Each habit gets 1 freeze per ISO week
 * - Freezes are used when a habit's streak is at risk (≥3 days)
 * - This card shows: total habits, freezes used, freezes available
 */
export function StreakFreezeIndicator() {
  const { data: habits } = useQuery<HabitLite[]>({
    queryKey: ["habits"],
    queryFn: () => api.get<HabitLite[]>("/api/habits"),
    staleTime: 30_000,
  });

  if (!habits || habits.length === 0) return null;

  const currentWeek = getISOWeekKey(new Date());
  const usedFreezes = habits.filter((h) => h.freezeUsedWeek === currentWeek).length;
  const totalHabits = habits.length;
  const availableFreezes = totalHabits - usedFreezes;
  const atRiskHabits = habits.filter((h) => h.streak >= 3 && !h.frozenDate).length;

  // Don't show if no habits have streaks ≥3 (freezes only matter for at-risk habits)
  if (atRiskHabits === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-2xl border bg-gradient-to-br from-sky-50 to-card dark:from-sky-950/30 dark:to-card p-4 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-500">
          <Snowflake size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">স্ট্রিক ফ্রিজ</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold",
                availableFreezes > 0
                  ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {toBn(availableFreezes)} টি বাকি
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Info size={11} />
            <span>
              {usedFreezes > 0
                ? `এই সপ্তাহে ${toBn(usedFreezes)} টি ব্যবহৃত`
                : "এই সপ্তাহে কোনো ফ্রিজ ব্যবহৃত হয়নি"}
            </span>
          </div>
        </div>
      </div>

      {/* At-risk habits count */}
      {atRiskHabits > 0 && availableFreezes > 0 && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          {toBn(atRiskHabits)} টি অভ্যাস ঝুঁকিতে — ফ্রিজ ব্যবহার করতে পারেন
        </div>
      )}
    </motion.div>
  );
}
