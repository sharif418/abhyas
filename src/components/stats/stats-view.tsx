"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { ProgressRing } from "@/components/shared/progress-ring";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { gamificationState, levelTitle } from "@/lib/gamification";
import { toBn } from "@/lib/date-bn";
import { CATEGORY_MAP } from "@/constants";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  WeeklyInsights,
  type InsightsData,
} from "@/components/stats/weekly-insights";
import {
  MonthlyTrendChart,
  type MonthlyTrendPoint,
} from "@/components/stats/monthly-trend-chart";
import {
  MoodTrendChart,
  type MoodPoint,
} from "@/components/stats/mood-trend-chart";
import {
  MoodCorrelationCard,
  type MoodCorrelation,
} from "@/components/stats/mood-correlation-card";
import { YearlyHeatmap } from "@/components/stats/yearly-heatmap";
import { AnimatedNumber } from "@/components/shared/celebration";

interface StatsResponse {
  user: { name: string; xp: number; level: number; levelTitle: string; city: string };
  gamification: ReturnType<typeof gamificationState>;
  today: { done: number; total: number; pct: number };
  streaks: { bestOverall: number; activeStreaks: number };
  weekly: { done: number; scheduled: number; rate: number };
  perfectDays: number;
  dailySeries: { date: string; count: number }[];
  categories: { category: string; habits: number; doneToday: number }[];
  badges: {
    id: string;
    name: string;
    description: string;
    icon: string;
    tier: string;
    earned: boolean;
    earnedAt: string | null;
  }[];
  prayersDone: number;
  quranPages: number;
  quranSessions: number;
  habitsCount: number;
  insights: InsightsData;
  monthlyTrend: MonthlyTrendPoint[];
  mood: {
    series: MoodPoint[];
    average: number;
    today: { mood: number; note: string | null } | null;
  };
  moodCorrelations: MoodCorrelation[];
  yearlyHeatmap: { date: string; count: number }[];
  badgeStats: {
    totalCompletions: number;
    bestStreak: number;
    currentStreak: number;
    habitsTracked: number;
    perfectDays: number;
    fajrStreak: number;
    quranPages: number;
    fastingDays: number;
    level: number;
  };
}

type StatsTab = "overview" | "trends" | "mood" | "badges";

