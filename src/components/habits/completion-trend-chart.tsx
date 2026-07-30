"use client";

import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { toBn, getBengaliWeekdayShort } from "@/lib/date-bn";
import { cn } from "@/lib/utils";

interface CompletionTrendChartProps {
  /** Array of YYYY-MM-DD date strings that were completed. */
  completedDates: string[];
  /** Number of days to show (default 7). */
  days?: number;
  /** Hex color for completed bars. */
  color: string;
}

/**
 * Mini completion trend chart — shows the last N days as vertical bars.
 * Completed days are filled with the habit's color; missed days are muted.
 *
 * This provides an at-a-glance view of recent consistency without the
 * detail of the full 6-month heatmap.
 */
export function CompletionTrendChart({
  completedDates,
  days = 7,
  color,
}: CompletionTrendChartProps) {
  const completedSet = new Set(completedDates);
  const today = new Date();

  // Build the last N days (oldest → newest, left → right)
  const dayData = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - i));
    const dateStr = d.toISOString().split("T")[0];
    return {
      date: dateStr,
      dayLabel: getBengaliWeekdayShort(d),
      dateNum: d.getDate(),
      completed: completedSet.has(dateStr),
      isToday: i === days - 1,
    };
  });

  const completedCount = dayData.filter((d) => d.completed).length;
  const rate = Math.round((completedCount / days) * 100);

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <BarChart3 size={16} className="text-primary" />
          গত {toBn(days)} দিন
        </h3>
        <span className="text-xs text-muted-foreground">
          <span className="font-bold tabular" style={{ color }}>
            {toBn(completedCount)}
          </span>
          /{toBn(days)} ({toBn(rate)}%)
        </span>
      </div>

      {/* Bar chart */}
      <div className="flex items-end justify-between gap-1.5" style={{ height: 80 }}>
        {dayData.map((day, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-1 items-end">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: day.completed ? "100%" : "20%" }}
                transition={{ delay: i * 0.05, duration: 0.4, ease: "easeOut" }}
                className={cn(
                  "w-full rounded-t-md transition-colors",
                  day.completed ? "" : "bg-muted",
                )}
                style={day.completed ? { background: color } : undefined}
              />
            </div>
            <span
              className={cn(
                "text-[9px] font-medium",
                day.isToday ? "text-primary" : "text-muted-foreground",
              )}
            >
              {day.dayLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
