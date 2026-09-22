import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { getHabitsAndCompletions } from "@/lib/habits-server";
import { gamificationState, levelTitle, levelFromXp } from "@/lib/gamification";
import { todayKey, lastNDays } from "@/lib/date-bn";
import { isScheduledOn } from "@/lib/streaks";
import { BADGES } from "@/constants";
import type { GamificationState, HabitWithMeta } from "@/types";

/* ---- Payload contract for GET /api/stats ----
 * Must stay in sync with StatsResponse in components/stats/stats-shared. */

export interface InsightsPayload {
  bestWeekday: string;
  bestWeekdayCount: number;
  bestTime: string;
  bestTimeCount: number;
  momentumDelta: number;
  momentumLabel: string;
  last7Rate: number;
  prev7Rate: number;
  weekdaySeries: { name: string; count: number }[];
  timeOfDaySeries: { name: string; count: number }[];
}

export interface MonthlyTrendPoint {
  month: string;
  label: string;
  done: number;
  scheduled: number;
  rate: number;
}

export interface MoodCorrelation {
  habitId: string;
  habitName: string;
  icon: string;
  color: string;
  avgMoodWhenDone: number | null;
  avgMoodWhenNotDone: number | null;
  sampleSize: number;
}

export interface BadgeStatsPayload {
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

export interface StatsDashboard {
  user: { name: string; xp: number; level: number; levelTitle: string; city: string };
  gamification: GamificationState;
  today: { done: number; total: number; pct: number };
  streaks: { bestOverall: number; activeStreaks: number };
  weekly: { done: number; scheduled: number; rate: number };
  perfectDays: number;
  dailySeries: { date: string; count: number }[];
  categories: { category: string; habits: number; doneToday: number }[];
  badges: {
    id: string; name: string; description: string; icon: string;
    tier: string; earned: boolean; earnedAt: string | null;
  }[];
  badgeStats: BadgeStatsPayload;
  prayersDone: number;
  quranPages: number;
  quranSessions: number;
  habitsCount: number;
  insights: InsightsPayload;
  monthlyTrend: MonthlyTrendPoint[];
  mood: {
    series: { date: string; mood: number; note: string | null }[];
    average: number;
    today: { mood: number; note: string | null } | null;
  };
  moodCorrelations: MoodCorrelation[];
  yearlyHeatmap: { date: string; count: number }[];
}

const WEEKDAY_NAMES = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"];
const MONTH_LABELS = ["জানু","ফেব্রু","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্ট","অক্টো","নভে","ডিসে"];
const TIME_SLOTS = ["সকাল", "দুপুর", "বিকাল", "রাত"] as const;

interface CompletionRow {
  habitId: string;
  date: string;
}

/* ---- Pure aggregation helpers (rows in → numbers out) ---- */

/** Completions per date key (includes inactive-habit completions). */
function countByDate(completions: CompletionRow[]): Map<string, number> {
  const byDate = new Map<string, number>();
  for (const c of completions) byDate.set(c.date, (byDate.get(c.date) ?? 0) + 1);
  return byDate;
}

/** Habit ids completed per date key. */
function groupCompletionsByDate(completions: CompletionRow[]): Map<string, Set<string>> {
  const byDate = new Map<string, Set<string>>();
  for (const c of completions) {
    let set = byDate.get(c.date);
    if (!set) { set = new Set<string>(); byDate.set(c.date, set); }
    set.add(c.habitId);
  }
  return byDate;
}

/** Zero-filled completion series for the last `days` days ending at `today`. */
function seriesForDays(byDate: Map<string, number>, days: number, today: Date) {
  return lastNDays(days, today).map((date) => ({ date, count: byDate.get(date) ?? 0 }));
}

/** done/scheduled counts over the given date keys (schedule-aware). */
function completionOverDays(habits: HabitWithMeta[], keys: string[]) {
  let done = 0;
  let scheduled = 0;
  for (const k of keys) {
    const d = new Date(k);
    for (const h of habits) {
      if (isScheduledOn(h, d)) {
        scheduled++;
        if (h.completedDates.includes(k)) done++;
      }
    }
  }
  return { done, scheduled, rate: scheduled > 0 ? done / scheduled : 0 };
}

/** Days in the window where every scheduled habit was completed. */
function countPerfectDays(habits: HabitWithMeta[], keys: string[]): number {
  let perfectDays = 0;
  for (const k of keys) {
    const d = new Date(k);
    let all = true;
    let any = false;
    for (const h of habits) {
      if (isScheduledOn(h, d)) {
        any = true;
        if (!h.completedDates.includes(k)) { all = false; break; }
      }
    }
    if (any && all) perfectDays++;
  }
  return perfectDays;
}

/** Habit count + today's completions per category. */
function categoryBreakdown(habits: HabitWithMeta[]) {
  const catMap = new Map<string, { done: number; total: number }>();
  for (const h of habits) {
    const entry = catMap.get(h.category) ?? { done: 0, total: 0 };
    entry.total += 1;
    entry.done += h.completedToday ? 1 : 0;
    catMap.set(h.category, entry);
  }
  return Array.from(catMap.entries()).map(([category, v]) => ({
    category, habits: v.total, doneToday: v.done,
  }));
}

/** Avg mood on days a habit was done vs not done — top 5 by impact. */
function computeMoodCorrelations(
  habits: HabitWithMeta[],
  moodEntries: { date: string; mood: number }[],
  completions: CompletionRow[]
): MoodCorrelation[] {
  const moodByDate = new Map(moodEntries.map((m) => [m.date, m.mood]));
  const completionsByDate = groupCompletionsByDate(completions);
  return habits
    .map((h) => {
      let doneSum = 0, doneCount = 0, notDoneSum = 0, notDoneCount = 0;
      for (const [date, mood] of moodByDate) {
        if (completionsByDate.get(date)?.has(h.id)) { doneSum += mood; doneCount++; }
        else { notDoneSum += mood; notDoneCount++; }
      }
      return {
        habitId: h.id, habitName: h.name, icon: h.icon, color: h.color,
        avgMoodWhenDone: doneCount > 0 ? doneSum / doneCount : null,
        avgMoodWhenNotDone: notDoneCount > 0 ? notDoneSum / notDoneCount : null,
        sampleSize: doneCount,
      };
    })
    .filter((c) => c.avgMoodWhenDone !== null && c.sampleSize >= 2)
    .sort((a, b) => (b.avgMoodWhenDone ?? 0) - (a.avgMoodWhenDone ?? 0))
    .slice(0, 5);
}

/** Best weekday / best time-of-day / momentum (last 7 vs previous 7 days). */
function computeInsights(
  habits: HabitWithMeta[],
  completions: CompletionRow[],
  today: Date
): InsightsPayload {
  // best weekday: highest historical completion count per day-of-week
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun..Sat
  for (const c of completions) weekdayCounts[new Date(c.date).getDay()]++;
  let bestWeekdayIdx = 0;
  for (let i = 1; i < 7; i++) {
    if (weekdayCounts[i] > weekdayCounts[bestWeekdayIdx]) bestWeekdayIdx = i;
  }

  // productive time-of-day: which slot completes most
  const timeOfDayCounts: Record<string, number> = { সকাল: 0, দুপুর: 0, বিকাল: 0, রাত: 0 };
  for (const h of habits) {
    timeOfDayCounts[h.timeOfDay] = (timeOfDayCounts[h.timeOfDay] ?? 0) + h.completedDates.length;
  }
  let bestTime = "সকাল";
  for (const t of TIME_SLOTS) {
    if ((timeOfDayCounts[t] ?? 0) > (timeOfDayCounts[bestTime] ?? 0)) bestTime = t;
  }

  // momentum: completion rate trend — last 7 days vs previous 7 days
  const last7Rate = completionOverDays(habits, lastNDays(7, today)).rate;
  const prev7Rate = completionOverDays(habits, lastNDays(14, today).slice(0, 7)).rate;
  const momentumDelta = last7Rate - prev7Rate; // -1..1
  const momentumLabel =
    momentumDelta > 0.1 ? "বাড়ছে 📈"
    : momentumDelta < -0.1 ? "কমছে 📉"
    : "স্থিতিশীল ➡️";

  return {
    bestWeekday: WEEKDAY_NAMES[bestWeekdayIdx],
    bestWeekdayCount: weekdayCounts[bestWeekdayIdx],
    bestTime,
    bestTimeCount: timeOfDayCounts[bestTime] ?? 0,
    momentumDelta,
    momentumLabel,
    last7Rate,
    prev7Rate,
    weekdaySeries: WEEKDAY_NAMES.map((name, i) => ({ name, count: weekdayCounts[i] })),
    timeOfDaySeries: Object.entries(timeOfDayCounts).map(([name, count]) => ({ name, count })),
  };
}

/** Completion rate per month over the last 12 months. */
function computeMonthlyTrend(
  habits: HabitWithMeta[],
  completions: CompletionRow[],
  today: Date
): MonthlyTrendPoint[] {
  const monthlyTrend: MonthlyTrendPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const monthStart = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const nextMonth = new Date(y, m + 1, 1);
    const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;
    const done = completions.filter((c) => c.date >= monthStart && c.date < monthEnd).length;
    // scheduled: sum of active habits' scheduled days in that month
    let scheduled = 0;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(y, m, day);
      for (const h of habits) if (isScheduledOn(h, date)) scheduled++;
    }
    monthlyTrend.push({
      month: `${y}-${String(m + 1).padStart(2, "0")}`,
      label: MONTH_LABELS[m],
      done,
      scheduled,
      rate: scheduled > 0 ? done / scheduled : 0,
    });
  }
  return monthlyTrend;
}