export function StatsView() {
  const [activeTab, setActiveTab] = useState<StatsTab>("overview");
  const { data: stats, isLoading, isError } = useQuery<StatsResponse>({
    queryKey: ["stats"],
    queryFn: () => api.get<StatsResponse>("/api/stats"),
  });

  // WAI-ARIA tabs pattern: arrow keys move between tabs, Home/End jump to first/last.
  // Roving tabindex: only the active tab has tabIndex=0, others have -1.
  const tabs: readonly { key: StatsTab; label: string }[] = [
    { key: "overview", label: "সারসংক্ষেপ" },
    { key: "trends", label: "ধারা" },
    { key: "mood", label: "মুড" },
    { key: "badges", label: "ব্যাজ" },
  ] as const;

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = tabs.findIndex((t) => t.key === activeTab);
    if (currentIndex === -1) return;

    let nextIndex: number | null = null;
    switch (e.key) {
      case "ArrowRight":
      case "Right":
        nextIndex = (currentIndex + 1) % tabs.length;
        break;
      case "ArrowLeft":
      case "Left":
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = tabs.length - 1;
        break;
      default:
        return; // don't preventDefault for unhandled keys
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const newTab = tabs[nextIndex];
      setActiveTab(newTab.key);
      // Move focus to the newly activated tab (WAI-ARIA recommended behavior)
      requestAnimationFrame(() => {
        document.getElementById(`stats-tab-${newTab.key}`)?.focus();
      });
    }
  };

  if (isError) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed bg-card/50 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <IconRenderer name="WifiOff" size={26} />
          </div>
          <div>
            <h3 className="font-semibold">পরিসংখ্যান লোড করতে সমস্যা</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              ডেটা লোড করা যায়নি। আবার চেষ্টা করুন।
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            আবার চেষ্টা করুন
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !stats) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-5">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-28 rounded-3xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-56 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl" />
      </div>
    );
  }

  const g = stats.gamification;
  const earnedBadges = stats.badges.filter((b) => b.earned);
  const lockedBadges = stats.badges.filter((b) => !b.earned);

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-5">
      <div>
        <h1 className="text-xl font-bold">পরিসংখ্যান</h1>
        <p className="text-xs text-muted-foreground">আপনার অগ্রগতির সম্পূর্ণ চিত্র</p>
      </div>

      {/* Level card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-card p-5"
      >
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-center gap-5">
          <ProgressRing value={g.progress} size={96} stroke={9} showGlow>
            <div className="text-center">
              <div className="tabular text-2xl font-extrabold">{toBn(g.level)}</div>
              <div className="text-[9px] text-muted-foreground">লেভেল</div>
            </div>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-muted-foreground">লেভেল {toBn(g.level)}</div>
            <div className="text-lg font-bold">{levelTitle(g.level)}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {toBn(g.xpInLevel)} / {toBn(g.xpForNextLevel)} XP
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${g.progress * 100}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickStat
          icon="Flame"
          value={stats.streaks.bestOverall}
          label="সেরা স্ট্রিক"
          color="var(--streak)"
        />
        <QuickStat
          icon="CalendarCheck"
          value={stats.perfectDays}
          label="নিখুঁত দিন"
          color="#7c3aed"
        />
        <QuickStat
          icon="Moon"
          value={stats.prayersDone}
          label="আজকের নামাজ"
          color="var(--islamic)"
          sub="/ ৫"
        />
        <QuickStat
          icon="BookOpen"
          value={stats.quranPages}
          label="কুরআন পৃষ্ঠা"
          color="var(--primary)"
        />
      </div>

      {/* Tab navigation — WAI-ARIA tabs with arrow-key navigation */}
      <div
        role="tablist"
        aria-label="পরিসংখ্যান বিভাগ"
        onKeyDown={handleTabKeyDown}
        className="flex gap-1 rounded-2xl bg-muted/50 p-1"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              id={`stats-tab-${tab.key}`}
              aria-selected={isActive}
              aria-controls={`stats-tabpanel-${tab.key}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 rounded-xl py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isActive
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview tab */}
      {activeTab === "overview" && (
        <div role="tabpanel" id="stats-tabpanel-overview" aria-labelledby="stats-tab-overview">
          <WeeklyInsights insights={stats.insights} />
          {stats.categories.length > 0 && (
            <Card>
              <CardHeader title="ক্যাটেগরি বিশ্লেষণ" subtitle="কোন ক্ষেত্রে বেশি মনোযোগ" />
              <div className="flex items-center gap-4">
                <div className="h-36 w-36 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.categories.map((c) => ({
                          name: c.category,
                          value: c.habits,
                          color: CATEGORY_MAP[c.category as keyof typeof CATEGORY_MAP]?.color ?? "#999",
                        }))}
                        dataKey="value"
                        innerRadius={36}
                        outerRadius={62}
                        paddingAngle={2}
                      >
                        {stats.categories.map((c, i) => (
                          <Cell
                            key={i}
                            fill={CATEGORY_MAP[c.category as keyof typeof CATEGORY_MAP]?.color ?? "#999"}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {stats.categories.slice(0, 6).map((c) => {
                    const meta = CATEGORY_MAP[c.category as keyof typeof CATEGORY_MAP];
                    const rate = c.habits > 0 ? c.doneToday / c.habits : 0;
                    return (
                      <div key={c.category} className="space-y-0.5">
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: meta?.color }}
                          />
                          <span className="flex-1 truncate">
                            {meta?.emoji} {c.category}
                          </span>
                          <span className="tabular font-medium text-muted-foreground">
                            {toBn(c.doneToday)}/{toBn(c.habits)}
                          </span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${rate * 100}%`,
                              background: meta?.color ?? "var(--primary)",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Trends tab */}
      {activeTab === "trends" && (
        <div role="tabpanel" id="stats-tabpanel-trends" aria-labelledby="stats-tab-trends" className="space-y-5">
          {/* Yearly heatmap */}
          {stats.yearlyHeatmap && stats.yearlyHeatmap.length > 0 && (
            <YearlyHeatmap data={stats.yearlyHeatmap} />
          )}

          {/* Weekly completion chart */}
      <Card>
        <CardHeader
          title="গত ৩০ দিনের কার্যকলাপ"
          subtitle={`সপ্তাহিক হার: ${toBn(Math.round(stats.weekly.rate * 100))}%`}
        />
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.dailySeries} margin={{ top: 8, right: 0, left: -24, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                tickFormatter={(v) => {
                  const d = new Date(v);
                  return toBn(d.getDate());
                }}
                interval={4}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickFormatter={(v) => toBn(v)}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--popover)",
                  color: "var(--popover-foreground)",
                  fontSize: 12,
                }}
                labelFormatter={(v) => {
                  const d = new Date(v);
                  return `${toBn(d.getDate())}/${toBn(d.getMonth() + 1)}`;
                }}
                formatter={(v: number) => [`${toBn(v)} টি`, "সম্পন্ন"]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={14}>
                {stats.dailySeries.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.count > 0 ? "var(--primary)" : "var(--muted)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Monthly trend (12 months) */}
      {stats.monthlyTrend && stats.monthlyTrend.length > 0 && (
        <MonthlyTrendChart data={stats.monthlyTrend} />
      )}
        </div>
      )}

      {/* Mood tab */}
      {activeTab === "mood" && (
        <div role="tabpanel" id="stats-tabpanel-mood" aria-labelledby="stats-tab-mood" className="space-y-5">
      {/* Mood trend chart */}
      {stats.mood && <MoodTrendChart data={stats.mood.series} />}

      {/* Mood-habit correlation */}
      {stats.moodCorrelations && (
        <MoodCorrelationCard correlations={stats.moodCorrelations} />
      )}
        </div>
      )}

      {/* Badges tab */}
      {activeTab === "badges" && (
        <div role="tabpanel" id="stats-tabpanel-badges" aria-labelledby="stats-tab-badges">
        <Card>
          <CardHeader
            title={`ব্যাজ (${toBn(earnedBadges.length)}/${toBn(stats.badges.length)})`}
            subtitle="অর্জনের মাইলফলক"
          />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {stats.badges.map((b) => {
              const progress = getBadgeProgress(b.id, stats.badgeStats);
              return (
                <BadgeTile
                  key={b.id}
                  icon={b.icon}
                  name={b.name}
                  description={b.description}
                  earned={b.earned}
                  tier={b.tier}
                  progress={b.earned ? 1 : progress}
                />
              );
            })}
          </div>
        </Card>
        </div>
      )}
    </div>
  );
}

