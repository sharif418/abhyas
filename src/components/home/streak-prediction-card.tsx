"use client";

import { motion } from "framer-motion";
import { Flame, TrendingUp, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { toBn, getBengaliWeekdayShort } from "@/lib/date-bn";
import { cn } from "@/lib/utils";

interface StatsLite {
  streaks: { bestOverall: number; activeStreaks: number };
}

interface HabitLite {
  id: string;
  name: string;
  streak: number;
  bestStreak: number;
  color: string;
}

const MILESTONES = [7, 14, 30, 60, 100, 180, 365];

/**
 * Streak prediction widget — shows the user's top habit streaks and
 * predicts when they'll reach their next milestone.
 *
 * Calculates the next milestone for each habit and shows:
 * - Current streak
 * - Next milestone (e.g., "৭ দিন বাকি ৩০ দিনের জন্য")
 * - Estimated date to reach it
 */
export function StreakPredictionCard() {
  const { data: stats } = useQuery<StatsLite>({
    queryKey: ["stats"],
    queryFn: () => api.get<StatsLite>("/api/stats"),
    staleTime: 30_000,
  });

  const { data: habits } = useQuery<HabitLite[]>({
    queryKey: ["habits"],
    queryFn: () => api.get<HabitLite[]>("/api/habits"),
    staleTime: 30_000,
  });

  if (!habits || habits.length === 0) return null;

  // Get top 3 active streaks
  const topStreaks = habits
    .filter((h) => h.streak > 0)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 3);

  if (topStreaks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl border bg-card p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <TrendingUp size={16} className="text-primary" />
          স্ট্রিক পূর্বাভাস
        </h3>
        <span className="text-[10px] text-muted-foreground">
          পরবর্তী মাইলস্টোন
        </span>
      </div>
      <div className="space-y-2.5">
        {topStreaks.map((habit) => {
          const nextMilestone = MILESTONES.find((m) => m > habit.streak);
          if (!nextMilestone) {
            return (
              <PredictionRow
                key={habit.id}
                name={habit.name}
                color={habit.color}
                current={habit.streak}
                milestone={null}
                daysLeft={0}
                dateStr="অর্জিত!"
              />
            );
          }
          const daysLeft = nextMilestone - habit.streak;
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() + daysLeft);
          const dateStr = `${getBengaliWeekdayShort(targetDate)}, ${toBn(targetDate.getDate())}`;

          return (
            <PredictionRow
              key={habit.id}
              name={habit.name}
              color={habit.color}
              current={habit.streak}
              milestone={nextMilestone}
              daysLeft={daysLeft}
              dateStr={dateStr}
            />
          );
        })}
      </div>
    </motion.div>
  );
}

function PredictionRow({
  name,
  color,
  current,
  milestone,
  daysLeft,
  dateStr,
}: {
  name: string;
  color: string;
  current: number;
  milestone: number | null;
  daysLeft: number;
  dateStr: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${color}20`, color }}
      >
        <Flame size={15} fill="currentColor" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-medium">{name}</span>
          <span className="shrink-0 tabular text-xs font-bold" style={{ color }}>
            {toBn(current)} দিন
          </span>
        </div>
        {milestone ? (
          <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
            <span>
              {toBn(daysLeft)} দিন বাকি <span className="font-medium">{toBn(milestone)} দিনের</span> জন্য
            </span>
            <span className="flex items-center gap-0.5">
              <Calendar size={10} />
              {dateStr}
            </span>
          </div>
        ) : (
          <div className="mt-0.5 text-[10px] font-medium text-emerald-500">
            {dateStr}
          </div>
        )}
      </div>
    </div>
  );
}
