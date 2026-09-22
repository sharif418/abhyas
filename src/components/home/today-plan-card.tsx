"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Flame, MoonStar, Sunrise, Sun } from "lucide-react";
import { usePlanner, useCreatePlannerTask, useTogglePlannerTask, useDeletePlannerTask } from "@/hooks/use-planner";
import { toBn } from "@/lib/date-bn";
import { useUIStore } from "@/stores/ui-store";
import { AddTaskInput, EmptyMitSlot, PHASE_META, PlannerTaskRow, plannerPhase } from "@/components/planner/planner-shared";
import type { PlannerPhase } from "@/components/planner/planner-shared";
import { cn } from "@/lib/utils";

const MAX_TODOS_SHOWN = 4;

const PHASE_ICON: Record<PlannerPhase, typeof Sunrise> = {
  morning: Sunrise,
  day: Sun,
  evening: MoonStar,
};

/**
 * আজকের পরিকল্পনা — the daily-ritual card on Home.
 * Morning: set the 3 MITs. Day: run them. Evening: review the day.
 */
export function TodayPlanCard() {
  const { data, isLoading } = usePlanner();
  const create = useCreatePlannerTask();
  const toggle = useTogglePlannerTask();
  const remove = useDeletePlannerTask();
  const setView = useUIStore((s) => s.setView);

  const phase = plannerPhase();
  const meta = PHASE_META[phase];
  const PhaseIcon = PHASE_ICON[phase];

  // Re-key the input when an empty MIT slot is tapped → MIT preselected + focus.
  const [mitAddKey, setMitAddKey] = useState(0);
  const [mitPreselect, setMitPreselect] = useState(false);

  if (isLoading) {
    return (
      <div className="rounded-3xl border bg-card p-4">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const tasks = data?.tasks ?? [];
  const summary = data?.summary;
  const planStreak = summary?.planStreak ?? 0;
  const mits = tasks.filter((t) => t.isMit);
  const todos = tasks.filter((t) => !t.isMit);
  const emptyMitSlots = Array.from({ length: Math.max(0, 3 - mits.length) });
  const shownTodos = todos.slice(0, MAX_TODOS_SHOWN);
  const moreTodos = todos.length - shownTodos.length;
  const pct = summary && summary.total > 0 ? summary.done / summary.total : 0;

  function addTask(title: string, isMit: boolean) {
    create.mutate({ title, isMit });
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      aria-label="আজকের পরিকল্পনা"
      className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/[0.07] via-card to-card p-4 shadow-sm"
    >
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/10 blur-2xl" aria-hidden />

      {/* Header — phase-aware */}
      <div className="relative flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-sm">
          <PhaseIcon size={19} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold leading-tight">{meta.label}</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{meta.hint}</p>
        </div>
        {planStreak > 0 && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--streak)]/10 px-2.5 py-1 text-[10px] font-bold text-[var(--streak)]">
            <Flame size={11} aria-hidden /> {toBn(planStreak)} দিন
          </span>
        )}
      </div>

      {/* Progress bar */}
      {summary && summary.total > 0 && (
        <div className="relative mt-3">
          <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>
              প্রধান কাজ {toBn(summary.mitsDone)}/{toBn(Math.max(3, summary.mitsTotal))} • মোট{" "}
              {toBn(summary.done)}/{toBn(summary.total)}
            </span>
            <span className="font-semibold text-primary">{toBn(Math.round(pct * 100))}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(pct * 100)}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-primary to-teal-500"
            />
          </div>
        </div>
      )}

      {/* Morning nudge — plan not yet set */}
      {phase === "morning" && mits.length < 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative mt-3 rounded-2xl border border-primary/20 bg-primary/[0.06] px-3 py-2.5"
        >
          <p className="text-xs font-medium text-primary">
            এখনো {toBn(3 - mits.length)}টি প্রধান কাজ বাকি — দিনটি পরিকল্পনা করে শুরু করুন
          </p>
        </motion.div>
      )}

      {/* Evening review summary */}
      {phase === "evening" && (
        <div className="relative mt-3 grid grid-cols-3 gap-2">
          <ReviewStat value={toBn(summary?.done ?? 0)} label="কাজ সম্পন্ন" />
          <ReviewStat value={`${toBn(summary?.mitsDone ?? 0)}/${toBn(3)}`} label="প্রধান কাজ" />
          <ReviewStat value={toBn(summary?.total ?? 0)} label="পরিকল্পিত" />
        </div>
      )}

      {/* Tasks */}
      <div className="relative mt-3 space-y-2">
        {mits.map((t, i) => (
          <PlannerTaskRow
            key={t.id}
            task={t}
            slot={i + 1}
            busy={toggle.isPending || remove.isPending}
            onToggle={(done) => toggle.mutate({ id: t.id, done })}
            onDelete={() => remove.mutate(t.id)}
          />
        ))}
        {emptyMitSlots.map((_, i) => (
          <EmptyMitSlot
            key={`slot-${mits.length + i + 1}`}
            slot={mits.length + i + 1}
            onClick={() => {
              setMitPreselect(true);
              setMitAddKey((k) => k + 1);
            }}
          />
        ))}

        {shownTodos.map((t) => (
          <PlannerTaskRow
            key={t.id}
            task={t}
            busy={toggle.isPending || remove.isPending}
            onToggle={(done) => toggle.mutate({ id: t.id, done })}
            onDelete={() => remove.mutate(t.id)}
          />
        ))}
        {moreTodos > 0 && (
          <button
            type="button"
            onClick={() => setView("planner")}
            className="w-full rounded-2xl px-3 py-1.5 text-center text-[11px] font-medium text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
          >
            +{toBn(moreTodos)}টি কাজ আরও দেখুন
          </button>
        )}

        {/* Quick add */}
        <AddTaskInput
          key={mitAddKey}
          onAdd={addTask}
          mitDefault={mitPreselect}
          placeholder="আজ কী করবেন? লিখুন…"
        />
      </div>

      {/* Footer — full planner */}
      <button
        type="button"
        onClick={() => setView("planner")}
        className="relative mt-3 flex w-full items-center justify-between rounded-2xl bg-muted/60 px-3 py-2.5 text-xs font-semibold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span>সপ্তাহিক পরিকল্পনা ও রিভিউ</span>
        <span className="flex items-center gap-1 text-primary">
          দেখুন <ArrowRight size={13} aria-hidden />
        </span>
      </button>
    </motion.section>
  );
}

function ReviewStat({ value, label }: { value: string; label: string }) {
  return (
    <div className={cn("rounded-2xl border bg-card/80 px-2 py-2 text-center shadow-sm")}>
      <p className="text-sm font-extrabold tabular text-primary">{value}</p>
      <p className="mt-0.5 text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}