/** Badge stats computed in-memory from already-fetched data (avoids N+1). */
function computeBadgeStats(
  user: { xp: number },
  habits: HabitWithMeta[],
  completions: CompletionRow[],
  prayer: { fajr: boolean } | null,
  quranPages: number,
  today: Date
): BadgeStatsPayload {
  let bestStreak = 0;
  let currentStreak = 0;
  for (const h of habits) {
    if (h.bestStreak > bestStreak) bestStreak = h.bestStreak;
    if (h.streak > currentStreak) currentStreak = h.streak;
  }
  // fajr streak — from today's record only (full streak needs a separate query)
  return {
    totalCompletions: completions.length,
    bestStreak,
    currentStreak,
    habitsTracked: habits.length,
    perfectDays: countPerfectDays(habits, lastNDays(60, today)),
    fajrStreak: prayer?.fajr ? 1 : 0,
    quranPages,
    fastingDays: 0,
    level: levelFromXp(user.xp),
  };
}

/* ---- Orchestrator: one DB pass + the minimal extra reads ---- */

/** Aggregate every dashboard stat for the current user. All DB access
 *  happens up front; rows then flow through the pure helpers above. */
export async function getDashboardStats(): Promise<StatsDashboard> {
  const user = await getOrCreateUser();
  // single fetch: habits + all completions (reused throughout)
  const { habits, rawCompletions } = await getHabitsAndCompletions();

  const today = new Date();
  const todayStr = todayKey();
  const last30 = lastNDays(30, today);
  const last7 = lastNDays(7, today);

  const byDate = countByDate(rawCompletions);
  const yearlyHeatmap = seriesForDays(byDate, 365, today);
  const dailySeries = seriesForDays(byDate, 30, today);

  const weekly = completionOverDays(habits, last7);
  const perfectDays = countPerfectDays(habits, last30);
  const categories = categoryBreakdown(habits);

  // badges — persisted achievements joined against the badge catalog
  const earned = await db.achievement.findMany({
    where: { userId: user.id },
    select: { badgeId: true, earnedAt: true },
  });
  const earnedMap = new Map(earned.map((a) => [a.badgeId, a.earnedAt]));
  const badges = BADGES.map((b) => ({
    id: b.id, name: b.name, description: b.description, icon: b.icon, tier: b.tier,
    earned: earnedMap.has(b.id),
    earnedAt: earnedMap.get(b.id)?.toISOString() ?? null,
  }));

  // prayer stats today
  const prayer = await db.prayerRecord.findUnique({
    where: { userId_date: { userId: user.id, date: todayStr } },
  });
  const prayersDone = prayer
    ? [prayer.fajr, prayer.dhuhr, prayer.asr, prayer.maghrib, prayer.isha].filter(Boolean).length
    : 0;

  // quran lifetime totals
  const quranAgg = await db.quranSession.aggregate({
    where: { userId: user.id },
    _sum: { pagesRead: true },
    _count: true,
  });
  const quranPages = quranAgg._sum.pagesRead ?? 0;

  const badgeStats = computeBadgeStats(
    { xp: user.xp }, habits, rawCompletions, prayer, quranPages, today
  );
  const game = gamificationState(user.xp);

  // mood stats (last 30 days)
  const moodEntries = await db.moodEntry.findMany({
    where: { userId: user.id, date: { gte: last30[0] } },
    orderBy: { date: "asc" },
  });
  const moodValues = moodEntries.map((m) => m.mood);
  const avgMood = moodValues.length > 0 ? moodValues.reduce((a, b) => a + b, 0) / moodValues.length : 0;
  const todayMood = moodEntries.find((m) => m.date === todayStr);
  const todayDone = habits.filter((h) => h.completedToday).length;

  return {
    user: {
      name: user.name, xp: user.xp, level: user.level,
      levelTitle: levelTitle(user.level), city: user.city,
    },
    gamification: game,
    today: { done: todayDone, total: habits.length, pct: habits.length === 0 ? 0 : todayDone / habits.length },
    streaks: {
      bestOverall: habits.reduce((m, h) => Math.max(m, h.bestStreak), 0),
      activeStreaks: habits.filter((h) => h.streak > 0).length,
    },
    weekly: { done: weekly.done, scheduled: weekly.scheduled, rate: weekly.rate },
    perfectDays,
    dailySeries,
    categories,
    badges,
    badgeStats,
    prayersDone,
    quranPages,
    quranSessions: quranAgg._count,
    habitsCount: habits.length,
    insights: computeInsights(habits, rawCompletions, today),
    monthlyTrend: computeMonthlyTrend(habits, rawCompletions, today),
    mood: {
      series: moodEntries.map((m) => ({ date: m.date, mood: m.mood, note: m.note })),
      average: avgMood,
      today: todayMood ? { mood: todayMood.mood, note: todayMood.note } : null,
    },
    moodCorrelations: computeMoodCorrelations(habits, moodEntries, rawCompletions),
    yearlyHeatmap,
  };
}
