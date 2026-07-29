"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { toBn, getBengaliWeekdayShort } from "@/lib/date-bn";
import { cn } from "@/lib/utils";

interface MonthlyCalendarProps {
  /** Array of YYYY-MM-DD date strings that were completed. */
  completedDates: string[];
  /** Hex color for completed day cells. */
  color: string;
  /** Optional: frozen date (YYYY-MM-DD) — shown with a snowflake icon. */
  frozenDate?: string | null;
}

const MONTH_NAMES_BN = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];

/**
 * Premium monthly calendar showing habit completion for a single month.
 * Users can navigate between months. Completed days are highlighted with
 * the habit's color. Today is marked with a ring.
 */
export function MonthlyCalendar({
  completedDates,
  color,
  frozenDate,
}: MonthlyCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const completedSet = useMemo(
    () => new Set(completedDates),
    [completedDates],
  );

  // Build the calendar grid for the viewed month
  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startWeekday = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();

  // Build array of cells: leading blanks + days
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayStr = today.toISOString().split("T")[0];

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Count completions this month
  const monthCompletions = cells.filter((d) => {
    if (!d) return false;
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return completedSet.has(dateStr);
  }).length;

  return (
    <div className="rounded-2xl border bg-card p-4">
      {/* Header with month name + navigation */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={goPrev}
          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted transition"
          aria-label="পূর্ববর্তী মাস"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="text-sm font-bold">
          {MONTH_NAMES_BN[viewMonth]} {toBn(viewYear)}
        </div>
        <button
          onClick={goNext}
          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted transition"
          aria-label="পরবর্তী মাস"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Month summary */}
      <div className="mb-3 text-center text-[11px] text-muted-foreground">
        এই মাসে <span className="font-bold" style={{ color }}>{toBn(monthCompletions)}</span> দিন সম্পন্ন করেছেন
      </div>

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহ", "শুক্র", "শনি"].map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="aspect-square" />;
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const isDone = completedSet.has(dateStr);
          const isToday = dateStr === todayStr;
          const isFrozen = frozenDate === dateStr;
          const isFuture = new Date(viewYear, viewMonth, d) > today;

          return (
            <motion.div
              key={i}
              initial={isDone ? { scale: 0.8, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: isDone ? Math.min(i * 0.01, 0.3) : 0 }}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-lg text-[11px] font-medium transition",
                isDone && "text-white shadow-sm",
                !isDone && !isFuture && "bg-muted/40 text-muted-foreground",
                !isDone && isFuture && "text-muted-foreground/40",
                isToday && !isDone && "ring-2 ring-primary ring-offset-1 ring-offset-card",
                isToday && isDone && "ring-2 ring-primary-foreground/50 ring-offset-1 ring-offset-card",
              )}
              style={isDone ? { background: color } : undefined}
            >
              {toBn(d)}
              {isFrozen && (
                <span className="absolute -top-0.5 -right-0.5 text-[8px]">❄️</span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
