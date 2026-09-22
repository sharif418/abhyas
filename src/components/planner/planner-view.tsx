"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Flame,
  MoonStar,
  Sunrise,
  Sun,
} from "lucide-react";
import {
  usePlanner,
  useCreatePlannerTask,
  useTogglePlannerTask,
  useUpdatePlannerTask,
  useDeletePlannerTask,
} from "@/hooks/use-planner";
import { BENGALI_MONTHS, BENGALI_WEEKDAYS } from "@/types";
import { addDays, fromDateKey, toDateKey, todayKey, toBn } from "@/lib/date-bn";
import {
  AddTaskInput,
  EmptyMitSlot,
  PHASE_META,
  PlannerTaskRow,
  plannerPhase,
  relativeDayBn,
} from "@/components/planner/planner-shared";
import type { PlannerPhase } from "@/components/planner/planner-shared";
import { DayContextSection } from "@/components/planner/planner-day-context";
import { Skeleton } from "@/components/ui/skeleton";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

/** Short Bengali weekday labels for the strip chips. */
const SHORT_WEEKDAYS = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"];
const NAV_RANGE_DAYS = 30; // planner can browse ±30 days

const PHASE_ICON: Record<PlannerPhase, typeof Sunrise> = {
  morning: Sunrise,
  day: Sun,
  evening: MoonStar,
};

/**
 * পরিকল্পনা view — the full daily/weekly planning surface:
 * date strip, 3 MITs, todos, today's habits + goal next-steps, evening review.
 */
