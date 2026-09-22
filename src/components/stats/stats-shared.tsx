"use client";

import { motion } from "framer-motion";
import { ProgressRing } from "@/components/shared/progress-ring";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { AnimatedNumber } from "@/components/shared/celebration";
import { levelTitle } from "@/lib/gamification";
import { toBn } from "@/lib/date-bn";
import type { GamificationState } from "@/types";
import type { InsightsData } from "@/components/stats/weekly-insights";
import type { MonthlyTrendPoint } from "@/components/stats/monthly-trend-chart";
import type { MoodPoint } from "@/components/stats/mood-trend-chart";
import type { MoodCorrelation } from "@/components/stats/mood-correlation-card";

/* ------------------------------------------------------------------ */
/*  Shared types — single source of truth for GET /api/stats payload  */
/* ------------------------------------------------------------------ */

/** Badge progress counters powering the locked-badge progress bars. */
export interface BadgeStatsData {
  totalCompletions: number;
  bestStreak: number;
  currentStreak: number;
  habitsTracked: number;
  perfectDays: number;
  fajrStreak: number;
  quranPages: number;
  fastingDays: number;
  level: number;
}

export interface BadgeSummary {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
  earned: boolean;
  earnedAt: string | null;
}

/** Shape of GET /api/stats — consumed by StatsView tabs and Home cards. */
export interface StatsResponse {
  user: { name: string; xp: number; level: number; levelTitle: string; city: string };
  gamification: GamificationState;
  today: { done: number; total: number; pct: number };
  streaks: { bestOverall: number; activeStreaks: number };
  weekly: { done: number; scheduled: number; rate: number };
  perfectDays: number;
  dailySeries: { date: string; count: number }[];
  categories: { category: string; habits: number; doneToday: number }[];
  badges: BadgeSummary[];
  prayersDone: number;
  quranPages: number;
  quranSessions: number;
  habitsCount: number;
  insights: InsightsData;
  monthlyTrend: MonthlyTrendPoint[];
  mood: {
    series: MoodPoint[];
    average: number;
    today: { mood: number; note: string | null } | null;
  };
  moodCorrelations: MoodCorrelation[];
  yearlyHeatmap: { date: string; count: number }[];
  badgeStats: BadgeStatsData;
}

/* ------------------------------------------------------------------ */
/*  Shared presentational pieces (used by the StatsView shell)        */
/* ------------------------------------------------------------------ */

/** Hero card: level ring + title + animated XP progress bar. */
export function LevelCard({ g }: { g: GamificationState }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-card p-5"
    >
      <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex items-center gap-5">
        <ProgressRing value={g.progress} size={96} stroke={9} showGlow>
          <div className="text-center">
            <div className="tabular text-2xl font-extrabold">{toBn(g.level)}</div>
            <div className="text-[9px] text-muted-foreground">লেভেল</div>
          </div>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <div className="text-sm text-muted-foreground">লেভেল {toBn(g.level)}</div>
          <div className="text-lg font-bold">{levelTitle(g.level)}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {toBn(g.xpInLevel)} / {toBn(g.xpForNextLevel)} XP
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${g.progress * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/** Compact quick-stat tile (streak / perfect days / prayers / quran). */
export function QuickStat({
  icon,
  value,
  label,
  color,
  sub,
}: {
  icon: string;
  value: number;
  label: string;
  color: string;
  sub?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-2xl border bg-card p-3 transition-shadow hover:shadow-md"
    >
      <div
        className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg"
        style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
      >
        <IconRenderer name={icon} size={16} />
      </div>
      <div className="flex items-baseline gap-0.5">
        <AnimatedNumber
          value={value}
          className="tabular text-xl font-extrabold leading-none"
        />
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>
    </motion.div>
  );
}
