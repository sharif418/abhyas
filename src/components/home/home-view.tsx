"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useHabits, useTodayProgress, useToggleHabit } from "@/hooks/use-habits";
import { toBn, bnDayFirst } from "@/lib/date-bn";
import { TIMES_OF_DAY } from "@/constants";
import { ProgressRing } from "@/components/shared/progress-ring";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { AnimatedNumber } from "@/components/shared/celebration";
import { StatPill, EmptyState } from "@/components/shared/stat-pill";
import { HabitRow } from "@/components/habits/habit-row";
import { AICoachPanel } from "@/components/home/ai-coach-panel";
import { CalendarPanel } from "@/components/home/calendar-panel";
import { MoodSelector } from "@/components/home/mood-selector";
import { WeeklyRecapCard } from "@/components/home/weekly-recap-card";
import { DailyQuoteCard } from "@/components/home/daily-quote-card";
import { WeeklyHeatmap } from "@/components/home/weekly-heatmap";
import { StreakSummaryCard } from "@/components/home/streak-summary-card";
import { WeeklyGoalCard } from "@/components/home/weekly-goal-card";
import { StreakPredictionCard } from "@/components/home/streak-prediction-card";
import { HabitInsightsCard } from "@/components/home/habit-insights-card";
import { StreakFreezeIndicator } from "@/components/home/streak-freeze-indicator";
import { DailyStreakBadge } from "@/components/home/daily-streak-badge";
import { WeeklyChallengeCard } from "@/components/home/weekly-challenge-card";
import { QuickActions } from "@/components/home/quick-actions";
import { GoalsSummaryCard } from "@/components/home/goals-summary-card";
import { TodayPlanCard } from "@/components/home/today-plan-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

interface StatsLite {
  user: { name: string; level: number; levelTitle?: string };
  streaks: { bestOverall: number; activeStreaks: number };
  today: { done: number; total: number; pct: number };
  perfectDays: number;
  gamification?: {
    xpInLevel?: number;
    xpForNextLevel?: number;
    progress?: number;
  };
}

/** Time-of-day Bengali greeting. */
function greetingBn(): string {
  const h = new Date().getHours();
  if (h < 5) return "শুভ রাত";
  if (h < 12) return "শুভ সকাল";
  if (h < 16) return "শুভ দুপুর";
  if (h < 19) return "শুভ বিকাল";
  return "শুভ সন্ধ্যা";
}

