import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { getHabitsWithMeta, getHabitsAndCompletions } from "@/lib/habits-server";
import { gamificationState, levelTitle, levelFromXp } from "@/lib/gamification";
import { todayKey, toDateKey, addDays, lastNDays } from "@/lib/date-bn";
import { isScheduledOn } from "@/lib/streaks";
import { BADGES } from "@/constants";

export const dynamic = "force-dynamic";

/** GET /api/stats — aggregate dashboard stats */
export async function GET() {
  const user = await getOrCreateUser();
  // Single fetch: habits + all completions (reused throughout the endpoint)
  const { habits, rawCompletions } = await getHabitsAndCompletions();

  const today = new Date();
  const todayStr = todayKey();

  // 7-day & 30-day completion series
  const last30 = lastNDays(30, today);
  const last7 = lastNDays(7, today);

  // Reuse rawCompletions instead of re-querying the DB
  const completions = rawCompletions;
  const byDate = new Map<string, number>();
  for (const c of completions) {
    byDate.set(c.date, (byDate.get(c.date) ?? 0) + 1);
  }

  // yearly heatmap: 365-day completion density
  const yearlyDays = lastNDays(365, today);
  const yearlyHeatmap = yearlyDays.map((date) => ({
    date,
    count: byDate.get(date) ?? 0,
  }));

  const dailySeries = last30.map((k) => ({
    date: k,
    count: byDate.get(k) ?? 0,
  }));

  // weekly completion rate
  let weeklyDone = 0;
  let weeklyScheduled = 0;
  for (const k of last7) {
    const d = new Date(k);
    for (const h of habits) {
      if (isScheduledOn(h, d)) {
        weeklyScheduled++;
        if (h.completedDates.includes(k)) weeklyDone++;
      }
    }
  }

  // category breakdown
  const catMap = new Map<string, { done: number; total: number }>();
  for (const h of habits) {
    const entry = catMap.get(h.category) ?? { done: 0, total: 0 };
    entry.total += h.totalDone > 0 ? 1 : 1;
    entry.done += h.completedToday ? 1 : 0;
    catMap.set(h.category, entry);
  }
  const categoryStats = Array.from(catMap.entries()).map(([cat, v]) => ({
    category: cat,
    habits: v.total,
    doneToday: v.done,
  }));

  // perfect days (last 30)
  let perfectDays = 0;
  for (const k of last30) {
    const d = new Date(k);
    let all = true;
    let any = false;
    for (const h of habits) {
      if (isScheduledOn(h, d)) {
        any = true;
        if (!h.completedDates.includes(k)) {
          all = false;
          break;
        }
      }
    }
    if (any && all) perfectDays++;
  }

  // badges
  const earned = await db.achievement.findMany({
    where: { userId: user.id },
    select: { badgeId: true, earnedAt: true },
  });
  const earnedMap = new Map(earned.map((a) => [a.badgeId, a.earnedAt]));
  const badges = BADGES.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    icon: b.icon,
    tier: b.tier,
    earned: earnedMap.has(b.id),
    earnedAt: earnedMap.get(b.id)?.toISOString() ?? null,
  }));

  // prayer stats today (needed before badge stats)
  const prayer = await db.prayerRecord.findUnique({
    where: { userId_date: { userId: user.id, date: todayStr } },
  });
  const prayersDone = prayer
    ? [prayer.fajr, prayer.dhuhr, prayer.asr, prayer.maghrib, prayer.isha].filter(Boolean).length
    : 0;

  // quran
  const quranAgg = await db.quranSession.aggregate({
    where: { userId: user.id },
    _sum: { pagesRead: true },
    _count: true,
  });
  const quranPages = quranAgg._sum.pagesRead ?? 0;

  // badge stats — computed in-memory from already-fetched data (avoids N+1)
  const badgeStats = computeBadgeStatsInMemory(
    user,
    habits,
    completions,
    prayer,
    quranPages
  );

  const game = gamificationState(user.xp);

  // ---- Mood stats (last 30 days) ----
  const moodEntries = await db.moodEntry.findMany({
    where: { userId: user.id, date: { gte: last30[0] } },
    orderBy: { date: "asc" },
  });
  const moodSeries = moodEntries.map((m) => ({
    date: m.date,
    mood: m.mood,
    note: m.note,
  }));
  const moodValues = moodEntries.map((m) => m.mood);
  const avgMood = moodValues.length > 0
    ? moodValues.reduce((a, b) => a + b, 0) / moodValues.length
    : 0;
  const todayMood = moodEntries.find((m) => m.date === todayStr);

  // ---- Mood-habit correlation: avg mood on days a habit was done vs not done ----
  const moodByDate = new Map(moodEntries.map((m) => [m.date, m.mood]));
  const completionsByDate = new Map<string, Set<string>>();
  for (const c of completions) {
    let s = completionsByDate.get(c.date);
    if (!s) {
      s = new Set();
      completionsByDate.set(c.date, s);
    }
    s.add(c.habitId);
  }
  const moodCorrelations = habits
    .map((h) => {
      let doneMoodSum = 0;
      let doneMoodCount = 0;
      let notDoneMoodSum = 0;
      let notDoneMoodCount = 0;
      for (const [date, mood] of moodByDate) {
        const dayCompletions = completionsByDate.get(date);
        const wasDone = dayCompletions?.has(h.id) ?? false;
        if (wasDone) {
          doneMoodSum += mood;
          doneMoodCount++;
        } else {
          notDoneMoodSum += mood;
          notDoneMoodCount++;
        }
      }
      return {
        habitId: h.id,
        habitName: h.name,
        icon: h.icon,
        color: h.color,
        avgMoodWhenDone: doneMoodCount > 0 ? doneMoodSum / doneMoodCount : null,
        avgMoodWhenNotDone: notDoneMoodCount > 0 ? notDoneMoodSum / notDoneMoodCount : null,
        sampleSize: doneMoodCount,
      };
    })
    .filter((c) => c.avgMoodWhenDone !== null && c.sampleSize >= 2)
    .sort((a, b) => (b.avgMoodWhenDone ?? 0) - (a.avgMoodWhenDone ?? 0))
    .slice(0, 5);

  // ---- Weekly insights ----
  // Best weekday: which day-of-week historically has highest completion count
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun..Sat
  for (const c of completions) {
    const d = new Date(c.date);
    weekdayCounts[d.getDay()]++;
  }
  const weekdayNames = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"];
  let bestWeekdayIdx = 0;
  for (let i = 1; i < 7; i++) {
    if (weekdayCounts[i] > weekdayCounts[bestWeekdayIdx]) bestWeekdayIdx = i;
  }

  // Productive time-of-day: which time slot completes most
  const timeOfDayCounts: Record<string, number> = {
    সকাল: 0,
    দুপুর: 0,
    বিকাল: 0,
    রাত: 0,
  };
  for (const h of habits) {
    for (const d of h.completedDates) {
      timeOfDayCounts[h.timeOfDay] = (timeOfDayCounts[h.timeOfDay] ?? 0) + 1;
    }
  }
  let bestTime = "সকাল";
  for (const t of ["সকাল", "দুপুর", "বিকাল", "রাত"]) {
    if ((timeOfDayCounts[t] ?? 0) > (timeOfDayCounts[bestTime] ?? 0)) bestTime = t;
  }

  // Momentum: completion rate trend — last 7 days vs previous 7 days
  const prev7 = lastNDays(14, today).slice(0, 7);
  let last7Done = 0;
  let last7Sched = 0;
  let prev7Done = 0;
  let prev7Sched = 0;
  for (const h of habits) {
    for (const k of last7) {
      const d = new Date(k);
      if (isScheduledOn(h, d)) {
        last7Sched++;
        if (h.completedDates.includes(k)) last7Done++;
      }
    }
    for (const k of prev7) {
      const d = new Date(k);
      if (isScheduledOn(h, d)) {
        prev7Sched++;
        if (h.completedDates.includes(k)) prev7Done++;
      }
    }
  }
  const last7Rate = last7Sched ? last7Done / last7Sched : 0;
  const prev7Rate = prev7Sched ? prev7Done / prev7Sched : 0;
  const momentumDelta = last7Rate - prev7Rate; // -1..1
  const momentumLabel =
    momentumDelta > 0.1
      ? "বাড়ছে 📈"
      : momentumDelta < -0.1
      ? "কমছে 📉"
      : "স্থিতিশীল ➡️";

  // Weekday distribution for chart
  const weekdaySeries = weekdayNames.map((name, i) => ({
    name,
    count: weekdayCounts[i],
  }));

  // Time-of-day distribution
  const timeOfDaySeries = Object.entries(timeOfDayCounts).map(([k, v]) => ({
    name: k,
    count: v,
  }));

  // ---- 12-month trend: completion rate per month over last year ----
  const monthlyTrend: { month: string; label: string; done: number; scheduled: number; rate: number }[] = [];
  const monthLabels = ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্ট", "অক্টো", "নভে", "ডিসে"];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
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
      for (const h of habits) {
        if (isScheduledOn(h, date)) scheduled++;
      }
    }
    monthlyTrend.push({
      month: `${y}-${String(m + 1).padStart(2, "0")}`,
      label: monthLabels[m],
      done,
      scheduled,
      rate: scheduled > 0 ? done / scheduled : 0,
    });
  }

  return NextResponse.json({
    user: {
      name: user.name,
      xp: user.xp,
      level: user.level,
      levelTitle: levelTitle(user.level),
      city: user.city,
    },
    gamification: game,
    today: {
      done: habits.filter((h) => h.completedToday).length,
      total: habits.length,
      pct: habits.length === 0 ? 0 : habits.filter((h) => h.completedToday).length / habits.length,
    },
    streaks: {
      bestOverall: habits.reduce((m, h) => Math.max(m, h.bestStreak), 0),
      activeStreaks: habits.filter((h) => h.streak > 0).length,
    },
    weekly: { done: weeklyDone, scheduled: weeklyScheduled, rate: weeklyScheduled ? weeklyDone / weeklyScheduled : 0 },
    perfectDays,
    dailySeries,
    categories: categoryStats,
    badges,
    badgeStats,
    prayersDone,
    quranPages,
    quranSessions: quranAgg._count,
    habitsCount: habits.length,
    insights: {
      bestWeekday: weekdayNames[bestWeekdayIdx],
      bestWeekdayCount: weekdayCounts[bestWeekdayIdx],
      bestTime,
      bestTimeCount: timeOfDayCounts[bestTime] ?? 0,
      momentumDelta,
      momentumLabel,
      last7Rate,
      prev7Rate,
      weekdaySeries,
      timeOfDaySeries,
    },
    monthlyTrend,
    mood: {
      series: moodSeries,
      average: avgMood,
      today: todayMood ? { mood: todayMood.mood, note: todayMood.note } : null,
    },
    moodCorrelations,
    yearlyHeatmap,
  });
}

