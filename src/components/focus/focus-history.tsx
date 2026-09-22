"use client";

import { motion } from "framer-motion";
import { Brain, Coffee, Check } from "lucide-react";
import { toBn, fromDateKey, bnDayFirst } from "@/lib/date-bn";
import { cn } from "@/lib/utils";
import { FocusDailyChart } from "@/components/focus/focus-daily-chart";

/* ------------------------------------------------------------------ */
/*  Shared focus data contract (GET /api/focus?days=7)                 */
/* ------------------------------------------------------------------ */

export interface FocusSession {
  id: string;
  habitId?: string | null;
  date: string; // YYYY-MM-DD
  durationMin: number;
  /** "work" | "break" */
  type: string;
  tag?: string | null;
}

export interface FocusData {
  sessions: FocusSession[];
  todayMinutes: number;
  totalMinutes: number;
  totalSessions: number;
  dailySeries: { date: string; minutes: number }[];
  focusStreak: number;
}

interface HabitLite {
  id: string;
  name: string;
}

/* ------------------------------------------------------------------ */
/*  Session type helpers                                               */
/* ------------------------------------------------------------------ */

function sessionMeta(type: string): { label: string; iconChip: string } {
  if (type === "work") {
    return { label: "কাজ", iconChip: "bg-primary/15 text-primary" };
  }
  return {
    label: "বিশ্রাম",
    iconChip: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  };
}

function SessionTypeIcon({ type }: { type: string }) {
  if (type === "work") return <Brain size={14} />;
  return <Coffee size={14} />;
}

/* ------------------------------------------------------------------ */
/*  Focus history — daily chart + recent session list                  */
/* ------------------------------------------------------------------ */

export function FocusHistory({
  data,
  habits,
}: {
  data: FocusData;
  habits?: HabitLite[];
}) {
  return (
    <>
      {/* Daily focus chart */}
      {data.dailySeries && data.dailySeries.length > 0 && (
        <FocusDailyChart data={data.dailySeries} />
      )}

      {/* Recent sessions */}
      {data.sessions.length > 0 && (
        <div className="rounded-3xl border bg-card p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-bold">সাম্প্রতিক সেশন</h3>
          <div className="space-y-1.5">
            {data.sessions.slice(0, 8).map((s) => {
              const habit = habits?.find((h) => h.id === s.habitId);
              const meta = sessionMeta(s.type);
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2.5 rounded-xl bg-muted/30 p-2"
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      meta.iconChip
                    )}
                  >
                    <SessionTypeIcon type={s.type} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold">
                        {toBn(s.durationMin)} মিনিট {meta.label}
                      </span>
                      {s.tag && (
                        <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[8px] font-medium text-violet-600 dark:text-violet-400">
                          #{s.tag}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {habit ? habit.name : "সাধারণ"} •{" "}
                      {bnDayFirst(fromDateKey(s.date))}
                    </div>
                  </div>
                  <Check size={14} className="text-primary" />
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
