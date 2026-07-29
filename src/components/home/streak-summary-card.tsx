"use client";

import { motion } from "framer-motion";
import { Flame, Trophy, CalendarCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { toBn } from "@/lib/date-bn";
import { cn } from "@/lib/utils";

interface StatsLite {
  streaks: { bestOverall: number; activeStreaks: number };
  perfectDays: number;
  today: { done: number; total: number; pct: number };
}

/**
 * Compact streak summary card showing key gamification metrics.
 * Displays active streaks, best streak, and perfect days with
 * animated count-up and color-coded intensity.
 */
export function StreakSummaryCard() {
  const { data: stats } = useQuery<StatsLite>({
    queryKey: ["stats"],
    queryFn: () => api.get<StatsLite>("/api/stats"),
    staleTime: 30_000,
  });

  const activeStreaks = stats?.streaks.activeStreaks ?? 0;
  const bestStreak = stats?.streaks.bestOverall ?? 0;
  const perfectDays = stats?.perfectDays ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="grid grid-cols-3 gap-2"
    >
      <StreakTile
        icon={<Flame size={16} />}
        value={activeStreaks}
        label="সক্রিয় স্ট্রিক"
        color="text-orange-500"
        bg="bg-orange-500/10"
      />
      <StreakTile
        icon={<Trophy size={16} />}
        value={bestStreak}
        label="সেরা স্ট্রিক"
        color="text-amber-500"
        bg="bg-amber-500/10"
      />
      <StreakTile
        icon={<CalendarCheck size={16} />}
        value={perfectDays}
        label="নিখুঁত দিন"
        color="text-violet-500"
        bg="bg-violet-500/10"
      />
    </motion.div>
  );
}

function StreakTile({
  icon,
  value,
  label,
  color,
  bg,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className={cn("flex flex-col items-center gap-1 rounded-2xl border p-3", bg)}
    >
      <div className={cn("flex items-center gap-1", color)}>
        {icon}
        <span className="tabular text-lg font-extrabold">{toBn(value)}</span>
      </div>
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
    </motion.div>
  );
}