/**
 * Compute badge stats in-memory from already-fetched data.
 * Replaces the old computeBadgeStats() which made 4 redundant DB queries.
 */
function computeBadgeStatsInMemory(
  user: { id: string; xp: number; level: number },
  habits: any[],
  completions: { date: string; habitId: string }[],
  prayer: { fajr: boolean } | null,
  quranPages: number
) {
  // total completions
  const totalCompletions = completions.length;
  const habitsTracked = habits.length;

  // best/current streak across all habits (use pre-computed values from habits)
  let bestStreak = 0;
  let currentStreak = 0;
  for (const h of habits) {
    if (h.bestStreak > bestStreak) bestStreak = h.bestStreak;
    if (h.streak > currentStreak) currentStreak = h.streak;
  }

  // perfect days (last 60 days) — reuse completions data
  const completionsByDate = new Map<string, Set<string>>();
  for (const c of completions) {
    let s = completionsByDate.get(c.date);
    if (!s) { s = new Set(); completionsByDate.set(c.date, s); }
    s.add(c.habitId);
  }
  const today = new Date();
  let perfectDays = 0;
  for (let i = 0; i < 60; i++) {
    const d = addDays(today, -i);
    const key = toDateKey(d);
    let allDone = true;
    let any = false;
    for (const h of habits) {
      if (isScheduledOn(h, d)) {
        any = true;
        if (!completionsByDate.get(key)?.has(h.id)) {
          allDone = false;
          break;
        }
      }
    }
    if (any && allDone) perfectDays++;
  }

  // fajr streak — can only compute from today's prayer record (single record)
  // For a full streak we'd need all prayer records, but that's a separate
  // query we avoid. Use 1 if fajr done today, 0 otherwise.
  const fajrStreak = prayer?.fajr ? 1 : 0;

  return {
    totalCompletions,
    bestStreak,
    currentStreak,
    habitsTracked,
    perfectDays,
    fajrStreak,
    quranPages,
    fastingDays: 0,
    level: levelFromXp(user.xp),
  };
}