function QuickStat({
  icon,
  value,
  label,
  color,
  sub,
}: {
  icon: string;
  value: number;
  label: string;
  color: string;
  sub?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-2xl border bg-card p-3 transition-shadow hover:shadow-md"
    >
      <div
        className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg"
        style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
      >
        <IconRenderer name={icon} size={16} />
      </div>
      <div className="flex items-baseline gap-0.5">
        <AnimatedNumber
          value={value}
          className="tabular text-xl font-extrabold leading-none"
        />
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>
    </motion.div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border bg-card p-4 shadow-sm"
    >
      {children}
    </motion.div>
  );
}

function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-bold">{title}</h2>
      {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

const TIER_STYLE: Record<string, { ring: string; glow: string }> = {
  bronze: { ring: "ring-amber-700/40", glow: "shadow-[0_0_12px_-4px_#b45309]" },
  silver: { ring: "ring-slate-400/40", glow: "shadow-[0_0_12px_-4px_#94a3b8]" },
  gold: { ring: "ring-yellow-500/50", glow: "shadow-[0_0_14px_-3px_#eab308]" },
  platinum: { ring: "ring-cyan-400/50", glow: "shadow-[0_0_16px_-3px_#22d3ee]" },
};

function BadgeTile({
  icon,
  name,
  description,
  earned,
  tier,
  progress,
}: {
  icon: string;
  name: string;
  description: string;
  earned: boolean;
  tier: string;
  progress?: number; // 0..1 for locked badges
}) {
  const style = TIER_STYLE[tier] ?? TIER_STYLE.bronze;
  const pct = Math.round((progress ?? 0) * 100);
  return (
    <motion.div
      whileHover={{ scale: earned ? 1.04 : 1 }}
      className={cn(
        "flex flex-col items-center gap-1 rounded-2xl border p-2.5 text-center transition",
        earned
          ? cn("bg-gradient-to-b from-card to-muted/30 ring-2", style.ring, style.glow)
          : "bg-muted/30"
      )}
      title={description}
    >
      <div className={cn(!earned && "opacity-40")}>
        <IconRenderer
          name={earned ? icon : "Lock"}
          size={24}
          className={cn(!earned && "grayscale")}
        />
      </div>
      <div className="line-clamp-1 text-[10px] font-semibold leading-tight">{name}</div>
      {!earned && progress !== undefined && progress > 0 && (
        <div className="w-full">
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/60"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-0.5 tabular text-[8px] text-muted-foreground">
            {toBn(pct)}%
          </div>
        </div>
      )}
    </motion.div>
  );
}

/** Compute progress (0..1) toward a badge based on badgeStats. */
function getBadgeProgress(
  badgeId: string,
  s: {
    totalCompletions: number;
    bestStreak: number;
    currentStreak: number;
    habitsTracked: number;
    perfectDays: number;
    fajrStreak: number;
    quranPages: number;
    fastingDays: number;
    level: number;
  }
): number {
  const map: Record<string, number> = {
    first_step: Math.min(1, s.totalCompletions / 1),
    streak_7: Math.min(1, s.bestStreak / 7),
    streak_30: Math.min(1, s.bestStreak / 30),
    streak_100: Math.min(1, s.bestStreak / 100),
    streak_365: Math.min(1, s.bestStreak / 365),
    early_riser: Math.min(1, s.fajrStreak / 14),
    quran_reader: Math.min(1, s.quranPages / 60),
    collector: Math.min(1, s.habitsTracked / 5),
    architect: Math.min(1, s.habitsTracked / 10),
    perfect_day: Math.min(1, s.perfectDays / 1),
    perfect_week: Math.min(1, s.perfectDays / 7),
    century: Math.min(1, s.totalCompletions / 100),
    champion: Math.min(1, s.totalCompletions / 500),
    level_5: Math.min(1, s.level / 5),
    level_10: Math.min(1, s.level / 10),
  };
  return map[badgeId] ?? 0;
}
