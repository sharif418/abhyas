"use client";

import { motion } from "framer-motion";
import { CalendarDays, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { toBn, bnMonth, fromDateKey } from "@/lib/date-bn";
import { cn } from "@/lib/utils";

interface SpecialDay {
  id: string;
  name: string;
  emoji: string;
  category: "bengali" | "islamic" | "national";
  monthDay: string;
  description: string;
  habitTheme?: string;
  daysUntil: number;
  dateThisYear: string;
}

const CATEGORY_STYLE: Record<string, { ring: string; chip: string; label: string }> = {
  bengali: {
    ring: "border-amber-500/30",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    label: "বাংলা",
  },
  islamic: {
    ring: "border-islamic/30",
    chip: "bg-islamic/15 text-islamic",
    label: "ইসলামিক",
  },
  national: {
    ring: "border-rose-500/30",
    chip: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    label: "জাতীয়",
  },
};

/**
 * Bangladesh Calendar panel — shows upcoming culturally-relevant days.
 * Helps users align their habits with Bengali/Islamic/national observances.
 */
export function CalendarPanel() {
  const { data, isLoading } = useQuery<{ days: SpecialDay[] }>({
    queryKey: ["calendar"],
    queryFn: () => api.get("/api/calendar"),
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const days = data?.days ?? [];

  if (isLoading) {
    return (
      <div className="rounded-3xl border bg-card p-4 shadow-sm">
        <div className="mb-3 h-5 w-32 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (days.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border bg-card p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary shadow-sm">
            <CalendarDays size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold leading-tight">আসন্ন বিশেষ দিন</h2>
            <p className="text-[10px] text-muted-foreground">
              বাংলা ও ইসলামিক ক্যালেন্ডার
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {days.slice(0, 3).map((day, i) => {
          const style = CATEGORY_STYLE[day.category] ?? CATEGORY_STYLE.national;
          const date = fromDateKey(day.dateThisYear);
          return (
            <motion.div
              key={day.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className={cn(
                "flex items-center gap-3 rounded-2xl border bg-background/50 p-2.5",
                style.ring
              )}
            >
              <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-muted/60">
                <span className="text-lg leading-none">{day.emoji}</span>
                <span className="tabular text-[9px] font-semibold leading-tight text-muted-foreground">
                  {toBn(date.getDate())} {bnMonth(date).slice(0, 4)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-bold">{day.name}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold",
                      style.chip
                    )}
                  >
                    {style.label}
                  </span>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  {day.description}
                </p>
                {day.habitTheme && (
                  <p className="flex items-center gap-1 truncate text-[10px] text-primary/70">
                    <Sparkles size={14} className="inline shrink-0 text-primary" />
                    {day.habitTheme}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <div className="tabular text-base font-bold text-primary">
                  {day.daysUntil === 0 ? "আজ" : toBn(day.daysUntil)}
                </div>
                <div className="text-[9px] text-muted-foreground">
                  {day.daysUntil === 0 ? "" : "দিন পর"}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
