"use client";

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
}

export function StatsView() {
  const { data: stats, isLoading } = useQuery<StatsResponse>({
    queryKey: ["stats"],
    queryFn: () => api.get<StatsResponse>("/api/stats"),
  });

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

      {/* Weekly insights (new) */}
      <WeeklyInsights insights={stats.insights} />

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

      {/* Category breakdown */}
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
            <div className="flex-1 space-y-1.5">
              {stats.categories.slice(0, 6).map((c) => {
                const meta = CATEGORY_MAP[c.category as keyof typeof CATEGORY_MAP];
                return (
                  <div key={c.category} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: meta?.color }}
                    />
                    <span className="flex-1 truncate">
                      {meta?.emoji} {c.category}
                    </span>
                    <span className="tabular font-medium text-muted-foreground">
                      {toBn(c.habits)} টি
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Badges */}
      <Card>
        <CardHeader
          title={`ব্যাজ (${toBn(earnedBadges.length)}/${toBn(stats.badges.length)})`}
          subtitle="অর্জনের মাইলফলক"
        />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {stats.badges.map((b) => (
            <BadgeTile
              key={b.id}
              icon={b.icon}
              name={b.name}
              description={b.description}
              earned={b.earned}
              tier={b.tier}
            />
          ))}
        </div>
      </Card>
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
}: {
  icon: string;
  name: string;
  description: string;
  earned: boolean;
  tier: string;
}) {
  const style = TIER_STYLE[tier] ?? TIER_STYLE.bronze;
  return (
    <motion.div
      whileHover={{ scale: earned ? 1.04 : 1 }}
      className={cn(
        "flex flex-col items-center gap-1 rounded-2xl border p-2.5 text-center transition",
        earned
          ? cn("bg-gradient-to-b from-card to-muted/30 ring-2", style.ring, style.glow)
          : "bg-muted/30 opacity-60"
      )}
      title={description}
    >
      <div className={cn("text-2xl", !earned && "grayscale")}>{earned ? icon : "🔒"}</div>
      <div className="line-clamp-1 text-[10px] font-semibold leading-tight">{name}</div>
    </motion.div>
  );
}