export function HomeView() {
  const { data: habits, isLoading, isError, refetch: refetchHabits } = useHabits();
  const { data: stats } = useQuery<StatsLite>({
    queryKey: ["stats"],
    queryFn: () => api.get<StatsLite>("/api/stats"),
    staleTime: 30_000,
  });
  const toggle = useToggleHabit();
  const openHabitDetail = useUIStore((s) => s.openHabitDetail);
  const setView = useUIStore((s) => s.setView);
  const openAddHabit = useUIStore((s) => s.openAddHabit);
  const openTemplates = useUIStore((s) => s.setTemplatesOpen);
  const { done, total, pct, byTime } = useTodayProgress(habits);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-5">
        <Skeleton className="h-28 rounded-3xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed bg-card/50 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <IconRenderer name="WifiOff" size={26} />
          </div>
          <div>
            <h3 className="font-semibold">ডেটা লোড করতে সমস্যা</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              অভ্যাস ডেটা লোড করা যায়নি। আবার চেষ্টা করুন।
            </p>
          </div>
          <button
            onClick={() => refetchHabits()}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            আবার চেষ্টা করুন
          </button>
        </div>
      </div>
    );
  }

  if (!isLoading && habits && habits.length === 0) {
    // New user: keep the "add first habit" hero, but the daily ritual (plan
    // card, quick actions, daily ayat/hadith) must still be available —
    // planning the day does not require habits to exist yet.
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <EmptyState
          icon="Sparkles"
          title="আপনার প্রথম অভ্যাস যোগ করুন"
          description="ছোট শুরু করুন — প্রতিদিন একটি কাজ। ধীরে ধীরে জীবন বদলে যাবে।"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={openAddHabit}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md"
              >
                + নতুন অভ্যাস
              </button>
              <button
                onClick={() => openTemplates(true)}
                className="rounded-xl border bg-card px-4 py-2 text-sm font-semibold shadow-sm"
              >
                টেমপ্লেট থেকে বাছাই
              </button>
            </div>
          }
        />
        <div className="mt-5">
          <QuickActions />
        </div>
        <div className="mt-4">
          <TodayPlanCard />
        </div>
        <div className="mt-4">
          <DailyQuoteCard />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-5">
      {/* Hero progress card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm"
      >
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex items-center gap-5">
          <ProgressRing value={pct} size={108} stroke={11} showGlow>
            <div className="text-center">
              <AnimatedNumber
                value={Math.round(pct * 100)}
                className="tabular text-2xl font-extrabold"
                format={(n) => `${toBn(n)}%`}
              />
              <div className="text-[10px] text-muted-foreground">আজকের অগ্রগতি</div>
            </div>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-primary">
              আসসালামু আলাইকুম{stats?.user?.name ? `, ${stats.user.name}` : ""}
            </p>
            <h1 className="text-lg font-bold">
              {greetingBn()} — আজকের অভ্যাস
            </h1>
            <p className="text-sm text-muted-foreground">
              {toBn(done)} / {toBn(total)} সম্পন্ন • {bnDayFirst()}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <MiniStat
                icon="Flame"
                value={stats?.streaks.activeStreaks ?? 0}
                label="সক্রিয় স্ট্রিক"
                color="var(--streak)"
              />
              <MiniStat
                icon="Trophy"
                value={stats?.streaks.bestOverall ?? 0}
                label="সেরা স্ট্রিক"
                color="var(--primary)"
              />
              <MiniStat
                icon="CalendarCheck"
                value={stats?.perfectDays ?? 0}
                label="নিখুঁত দিন"
                color="#7c3aed"
              />
            </div>
            <div className="mt-2">
              <DailyStreakBadge />
            </div>
            {stats?.gamification && (
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>লেভেল {toBn(stats.user.level)}</span>
                  <span>
                    {stats.gamification.xpInLevel != null && stats.gamification.xpForNextLevel != null
                      ? `${toBn(stats.gamification.xpInLevel)} / ${toBn(stats.gamification.xpForNextLevel)} XP`
                      : ""}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round((stats.gamification.progress ?? 0) * 100)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-primary to-teal-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Quick actions — the five things people open the app for */}
      <div className="mt-4">
        <QuickActions />
      </div>

      {/* আজকের পরিকল্পনা — morning plan / day run / evening review ritual */}
      <div className="mt-4">
        <TodayPlanCard />
      </div>

      {/* 7-day activity heatmap — instant week snapshot */}
      <div className="mt-4">
        <WeeklyHeatmap />
      </div>

      {/* Streak summary — compact gamification stats */}
      <div className="mt-3">
        <StreakSummaryCard />
      </div>

      {/* Today's habits — primary task, immediately after hero */}
      <div className="mt-6 space-y-6">
        {TIMES_OF_DAY.map((tod) => {
          const list = byTime[tod.key] ?? [];
          if (list.length === 0) return null;
          const doneCount = list.filter((h) => h.completedToday).length;
          return (
            <section key={tod.key}>
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <IconRenderer name={tod.icon} size={16} className="text-muted-foreground" />
                  <h2 className="font-bold">{tod.label}</h2>
                  <span className="text-xs text-muted-foreground">
                    {toBn(doneCount)}/{toBn(list.length)}
                  </span>
                </div>
                {doneCount === list.length && (
                  <motion.span
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"
                  >
                    সব সম্পন্ন!
                  </motion.span>
                )}
              </div>
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {list.map((h) => (
                    <HabitRow
                      key={h.id}
                      habit={h}
                      onToggle={() => toggle.mutate({ habitId: h.id })}
                      onOpen={() => openHabitDetail(h.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          );
        })}
      </div>

      {/* Quick action card */}
      <button
        onClick={openAddHabit}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed py-3 text-sm font-medium text-muted-foreground transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label="নতুন অভ্যাস যোগ করুন"
      >
        <Plus size={16} aria-hidden /> নতুন অভ্যাস যোগ করুন
      </button>

      {/* লক্ষ্য — target progress at a glance */}
      <div className="mt-4">
        <GoalsSummaryCard />
      </div>

      {/* Secondary panels — below the primary task */}
      <div className="mt-6 space-y-4">
        <WeeklyGoalCard />
        <WeeklyChallengeCard />
        <StreakPredictionCard />
        <HabitInsightsCard />
        <StreakFreezeIndicator />
        <DailyQuoteCard />
        <MoodSelector />
        <AICoachPanel />
        <CalendarPanel />
        <WeeklyRecapCard />
      </div>
    </div>
  );
}

function MiniStat({
  icon,
  value,
  label,
  color,
}: {
  icon: string;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-xl bg-card/80 px-2.5 py-1.5 shadow-sm">
      <span style={{ color }}>
        <IconRenderer name={icon} size={14} />
      </span>
      <span className="tabular text-sm font-bold">{toBn(value)}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
