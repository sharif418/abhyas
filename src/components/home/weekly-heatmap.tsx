"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { toBn, getBengaliWeekdayShort } from "@/lib/date-bn";
import { cn } from "@/lib/utils";

interface DailySeriesItem {
  date: string;
  count: number;
}

interface StatsLite {
  dailySeries?: DailySeriesItem[];
  today?: { total: number };
}

/**
 * Premium 7-day activity heatmap.
 * Shows the last 7 days as colored cells with completion counts.
 * Color intensity scales with completion rate relative to the user's
 * typical daily habit count.
 */
export function WeeklyHeatmap() {
  const { data: stats } = useQuery<StatsLite>({
    queryKey: ["stats"],
    queryFn: () => api.get<StatsLite>("/api/stats"),
    staleTime: 30_000,
  });

  const series = stats?.dailySeries ?? [];
  const last7 = series.slice(-7);
  const todayStr = new Date().toISOString().split("T")[0];

  // Determine max count for color scaling (fallback to today's total)
  const maxCount = Math.max(
    ...last7.map((d) => d.count),
    stats?.today?.total ?? 1,
    1,
  );

  if (last7.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl border bg-card p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">গত ৭ দিন</h3>
        <span className="text-[11px] text-muted-foreground">
          সপ্তাহের অ্যাক্টিভিটি
        </span>
      </div>
      <div className="flex items-end justify-between gap-1.5">
        {last7.map((day, i) => {
          const ratio = maxCount > 0 ? day.count / maxCount : 0;
          const isToday = day.date === todayStr;
          const intensity = getIntensity(ratio);
          const dayLabel = getBengaliWeekdayShort(day.date);

          return (
            <motion.div
              key={day.date}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.04 }}
              className="flex flex-1 flex-col items-center gap-1.5"
            >
              <span className="text-[10px] font-medium text-muted-foreground">
                {dayLabel}
              </span>
              <div
                className={cn(
                  "relative flex h-12 w-full items-center justify-center rounded-xl text-xs font-bold transition-all",
                  intensity.bg,
                  intensity.text,
                  isToday && "ring-2 ring-primary ring-offset-1 ring-offset-card",
                )}
              >
                {day.count > 0 ? toBn(day.count) : "·"}
                {isToday && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary shadow-sm"
                  />
                )}
              </div>
              <span className="text-[9px] text-muted-foreground">
                {toBn(parseInt(day.date.split("-")[2], 10))}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

/** Map a 0..1 completion ratio to a Tailwind color intensity class. */
function getIntensity(ratio: number): { bg: string; text: string } {
  if (ratio === 0) return { bg: "bg-muted/50", text: "text-muted-foreground" };
  if (ratio < 0.25)
    return { bg: "bg-primary/15", text: "text-primary/70" };
  if (ratio < 0.5)
    return { bg: "bg-primary/30", text: "text-primary/80" };
  if (ratio < 0.75)
    return { bg: "bg-primary/55", text: "text-primary-foreground" };
  return { bg: "bg-primary", text: "text-primary-foreground" };
}
