"use client";

import { motion } from "framer-motion";
import { CalendarCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { toBn } from "@/lib/date-bn";
import { cn } from "@/lib/utils";

interface StatsLite {
  perfectDays: number;
  today: { done: number; total: number; pct: number };
}

/**
 * Daily completion streak indicator — shows the number of consecutive
 * days where ALL scheduled habits were completed (perfect days).
 *
 * This is a gamification badge that motivates users to maintain
 * their perfect-day streak. Shows:
 * - Current perfect-day count
 * - A flame icon that glows when the streak is active
 * - Motivational text based on the streak length
 */
export function DailyStreakBadge() {
  const { data: stats } = useQuery<StatsLite>({
    queryKey: ["stats"],
    queryFn: () => api.get<StatsLite>("/api/stats"),
    staleTime: 30_000,
  });

  const perfectDays = stats?.perfectDays ?? 0;
  const todayDone = stats?.today.done ?? 0;
  const todayTotal = stats?.today.total ?? 0;
  const todayPerfect = todayTotal > 0 && todayDone === todayTotal;

  if (perfectDays === 0 && !todayPerfect) return null;

  const message = getMessage(perfectDays);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
      className={cn(
        "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition",
        todayPerfect
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-muted text-muted-foreground",
      )}
    >
      <CalendarCheck
        size={14}
        className={cn(todayPerfect && "animate-pulse")}
        fill={todayPerfect ? "currentColor" : "none"}
      />
      <span>
        <span className="font-bold tabular">{toBn(perfectDays)}</span> নিখুঁত দিন
      </span>
      {todayPerfect && (
        <span className="text-[10px] opacity-80">• আজ সম্পূর্ণ!</span>
      )}
      {perfectDays >= 3 && !todayPerfect && (
        <span className="text-[10px] opacity-80">• {message}</span>
      )}
    </motion.div>
  );
}

function getMessage(streak: number): string {
  if (streak >= 30) return "অবিশ্বাস্য!";
  if (streak >= 14) return "অসাধারণ ধারা!";
  if (streak >= 7) return "এক সপ্তাহ!";
  if (streak >= 3) return "চালিয়ে যান!";
  return "";
}
