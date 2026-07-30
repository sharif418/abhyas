"use client";

import { motion } from "framer-motion";
import { Lightbulb, TrendingUp, TrendingDown, Clock, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { toBn } from "@/lib/date-bn";
import { cn } from "@/lib/utils";

interface StatsLite {
  insights: {
    bestWeekday: string;
    bestWeekdayCount: number;
    bestTime: string;
    bestTimeCount: number;
    momentumDelta: number;
    momentumLabel: string;
    last7Rate: number;
    prev7Rate: number;
  };
  weekly: { done: number; scheduled: number; rate: number };
  today: { done: number; total: number };
}

const WEEKDAYS_BN = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহ", "শুক্র", "শনি"];

/**
 * Habit insights card — shows personalized analytics insights:
 * - Best weekday (highest completion rate)
 * - Best time of day (highest completion rate)
 * - Momentum trend (this week vs last week)
 *
 * Only appears when the user has enough data for meaningful insights.
 */
export function HabitInsightsCard() {
  const { data: stats } = useQuery<StatsLite>({
    queryKey: ["stats"],
    queryFn: () => api.get<StatsLite>("/api/stats"),
    staleTime: 30_000,
  });

  if (!stats?.insights) return null;

  const { bestWeekday, bestWeekdayCount, bestTime, bestTimeCount, momentumDelta, momentumLabel } = stats.insights;

  // Don't show if there's not enough data
  if (!bestWeekday || bestWeekdayCount === 0) return null;

  const direction = momentumDelta > 0.05 ? "up" : momentumDelta < -0.05 ? "down" : "stable";
  const momentumColor =
    direction === "up"
      ? "text-emerald-500"
      : direction === "down"
        ? "text-red-500"
        : "text-muted-foreground";

  const momentumIcon =
    direction === "up" ? <TrendingUp size={14} /> : direction === "down" ? <TrendingDown size={14} /> : null;

  const momentumText =
    direction === "up"
      ? `গত সপ্তাহের চেয়ে ${toBn(Math.round(Math.abs(momentumDelta * 100)))}% ভালো`
      : direction === "down"
        ? `গত সপ্তাহের চেয়ে ${toBn(Math.round(Math.abs(momentumDelta * 100)))}% কম`
        : "গত সপ্তাহের মতোই";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl border bg-card p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center gap-1.5">
        <Lightbulb size={16} className="text-amber-500" />
        <h3 className="text-sm font-semibold">আপনার অন্তর্দৃষ্টি</h3>
      </div>

      <div className="space-y-2.5">
        {/* Best weekday */}
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Calendar size={14} />
          </div>
          <div className="flex-1 text-xs">
            <span className="text-muted-foreground">সেরা দিন: </span>
            <span className="font-semibold">{bestWeekday}</span>
            <span className="ml-1 text-muted-foreground">
              ({toBn(bestWeekdayCount)} বার)
            </span>
          </div>
        </div>

        {/* Best time of day */}
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
            <Clock size={14} />
          </div>
          <div className="flex-1 text-xs">
            <span className="text-muted-foreground">সেরা সময়: </span>
            <span className="font-semibold">{bestTime}</span>
            <span className="ml-1 text-muted-foreground">
              ({toBn(bestTimeCount)} বার)
            </span>
          </div>
        </div>

        {/* Momentum */}
        <div className="flex items-center gap-3">
          <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", momentumColor, "bg-current/10")}>
            {momentumIcon}
          </div>
          <div className="flex-1 text-xs">
            <span className="text-muted-foreground">ধারা: </span>
            <span className={cn("font-semibold", momentumColor)}>{momentumText}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
