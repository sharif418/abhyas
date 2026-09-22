"use client";

import { ArrowRight, Check, Target } from "lucide-react";
import { useHabits, useToggleHabit } from "@/hooks/use-habits";
import { useGoals } from "@/hooks/use-goals";
import { toBn } from "@/lib/date-bn";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import type { Goal } from "@/types/goals";

/**
 * এক নজরে আজ — the roadmap's "one screen" promise: today's habits and the
 * next milestone of each active লক্ষ্য, right inside the planner.
 */

interface HabitLite {
  id: string;
  name: string;
  icon: string;
  color: string;
  completedToday: boolean;
}

const MAX_HABITS = 5;
const MAX_GOALS = 4;

export function DayContextSection() {
  const setView = useUIStore((s) => s.setView);
  const { data: habits } = useHabits();
  const toggle = useToggleHabit();
  const { data: goalsRes } = useGoals();

  const todayHabits = (habits ?? []).slice(0, MAX_HABITS);
  const activeGoals = (goalsRes?.goals ?? [])
    .filter((g) => g.active && !g.completedAt)
    .slice(0, MAX_GOALS);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {/* Today's habits */}
      <section
        aria-label="আজকের অভ্যাস"
        className="rounded-3xl border bg-card p-4 shadow-sm"
      >
        <header className="flex items-center justify-between">
          <h3 className="text-xs font-bold">আজকের অভ্যাস</h3>
          <button
            type="button"
            onClick={() => setView("habits")}
            className="flex items-center gap-0.5 text-[10px] font-semibold text-primary transition hover:underline"
          >
            সব <ArrowRight size={11} aria-hidden />
          </button>
        </header>
        <div className="mt-2.5 space-y-1.5">
          {todayHabits.length === 0 && (
            <p className="py-2 text-[11px] text-muted-foreground">কোনো অভ্যাস নেই</p>
          )}
          {todayHabits.map((h: HabitLite) => (
            <button
              key={h.id}
              type="button"
              onClick={() => toggle.mutate({ habitId: h.id })}
              className="flex w-full items-center gap-2 rounded-xl border bg-card/80 px-2.5 py-2 text-left transition hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition",
                  h.completedToday
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30"
                )}
              >
                {h.completedToday && <Check size={11} strokeWidth={3.5} aria-hidden />}
              </span>
              <span
                className={cn(
                  "truncate text-xs font-medium",
                  h.completedToday && "text-muted-foreground line-through"
                )}
              >
                {h.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Goal next-steps */}
      <section aria-label="লক্ষ্যের পরের ধাপ" className="rounded-3xl border bg-card p-4 shadow-sm">
        <header className="flex items-center justify-between">
          <h3 className="text-xs font-bold">লক্ষ্যের পরের ধাপ</h3>
          <button
            type="button"
            onClick={() => setView("goals")}
            className="flex items-center gap-0.5 text-[10px] font-semibold text-primary transition hover:underline"
          >
            সব <ArrowRight size={11} aria-hidden />
          </button>
        </header>
        <div className="mt-2.5 space-y-1.5">
          {activeGoals.length === 0 && (
            <p className="py-2 text-[11px] text-muted-foreground">কোনো সক্রিয় লক্ষ্য নেই</p>
          )}
          {activeGoals.map((g) => {
            const nextMs = (g.milestones ?? []).find((m) => !m.done);
            const pct = g.targetValue > 0 ? Math.min(1, g.currentValue / g.targetValue) : 0;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setView("goals")}
                className="w-full rounded-xl border bg-card/80 px-2.5 py-2 text-left transition hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
                    style={{ backgroundColor: `${g.color}22`, color: g.color }}
                  >
                    <Target size={11} aria-hidden />
                  </span>
                  <span className="truncate text-xs font-medium">{g.title}</span>
                  <span className="ml-auto shrink-0 text-[10px] font-semibold text-muted-foreground">
                    {toBn(Math.round(pct * 100))}%
                  </span>
                </div>
                <p className="mt-0.5 truncate pl-7 text-[10px] text-muted-foreground">
                  {nextMs
                    ? `পরের ধাপ: ${nextMs.title}`
                    : `${toBn(Math.round(g.currentValue))}/${toBn(Math.round(g.targetValue))} ${g.unit}`}
                </p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