export function PlannerView() {
  const [selected, setSelected] = useState<string>(() => todayKey());
  const today = todayKey();

  const { data, isLoading } = usePlanner(selected);
  const create = useCreatePlannerTask();
  const toggle = useTogglePlannerTask();
  const update = useUpdatePlannerTask();
  const remove = useDeletePlannerTask();
  const setView = useUIStore((s) => s.setView);

  const phase = plannerPhase();
  const meta = PHASE_META[phase];
  const PhaseIcon = PHASE_ICON[phase];

  const tasks = data?.tasks ?? [];
  const summary = data?.summary;
  const planStreak = summary?.planStreak ?? 0;
  const mits = tasks.filter((t) => t.isMit);
  const todos = tasks.filter((t) => !t.isMit);
  const emptyMitSlots = Array.from({ length: Math.max(0, 3 - mits.length) });
  const busy = toggle.isPending || remove.isPending || update.isPending;

  const selDate = fromDateKey(selected);
  const dateLabel = `${BENGALI_WEEKDAYS[selDate.getDay()]}, ${toBn(
    selDate.getDate()
  )} ${BENGALI_MONTHS[selDate.getMonth()]}`;

  function shiftDay(delta: number) {
    const next = toDateKey(addDays(fromDateKey(selected), delta));
    const diff = Math.round(
      (fromDateKey(next).getTime() - fromDateKey(today).getTime()) / 86_400_000
    );
    if (Math.abs(diff) > NAV_RANGE_DAYS) return;
    setSelected(next);
  }

  const isToday = selected === today;
  const isFuture = fromDateKey(selected).getTime() > fromDateKey(today).getTime();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-5">
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="h-16 rounded-3xl" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-5">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm"
      >
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/10 blur-2xl" aria-hidden />
        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-sm">
            <PhaseIcon size={22} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
              {meta.label}
            </p>
            <h1 className="text-lg font-bold leading-tight">দৈনিক পরিকল্পনা</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {dateLabel} • {relativeDayBn(selected)}
            </p>
          </div>
          {planStreak > 0 && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--streak)]/10 px-3 py-1.5 text-xs font-bold text-[var(--streak)]">
              <Flame size={12} aria-hidden /> {toBn(planStreak)} দিন
            </span>
          )}
        </div>

        {/* Date navigation */}
        <div className="relative mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftDay(-1)}
            aria-label="আগের দিন"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-card transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft size={16} aria-hidden />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
            {(data?.week ?? []).map((d) => {
              const dt = fromDateKey(d.date);
              const active = d.date === selected;
              const doneAll = d.total > 0 && d.done === d.total;
              return (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setSelected(d.date)}
                  aria-label={`${BENGALI_WEEKDAYS[dt.getDay()]} ${toBn(dt.getDate())}`}
                  aria-pressed={active}
                  className={cn(
                    "flex min-w-[52px] shrink-0 flex-col items-center gap-0.5 rounded-2xl border px-2 py-1.5 transition-all",
                    active
                      ? "border-primary bg-primary/10 shadow-md"
                      : "border-border/60 bg-card hover:border-primary/40",
                    d.date === today && !active && "ring-1 ring-primary/40"
                  )}
                >
                  <span className="text-[9px] font-medium text-muted-foreground">
                    {SHORT_WEEKDAYS[dt.getDay()]}
                  </span>
                  <span className={cn("text-sm font-bold tabular", active && "text-primary")}>
                    {toBn(dt.getDate())}
                  </span>
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      d.total === 0
                        ? "bg-transparent"
                        : doneAll
                          ? "bg-primary"
                          : d.done > 0
                            ? "bg-primary/40"
                            : "bg-muted-foreground/25"
                    )}
                    aria-hidden
                  />
                </button>
              );
            })}
            {/* Selected date outside the trailing week → standalone chip */}
            {!isToday && !(data?.week ?? []).some((d) => d.date === selected) && (
              <span className="flex min-w-[52px] shrink-0 flex-col items-center gap-0.5 rounded-2xl border border-primary bg-primary/10 px-2 py-1.5">
                <span className="text-[9px] font-medium text-muted-foreground">
                  {SHORT_WEEKDAYS[selDate.getDay()]}
                </span>
                <span className="text-sm font-bold tabular text-primary">
                  {toBn(selDate.getDate())}
                </span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => shiftDay(1)}
            aria-label="পরের দিন"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-card transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight size={16} aria-hidden />
          </button>

          {!isToday && (
            <button
              type="button"
              onClick={() => setSelected(today)}
              className="shrink-0 rounded-xl bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground shadow-md transition active:scale-95"
            >
              আজ
            </button>
          )}
        </div>
      </motion.div>

      {/* Planning hint for future dates */}
      {isFuture && (
        <p className="mt-3 rounded-2xl border border-primary/20 bg-primary/[0.05] px-3 py-2 text-xs font-medium text-primary">
          ভবিষ্যতের দিন পরিকল্পনা করছেন — কাজগুলো সেই দিনেই যুক্ত হবে।
        </p>
      )}

      {/* MITs */}
      <section aria-label="আজকের প্রধান কাজ" className="mt-4">
        <header className="mb-2 flex items-center justify-between px-1">
          <h2 className="flex items-center gap-1.5 text-sm font-bold">
            <CalendarCheck size={15} className="text-primary" aria-hidden />
            {toBn(3)}টি প্রধান কাজ
          </h2>
          <span className="text-[10px] text-muted-foreground">
            {toBn(summary?.mitsDone ?? 0)}/{toBn(3)} সম্পন্ন
          </span>
        </header>
        <div className="space-y-2">
          {mits.map((t, i) => (
            <PlannerTaskRow
              key={t.id}
              task={t}
              slot={i + 1}
              busy={busy}
              onToggle={(done) => toggle.mutate({ id: t.id, done })}
              onDelete={() => remove.mutate(t.id)}
              onDemote={() => update.mutate({ id: t.id, isMit: false })}
            />
          ))}
          {emptyMitSlots.map((_, i) => (
            <EmptyMitSlot
              key={`slot-${mits.length + i + 1}`}
              slot={mits.length + i + 1}
              onClick={() => {
                const el = document.getElementById("planner-add-input");
                el?.focus();
              }}
            />
          ))}
        </div>
      </section>

      {/* Todos */}
      <section aria-label="অন্যান্য কাজ" className="mt-5">
        <header className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-sm font-bold">অন্যান্য কাজ</h2>
          <span className="text-[10px] text-muted-foreground">
            {toBn(todos.filter((t) => t.done).length)}/{toBn(todos.length)} সম্পন্ন
          </span>
        </header>
        <div className="space-y-2">
          {todos.length === 0 && (
            <p className="rounded-2xl border border-dashed px-3 py-3 text-center text-xs text-muted-foreground">
              {isToday
                ? "প্রধান কাজ ছাড়া আর কিছু যোগ করতে নিচে লিখুন"
                : "এই দিনে কোনো বাড়তি কাজ নেই"}
            </p>
          )}
          {todos.map((t) => (
            <PlannerTaskRow
              key={t.id}
              task={t}
              busy={busy}
              onToggle={(done) => toggle.mutate({ id: t.id, done })}
              onDelete={() => remove.mutate(t.id)}
              onPromote={() => update.mutate({ id: t.id, isMit: true })}
            />
          ))}
          <AddTaskInput
            inputId="planner-add-input"
            onAdd={(title, isMit) => create.mutate({ date: selected, title, isMit })}
            placeholder={
              isToday ? "নতুন কাজ লিখুন…" : "এই দিনের জন্য কাজ লিখুন…"
            }
          />
        </div>
      </section>

      {/* এক নজরে আজ — habits + goals on one screen */}
      <section aria-label="এক নজরে আজ" className="mt-6">
        <header className="mb-2 px-1">
          <h2 className="text-sm font-bold">এক নজরে আজ</h2>
        </header>
        <DayContextSection />
      </section>

      {/* Evening review CTA */}
      {phase === "evening" && isToday && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-card p-4 shadow-sm"
        >
          <h2 className="text-sm font-bold">রাতের রিভিউ</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            আজ {toBn(summary?.done ?? 0)}টি কাজ সম্পন্ন হয়েছে। মন লিখে রাখুন, কালকের
            পরিকল্পনা করুন — ঘুমানোর আগে ২ মিনিট।
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setView("journal")}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md transition active:scale-95"
            >
              জার্নাল লিখুন
            </button>
            <button
              type="button"
              onClick={() => shiftDay(1)}
              className="rounded-xl border bg-card px-4 py-2 text-xs font-semibold shadow-sm transition hover:border-primary/40"
            >
              কালকের পরিকল্পনা
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
